import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "../convex/_generated/api";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { getPlanLimits, resolveSubscriptionPlan } from "../lib/domain/subscriptionPlans";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const terms = {
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  cadence: "weekly" as const,
  rateCents: 10_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Welcome.",
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
});

describe("subscription policy", () => {
  it("keeps shadow limits aligned with the proposed Starter and Plus capacity", () => {
    expect(getPlanLimits("starter")).toEqual({ maxActiveStays: 1, maxActiveGuests: 1 });
    expect(getPlanLimits("hostPlus")).toEqual({ maxActiveStays: 3, maxActiveGuests: 5 });
    expect(getPlanLimits("householdPro")).toEqual({ maxActiveStays: null, maxActiveGuests: null });
  });

  it("resolves paid access only during a known active period", () => {
    expect(resolveSubscriptionPlan(null, 100)).toBe("starter");
    expect(resolveSubscriptionPlan({ status: "active", plan: "hostPlus", accessUntilMs: 200 }, 100)).toBe("hostPlus");
    expect(resolveSubscriptionPlan({ status: "grace", plan: "householdPro", accessUntilMs: 200 }, 100)).toBe("householdPro");
    expect(resolveSubscriptionPlan({ status: "canceledUntilPeriodEnd", plan: "hostPlus", accessUntilMs: 200 }, 100)).toBe("hostPlus");
    expect(resolveSubscriptionPlan({ status: "canceledUntilPeriodEnd", plan: "hostPlus", accessUntilMs: 100 }, 100)).toBe("starter");
    expect(resolveSubscriptionPlan({ status: "active", plan: "hostPlus" }, 100)).toBe("starter");
    expect(resolveSubscriptionPlan({ status: "expired", plan: "householdPro" }, 100)).toBe("starter");
    expect(resolveSubscriptionPlan({ status: "refunded", plan: "householdPro" }, 100)).toBe("starter");
    expect(resolveSubscriptionPlan({ status: "unknown", plan: "householdPro" }, 100)).toBe("starter");
  });

  it("links new stays to their authenticated host and keeps guest access free", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "subscription-host", name: "Host", email: "host@example.com" });
    const guest = t.withIdentity({ subject: "subscription-guest", name: "Guest", email: "guest@example.com" });
    await host.mutation(api.users.syncCurrent, {});
    await guest.mutation(api.users.syncCurrent, {});

    const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
    const linked = await t.run(async (ctx) => {
      const stay = await ctx.db.get(stayId);
      const account = stay?.householdAccountId ? await ctx.db.get(stay.householdAccountId) : null;
      return { stay, account };
    });
    expect(linked.stay?.householdAccountId).toBeDefined();
    expect(linked.account?.ownerUserId).toBe(linked.stay?.hostUserId);

    const referralCode = (await host.query(api.stays.getBundle, { stayId })).stay.referralCode!;
    const joined = await guest.mutation(api.referral.joinWithCode, { referralCode });
    expect(joined.alreadyMember).toBe(false);
    expect((await guest.query(api.stays.getBundle, { stayId })).stay._id).toBe(stayId);
  });

  it("backfills legacy stay ownership idempotently without changing the stay", async () => {
    const t = convexTest(schema, modules);
    const { userId, stayId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        clerkUserId: "legacy-host",
        name: "Legacy Host",
        createdAt: 1,
        updatedAt: 1,
      });
      const stayId = await ctx.db.insert("stays", {
        hostUserId: userId,
        status: "pending",
        timezone: "UTC",
        referralCode: "KCH-LEGACY1",
        createdAt: 10,
        updatedAt: 11,
      });
      return { userId, stayId };
    });

    const before = await t.run((ctx) => ctx.db.get(stayId));
    const first = await t.mutation(internal.householdMigrations.backfillHouseholdAccounts, {});
    const second = await t.mutation(internal.householdMigrations.backfillHouseholdAccounts, {});
    const after = await t.run((ctx) => ctx.db.get(stayId));
    const audit = await t.query(internal.householdMigrations.auditHouseholdAccounts, {});

    expect(first.linked).toBe(1);
    expect(second.alreadyLinked).toBe(1);
    expect(after?.householdAccountId).toBeDefined();
    expect(after?.hostUserId).toBe(userId);
    expect(after?.createdAt).toBe(before?.createdAt);
    expect(after?.updatedAt).toBe(before?.updatedAt);
    expect(audit.missingLinks).toBe(0);
    expect(audit.ownerMismatches).toBe(0);
  });

  it("deduplicates events, isolates environments, and ignores equal-time older snapshots", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "subscription-event-host", name: "Host" });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
    const { accountId, clerkUserId } = await t.run(async (ctx) => {
      const stay = await ctx.db.get(stayId);
      const account = stay?.householdAccountId ? await ctx.db.get(stay.householdAccountId) : null;
      const owner = stay ? await ctx.db.get(stay.hostUserId) : null;
      return { accountId: account?._id, clerkUserId: owner?.clerkUserId };
    });
    if (!accountId || !clerkUserId) throw new Error("Expected host billing account");

    const periodEnd = Date.now() + 60_000;
    const event = {
      provider: "revenuecat",
      householdAccountId: accountId,
      providerAppUserId: clerkUserId,
      eventType: "subscription_renewed",
      entitlement: "plus",
      status: "active" as const,
      environment: "production",
      occurredAt: 100,
      currentPeriodEndsAt: periodEnd,
    };
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, { ...event, providerEventId: "prod-1" })).toBe("applied");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, { ...event, providerEventId: "prod-1" })).toBe("duplicate");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, { ...event, providerEventId: "prod-2", entitlement: "pro" })).toBe("stale");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, { ...event, providerEventId: "sandbox-1", environment: "sandbox", entitlement: "pro", occurredAt: 101 })).toBe("applied");

    const snapshots = await t.run(async (ctx) => ctx.db.query("subscriptionSnapshots").collect());
    expect(snapshots).toHaveLength(2);
    expect(snapshots.find((snapshot) => snapshot.environment === "production")?.entitlement).toBe("plus");
    expect(snapshots.find((snapshot) => snapshot.environment === "sandbox")?.entitlement).toBe("pro");

    const shadow = vi.spyOn(console, "info").mockImplementation(() => {});
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "stay_activated",
      dimension: "active_stays",
    });
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "sandbox";
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "stay_activated",
      dimension: "active_stays",
    });
    expect(shadow.mock.calls.map(([, payload]) => (payload as { plan: string }).plan)).toEqual(["hostPlus", "householdPro"]);
  });

  it("emits only aggregate fields in shadow logs and never blocks guest joins", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "shadow-host", name: "Private Host" });
    const guest = t.withIdentity({ subject: "shadow-guest", name: "Private Guest" });
    await host.mutation(api.users.syncCurrent, {});
    await guest.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
    const referralCode = (await host.query(api.stays.getBundle, { stayId })).stay.referralCode!;

    await expect(guest.mutation(api.referral.joinWithCode, { referralCode })).resolves.toMatchObject({ alreadyMember: false });
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "guest_joined",
      dimension: "active_guest_memberships",
    });
    const payload = JSON.stringify(log.mock.calls);
    expect(payload).toContain("subscription_limit_shadow");
    expect(payload).toContain("active_guest_memberships");
    expect(payload).not.toContain("Private Host");
    expect(payload).not.toContain("Private Guest");
    expect(payload).not.toContain(referralCode);
  });
});
