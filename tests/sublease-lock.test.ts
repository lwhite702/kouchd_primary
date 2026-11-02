import { convexTest } from "convex-test";
import { afterEach, describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import {
  evaluateSubleaseLockFromSnapshot,
  GUEST_SUBLEASE_LOCK_MESSAGE,
  HOST_SUBLEASE_LOCK_MESSAGE,
  SUBLEASE_BILLING_RETRY_GRACE_MS,
} from "../convex/lib/subleaseLock";
import { assertSubleaseInput } from "../convex/lib/validation";
import { FEATURE_FLAGS } from "../lib/flags/config";
import { grantPlus } from "./helpers/plans";

describe("evaluateSubleaseLockFromSnapshot", () => {
  const nowMs = Date.UTC(2026, 10, 2, 12, 0, 0);

  it("never locks a home_stay or stay without an arrangement", () => {
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "home_stay",
        environmentConfigured: true,
        snapshot: null,
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: null,
    });

    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: undefined,
        environmentConfigured: true,
        snapshot: {
          status: "expired",
          entitlement: "plus",
          currentPeriodEndsAt: nowMs - 1_000,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: null,
    });
  });

  it("never locks a sublease when the subscription environment is unconfigured or snapshot status is unknown", () => {
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: false,
        snapshot: null,
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: false,
      operationalAlert: true,
      reason: null,
    });

    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "unknown",
          entitlement: "plus",
          currentPeriodEndsAt: nowMs - 60_000,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: false,
      operationalAlert: true,
      reason: null,
    });
  });

  it("keeps a sublease unlocked on active, grace_period, or canceled before currentPeriodEndsAt", () => {
    for (const status of ["active", "grace_period", "canceled"] as const) {
      expect(
        evaluateSubleaseLockFromSnapshot({
          arrangement: "sublease",
          environmentConfigured: true,
          snapshot: {
            status,
            entitlement: "plus",
            currentPeriodEndsAt: nowMs + 86_400_000,
            updatedAt: nowMs,
          },
          nowMs,
        }),
      ).toEqual({
        locked: false,
        billingRetryWarning: false,
        operationalAlert: false,
        reason: null,
      });
    }
  });

  it("locks a sublease when active, canceled, or grace_period has passed currentPeriodEndsAt", () => {
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "canceled",
          entitlement: "plus",
          currentPeriodEndsAt: nowMs,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "period_ended",
    });

    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "grace_period",
          entitlement: "plus",
          currentPeriodEndsAt: nowMs - 1,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "grace_ended",
    });
  });

  it("locks immediately on expired, refunded, or missing subscription snapshot", () => {
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: null,
        nowMs,
      }),
    ).toEqual({
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "no_subscription",
    });

    for (const status of ["expired", "refunded"] as const) {
      expect(
        evaluateSubleaseLockFromSnapshot({
          arrangement: "sublease",
          environmentConfigured: true,
          snapshot: {
            status,
            entitlement: "plus",
            currentPeriodEndsAt: nowMs + 86_400_000,
            updatedAt: nowMs,
          },
          nowMs,
        }),
      ).toEqual({
        locked: true,
        billingRetryWarning: false,
        operationalAlert: false,
        reason: status,
      });
    }
  });

  it("warns the host during the 7-day billing_retry window and locks only after 7 days", () => {
    const retryStart = nowMs - 6 * 24 * 60 * 60 * 1000;
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "billing_retry",
          entitlement: "plus",
          billingRetryStartedAt: retryStart,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: true,
      operationalAlert: false,
      reason: null,
    });

    // Exactly at 7 days: still unlocked with warning
    const exactBoundary = nowMs - SUBLEASE_BILLING_RETRY_GRACE_MS;
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "billing_retry",
          entitlement: "plus",
          billingRetryStartedAt: exactBoundary,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: true,
      operationalAlert: false,
      reason: null,
    });

    // Past 7 days (e.g., 8 days): locked
    const eightDaysAgo = nowMs - 8 * 24 * 60 * 60 * 1000;
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "billing_retry",
          entitlement: "plus",
          billingRetryStartedAt: eightDaysAgo,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "billing_retry_exceeded",
    });
  });
});

describe("assertSubleaseInput", () => {
  it("validates whole_place and private_room sublease inputs", () => {
    expect(() =>
      assertSubleaseInput({
        arrangement: "home_stay",
      }),
    ).not.toThrow();

    expect(() =>
      assertSubleaseInput({
        arrangement: "home_stay",
        subleaseLayout: "whole_place",
      }),
    ).toThrow(/only used on sublease stays/);

    expect(() =>
      assertSubleaseInput({
        arrangement: "sublease",
        subleaseLayout: "whole_place",
      }),
    ).not.toThrow();

    expect(() =>
      assertSubleaseInput({
        arrangement: "sublease",
        subleaseLayout: "whole_place",
        roommateCount: 1,
      }),
    ).toThrow(/do not include roommates/);

    expect(() =>
      assertSubleaseInput({
        arrangement: "sublease",
        subleaseLayout: "private_room",
        roommateCount: 2,
        roommateNames: ["Alex", "Jordan"],
      }),
    ).not.toThrow();

    expect(() =>
      assertSubleaseInput({
        arrangement: "sublease",
        subleaseLayout: "private_room",
      }),
    ).toThrow(/Roommate count must be a whole number/);
  });
});

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const sampleWeeklyTerms = {
  startDate: "2026-11-01",
  endDate: "2026-12-31",
  cadence: "weekly" as const,
  paymentDayOfWeek: 1,
  rateCents: 35_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Quiet hours.",
};

const sampleSubleaseTerms = {
  startDate: "2026-11-01",
  endDate: "2027-04-30",
  cadence: "monthly" as const,
  paymentDayOfMonth: 1,
  rateCents: 150_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: true,
  lateFeeCents: 5_000,
  graceDays: 5,
  houseNotes: "No smoking.",
};

afterEach(() => {
  delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
});

async function setSubleasesFlag(
  t: ReturnType<typeof convexTest>,
  override: "enabled" | "disabled",
) {
  await t.run(async ({ db }) => {
    const flags = await db.query("featureFlags").collect();
    const existing = flags.find((f) => f.key === FEATURE_FLAGS.SUBLEASES);
    if (existing) {
      await db.patch(existing._id, { override, updatedAt: Date.now() });
    } else {
      await db.insert("featureFlags", {
        key: FEATURE_FLAGS.SUBLEASES,
        override,
        updatedAt: Date.now(),
      });
    }
  });
}

describe("Sublease creation, landlord consent, and lock enforcement", () => {
  it("requires feature flag and Plus subscription to create a sublease", async () => {
    const t = convexTest(schema, modules);
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";

    const host = t.withIdentity({
      subject: "sublease-host-1",
      name: "Sam Host",
      email: "sam@example.com",
    });
    await host.mutation(api.users.syncCurrent, {});

    // 1. Without feature flag enabled: rejects
    await expect(
      host.mutation(api.stays.create, {
        timezone: "America/New_York",
        name: "Maple Sublet",
        terms: sampleSubleaseTerms,
        arrangement: "sublease",
        subleaseLayout: "whole_place",
      }),
    ).rejects.toThrow(/Subleases are currently disabled by platform policy/);

    // 2. With flag enabled but no Plus: rejects with plan limit
    await setSubleasesFlag(t, "enabled");
    await expect(
      host.mutation(api.stays.create, {
        timezone: "America/New_York",
        name: "Maple Sublet",
        terms: sampleSubleaseTerms,
        arrangement: "sublease",
        subleaseLayout: "whole_place",
      }),
    ).rejects.toThrow(/Subleases are included with Plus/);

    // 3. Grant Plus to host's household account (create a regular stay first to get the household account or mock snapshot)
    const setupStayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Starter Home",
      terms: sampleWeeklyTerms,
    });
    await grantPlus(t, setupStayId);

    // Now sublease creation succeeds
    const subleaseId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Maple Sublet",
      terms: sampleSubleaseTerms,
      arrangement: "sublease",
      subleaseLayout: "whole_place",
      subleaseBillPreset: "whole_place",
    });

    const stayDoc = await t.run(async ({ db }) => db.get(subleaseId));
    expect(stayDoc?.arrangement).toBe("sublease");
    expect(stayDoc?.subleaseLayout).toBe("whole_place");
    expect(stayDoc?.subleaseBillPreset).toBe("whole_place");
  });

  it("requires landlord consent before creating invites or referral joins", async () => {
    const t = convexTest(schema, modules);
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await setSubleasesFlag(t, "enabled");

    const host = t.withIdentity({
      subject: "sublease-host-consent",
      name: "Chris Host",
      email: "chris@example.com",
    });
    await host.mutation(api.users.syncCurrent, {});

    const setupStayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Host Base",
      terms: sampleWeeklyTerms,
    });
    await grantPlus(t, setupStayId);

    const subleaseId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "River Sublet",
      terms: sampleSubleaseTerms,
      arrangement: "sublease",
      subleaseLayout: "whole_place",
    });

    const hashConsent = "a".repeat(64);
    // Attempt invite before recording consent
    await expect(
      host.mutation(api.invites.create, {
        stayId: subleaseId,
        tokenHash: hashConsent,
        expiresAt: Date.now() + 86_400_000,
      }),
    ).rejects.toThrow(/Answer the landlord consent question before sending a sublease invite/);

    // Record landlord consent
    await host.mutation(api.stays.recordLandlordConsent, {
      stayId: subleaseId,
      answer: "written_permission",
    });

    // Now invite creation succeeds
    const inviteId = await host.mutation(api.invites.create, {
      stayId: subleaseId,
      tokenHash: hashConsent,
      expiresAt: Date.now() + 86_400_000,
    });
    expect(inviteId).toBeTruthy();

    // Invite preview includes sublease metadata
    const preview = (await host.query(api.invites.preview, {
      tokenHash: hashConsent,
    })) as Record<string, unknown>;
    expect(preview.arrangement).toBe("sublease");
    expect(preview.subleaseLayout).toBe("whole_place");
  });

  it("locks sublease mutations when subscription expires and allows host stay ending", async () => {
    const t = convexTest(schema, modules);
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await setSubleasesFlag(t, "enabled");

    const host = t.withIdentity({
      subject: "sublease-host-lock",
      name: "Jordan Host",
      email: "jordan@example.com",
    });
    const guest = t.withIdentity({
      subject: "sublease-guest-lock",
      name: "Taylor Guest",
      email: "taylor@example.com",
    });

    await host.mutation(api.users.syncCurrent, {});
    const guestUserId = await guest.mutation(api.users.syncCurrent, {});

    const setupStayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Setup Stay",
      terms: sampleWeeklyTerms,
    });
    await grantPlus(t, setupStayId);

    const subleaseId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Downtown Studio Sublet",
      terms: sampleSubleaseTerms,
      arrangement: "sublease",
      subleaseLayout: "whole_place",
    });

    await host.mutation(api.stays.recordLandlordConsent, {
      stayId: subleaseId,
      answer: "written_permission",
    });

    const tokenHash = "c".repeat(64);
    await host.mutation(api.invites.create, {
      stayId: subleaseId,
      tokenHash,
      expiresAt: Date.now() + 86_400_000,
    });
    await guest.mutation(api.invites.accept, { tokenHash });

    // Host updates access codes
    await host.mutation(api.stays.updateHouseInfo, {
      stayId: subleaseId,
      houseInfo: {
        streetAddress: "123 Main St",
        doorCode: "5678",
        wifiNetwork: "HomeWiFi",
        wifiPassword: "secretpassword",
      },
    });

    // Guest accepts terms
    await guest.mutation(api.terms.acceptCurrent, { stayId: subleaseId });

    // Sublease is unlocked currently
    let bundle = await host.query(api.stays.getBundle, { stayId: subleaseId });
    expect(bundle?.subleaseLock.locked).toBe(false);

    // Simulate subscription expiration: mark snapshot expired in the past
    await t.run(async ({ db }) => {
      const stay = await db.get(subleaseId);
      const snapshot = await db
        .query("subscriptionSnapshots")
        .withIndex("by_household_account", (q) =>
          q.eq("householdAccountId", stay!.householdAccountId!),
        )
        .first();
      await db.patch(snapshot!._id, {
        status: "expired",
        currentPeriodEndsAt: Date.now() - 1000,
      });
      // Set subleaseLockedAt on stay
      await db.patch(subleaseId, { subleaseLockedAt: Date.now() });
    });

    // Check bundle returns locked
    bundle = await host.query(api.stays.getBundle, { stayId: subleaseId });
    expect(bundle?.subleaseLock.locked).toBe(true);
    expect(bundle?.subleaseLock.reason).toBe("expired");

    // 1. Host stay mutations are blocked with role-appropriate message
    await expect(
      host.mutation(api.contributions.create, {
        stayId: subleaseId,
        type: "payment",
        amountCents: 50_000,
        date: "2026-11-05",
        note: "Rent contribution",
        countsTowardBalance: true,
        guestUserId,
      }),
    ).rejects.toThrow(HOST_SUBLEASE_LOCK_MESSAGE);

    await expect(
      host.mutation(api.obligations.createAdhocCharge, {
        stayId: subleaseId,
        guestUserId,
        title: "Key replacement",
        effectiveDate: "2026-11-05",
        dueDate: "2026-11-10",
        amountCents: 3_000,
      }),
    ).rejects.toThrow(HOST_SUBLEASE_LOCK_MESSAGE);

    await expect(
      host.mutation(api.chores.create, {
        stayId: subleaseId,
        title: "Clean oven",
        note: "Before inspection",
        dueDate: "2026-11-15",
        assignee: "shared",
      }),
    ).rejects.toThrow(HOST_SUBLEASE_LOCK_MESSAGE);

    await expect(
      host.mutation(api.announcements.create, {
        stayId: subleaseId,
        title: "Building inspection",
        body: "Inspection scheduled for Friday",
      }),
    ).rejects.toThrow(HOST_SUBLEASE_LOCK_MESSAGE);

    // 2. Guest mutations are blocked with role-appropriate message (no billing details)
    await expect(
      guest.mutation(api.contributions.create, {
        stayId: subleaseId,
        type: "payment",
        amountCents: 50_000,
        date: "2026-11-05",
        note: "Rent contribution",
        countsTowardBalance: true,
      }),
    ).rejects.toThrow(GUEST_SUBLEASE_LOCK_MESSAGE);

    await expect(
      guest.mutation(api.paymentSchedule.requestChange, {
        stayId: subleaseId,
        cadence: "weekly",
        paymentDayOfWeek: 1,
      }),
    ).rejects.toThrow(GUEST_SUBLEASE_LOCK_MESSAGE);

    // 3. Guest can STILL view door code and Wi-Fi before agreement end date
    const guestBundle = await guest.query(api.stays.getBundle, { stayId: subleaseId });
    expect(guestBundle?.stay.houseInfo?.doorCode).toBe("5678");
    expect(guestBundle?.stay.houseInfo?.wifiPassword).toBe("secretpassword");

    // 4. Host CAN end the sublease while locked, which records reminder to change codes
    const endResult = await host.mutation(api.stays.end, { stayId: subleaseId });
    expect(endResult).toBeNull();

    const endedStay = await t.run(async ({ db }) => db.get(subleaseId));
    expect(endedStay?.status).toBe("ended");

    const activities = await t.run(async ({ db }) =>
      db
        .query("activity")
        .withIndex("by_stay_created_at", (q) => q.eq("stayId", subleaseId))
        .collect(),
    );
    const endActivity = activities.find((a) => a.action === "ended");
    expect(endActivity?.detail).toContain(
      "Remember to change physical door codes and Wi-Fi passwords",
    );
  });

  it("pauses late fees and reminders while locked, and waives lock-period late fees upon renewal", async () => {
    const t = convexTest(schema, modules);
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await setSubleasesFlag(t, "enabled");

    const host = t.withIdentity({
      subject: "sublease-host-ledger",
      name: "Morgan Host",
      email: "morgan@example.com",
    });
    const guest = t.withIdentity({
      subject: "sublease-guest-ledger",
      name: "Robin Guest",
      email: "robin@example.com",
    });

    await host.mutation(api.users.syncCurrent, {});
    await guest.mutation(api.users.syncCurrent, {});

    const setupStayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Setup Stay 2",
      terms: sampleWeeklyTerms,
    });
    await grantPlus(t, setupStayId);

    const subleaseId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Sunny Flat Sublet",
      terms: sampleSubleaseTerms,
      arrangement: "sublease",
      subleaseLayout: "whole_place",
    });

    await host.mutation(api.stays.recordLandlordConsent, {
      stayId: subleaseId,
      answer: "written_permission",
    });

    const tokenHash = "d".repeat(64);
    await host.mutation(api.invites.create, {
      stayId: subleaseId,
      tokenHash,
      expiresAt: Date.now() + 86_400_000,
    });
    await guest.mutation(api.invites.accept, { tokenHash });
    await guest.mutation(api.terms.acceptCurrent, { stayId: subleaseId });

    // While unlocked and past due (e.g. Nov 15): late fee applies
    let ledger = await host.query(api.obligations.list, {
      stayId: subleaseId,
      asOfDate: "2026-11-15",
    });
    expect(ledger.length).toBeGreaterThan(0);
    expect(ledger[0].lateFeeCents).toBeGreaterThan(0);
    expect(ledger[0].lateFeeWaived).toBe(false);

    // Lock the sublease as of Nov 1, 2026
    let householdAccountId: Id<"householdAccounts"> | undefined;
    const lockTime = Date.UTC(2026, 10, 1, 0, 0, 0);
    await t.run(async ({ db }) => {
      const stay = await db.get(subleaseId);
      householdAccountId = stay!.householdAccountId!;
      const snapshot = await db
        .query("subscriptionSnapshots")
        .withIndex("by_household_account", (q) =>
          q.eq("householdAccountId", householdAccountId!),
        )
        .first();
      await db.patch(snapshot!._id, {
        status: "expired",
        currentPeriodEndsAt: lockTime,
      });
      await db.patch(subleaseId, { subleaseLockedAt: lockTime });
    });

    // While locked: late fee is waived/paused on the ledger
    ledger = await host.query(api.obligations.list, {
      stayId: subleaseId,
      asOfDate: "2026-11-15",
    });
    expect(ledger[0].lateFeeCents).toBe(0);
    expect(ledger[0].lateFeeWaived).toBe(true);

    // Reminders skip locked stays
    const nowMs = Date.UTC(2026, 10, 15, 12, 0, 0);
    const reminderResults = await t.query(internal.notifications.reminderCandidates, {
      now: nowMs,
    });
    expect(
      reminderResults.filter((r) => (r as { stayId: string }).stayId === subleaseId),
    ).toHaveLength(0);

    // Renew subscription
    await t.run(async (ctx) => {
      const snapshot = await ctx.db
        .query("subscriptionSnapshots")
        .withIndex("by_household_account", (q) =>
          q.eq("householdAccountId", householdAccountId!),
        )
        .first();
      await ctx.db.patch(snapshot!._id, {
        status: "active",
        currentPeriodEndsAt: Date.now() + 30 * 86_400_000,
      });
      const { reconcileAccountSubleaseLocks } = await import(
        "../convex/lib/subleaseLock"
      );
      await reconcileAccountSubleaseLocks(
        ctx,
        householdAccountId!,
        "production",
        Date.UTC(2026, 10, 15, 12, 0, 0),
      );
    });

    // Sublease is unlocked now
    const stayDoc = await t.run(async ({ db }) => db.get(subleaseId));
    expect(stayDoc?.subleaseLockedAt).toBeUndefined();

    // Past due obligation that occurred during lock period has lateFeeWaivedAt set
    const obligations = await t.run(async ({ db }) =>
      db
        .query("obligations")
        .withIndex("by_stay", (q) => q.eq("stayId", subleaseId))
        .collect(),
    );
    expect(obligations[0].lateFeeWaivedAt).toBeDefined();
  });
});
