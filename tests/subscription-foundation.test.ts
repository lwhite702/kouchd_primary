import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "../convex/_generated/api";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
  getPlanLimits,
  resolveEffectiveSubscriptionPlan,
  resolveSubscriptionPlan,
} from "../lib/domain/subscriptionPlans";

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
const previousFoundingHostProducts = process.env.REVENUECAT_FOUNDING_HOST_PRODUCT_IDS;

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
  if (previousFoundingHostProducts === undefined) delete process.env.REVENUECAT_FOUNDING_HOST_PRODUCT_IDS;
  else process.env.REVENUECAT_FOUNDING_HOST_PRODUCT_IDS = previousFoundingHostProducts;
});

describe("subscription policy", () => {
  it("keeps shadow limits aligned with the proposed Starter and Plus capacity", () => {
    expect(getPlanLimits("starter")).toEqual({ maxActiveStays: 1, maxActiveGuests: 2 });
    expect(getPlanLimits("hostPlus")).toEqual({ maxActiveStays: 1, maxActiveGuests: 5 });
    expect(getPlanLimits("householdPro")).toEqual({ maxActiveStays: null, maxActiveGuests: null });
  });

  it("resolves independent entitlements, lifetime Founder grants, and environment boundaries", () => {
    expect(resolveEffectiveSubscriptionPlan([
      { environment: "production", entitlement: "plus", status: "active", accessUntilMs: 500 },
      { environment: "production", entitlement: "pro", status: "active", accessUntilMs: 500 },
    ], "production", 100)).toBe("householdPro");
    expect(resolveEffectiveSubscriptionPlan([
      { environment: "production", entitlement: "founding_host", status: "active", lifetime: true },
      { environment: "production", entitlement: "pro", status: "expired", accessUntilMs: 500 },
    ], "production", 100)).toBe("hostPlus");
    expect(resolveEffectiveSubscriptionPlan([
      { environment: "production", entitlement: "founding_host", status: "refunded", lifetime: false },
      { environment: "production", entitlement: "plus", status: "active", accessUntilMs: 500 },
    ], "production", 100)).toBe("hostPlus");
    expect(resolveEffectiveSubscriptionPlan([
      { environment: "sandbox", entitlement: "pro", status: "active", accessUntilMs: 500 },
      { environment: "sandbox", entitlement: "founding_host", status: "active", lifetime: true },
    ], "production", 100)).toBe("starter");
    expect(resolveEffectiveSubscriptionPlan([
      { environment: "production", entitlement: "plus", status: "active", accessUntilMs: 100 },
    ], "production", 100)).toBe("starter");
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

  it("deduplicates events, applies per-source stale ordering, and isolates environments", async () => {
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
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, { ...event, providerEventId: "prod-stale", occurredAt: 99 })).toBe("stale");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, { ...event, providerEventId: "sandbox-1", environment: "sandbox", entitlement: "pro", occurredAt: 101 })).toBe("applied");

    const snapshots = await t.run(async (ctx) => ctx.db.query("subscriptionSnapshots").collect());
    expect(snapshots).toHaveLength(2);
    expect(snapshots.find((snapshot) => snapshot.environment === "production")?.entitlement).toBe("plus");
    expect(snapshots.find((snapshot) => snapshot.environment === "sandbox")?.entitlement).toBe("pro");
    const grants = await t.run(async (ctx) => ctx.db.query("subscriptionEntitlementGrants").collect());
    expect(grants.map((grant) => `${grant.environment}:${grant.entitlement}`).sort()).toEqual([
      "production:plus",
      "sandbox:pro",
    ]);

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

  it("preserves independent sources and fails closed for invalid Founding Host events", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "independent-grants-host", name: "Host" });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
    const { accountId, clerkUserId } = await t.run(async (ctx) => {
      const stay = await ctx.db.get(stayId);
      const account = stay?.householdAccountId ? await ctx.db.get(stay.householdAccountId) : null;
      const owner = stay ? await ctx.db.get(stay.hostUserId) : null;
      return { accountId: account?._id, clerkUserId: owner?.clerkUserId };
    });
    if (!accountId || !clerkUserId) throw new Error("Expected host billing account");

    const future = Date.now() + 60_000;
    const initial = {
      provider: "revenuecat",
      householdAccountId: accountId,
      providerAppUserId: clerkUserId,
      eventType: "INITIAL_PURCHASE",
      productId: "shared-subscription-product",
      entitlements: ["plus", "pro"] as Array<"plus" | "pro" | "founding_host">,
      status: "active" as const,
      environment: "production",
      occurredAt: 100,
      currentPeriodEndsAt: future,
    };
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...initial,
      providerEventId: "dual-plus-pro",
    })).toBe("applied");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...initial,
      providerEventId: "dual-plus-pro",
    })).toBe("duplicate");

    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...initial,
      providerEventId: "second-plus-source",
      productId: "second-plus-product",
      entitlements: ["plus"],
      occurredAt: 150,
    })).toBe("applied");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...initial,
      providerEventId: "stale-plus-source",
      occurredAt: 99,
    })).toBe("stale");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...initial,
      providerEventId: "pro-expired",
      entitlements: ["pro"],
      eventType: "EXPIRATION",
      status: "expired",
      occurredAt: 200,
      currentPeriodEndsAt: Date.now(),
    })).toBe("applied");

    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "stay_activated",
      dimension: "active_stays",
    });
    expect((log.mock.calls.at(-1)?.[1] as { plan: string }).plan).toBe("hostPlus");

    const founderEvent = {
      provider: "revenuecat",
      householdAccountId: accountId,
      providerAppUserId: clerkUserId,
      eventType: "NON_RENEWING_PURCHASE",
      entitlements: ["founding_host"] as Array<"plus" | "pro" | "founding_host">,
      status: "active" as const,
      environment: "production",
      currentPeriodEndsAt: undefined,
    };
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...founderEvent,
      providerEventId: "founder-unconfigured",
      productId: "founder-product",
      occurredAt: 250,
    })).toBe("ignored");
    process.env.REVENUECAT_FOUNDING_HOST_PRODUCT_IDS = "configured-founder-product";
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...founderEvent,
      providerEventId: "founder-wrong-product",
      productId: "other-product",
      occurredAt: 260,
    })).toBe("ignored");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...founderEvent,
      providerEventId: "founder-wrong-event",
      eventType: "INITIAL_PURCHASE",
      productId: "configured-founder-product",
      occurredAt: 270,
    })).toBe("ignored");

    process.env.REVENUECAT_FOUNDING_HOST_PRODUCT_IDS = "founder-product";
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...founderEvent,
      providerEventId: "founder-purchased",
      productId: "founder-product",
      occurredAt: 300,
    })).toBe("applied");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...founderEvent,
      providerEventId: "founder-refund-reversed-too-soon",
      eventType: "REFUND_REVERSED",
      productId: "founder-product",
      occurredAt: 325,
    })).toBe("ignored");
    const activeFounder = await t.run(async (ctx) => ctx.db
      .query("subscriptionEntitlementGrants")
      .withIndex("by_household_provider_environment_entitlement_source", (query) =>
        query
          .eq("householdAccountId", accountId)
          .eq("provider", "revenuecat")
          .eq("environment", "production")
          .eq("entitlement", "founding_host")
          .eq("sourceKey", "product:founder-product"),
      )
      .unique());
    expect(activeFounder).toMatchObject({ status: "active", lifetime: true, latestProviderEventAt: 300 });

    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...founderEvent,
      providerEventId: "founder-refunded",
      eventType: "REFUND",
      status: "refunded",
      productId: "founder-product",
      occurredAt: 350,
    })).toBe("applied");
    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...founderEvent,
      providerEventId: "founder-reversal-wrong-source",
      eventType: "REFUND_REVERSED",
      productId: "founder-product",
      sourceKey: "transaction:unrelated-source",
      occurredAt: 360,
    })).toBe("ignored");
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "stay_activated",
      dimension: "active_stays",
    });
    expect((log.mock.calls.at(-1)?.[1] as { plan: string }).plan).toBe("hostPlus");

    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...initial,
      providerEventId: "second-plus-expired",
      productId: "second-plus-product",
      entitlements: ["plus"],
      eventType: "EXPIRATION",
      status: "expired",
      occurredAt: 400,
    })).toBe("applied");
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "stay_activated",
      dimension: "active_stays",
    });
    expect((log.mock.calls.at(-1)?.[1] as { plan: string }).plan).toBe("hostPlus");

    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...initial,
      providerEventId: "last-plus-expired",
      entitlements: ["plus"],
      eventType: "EXPIRATION",
      status: "expired",
      occurredAt: 500,
    })).toBe("applied");
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "stay_activated",
      dimension: "active_stays",
    });
    expect((log.mock.calls.at(-1)?.[1] as { plan: string }).plan).toBe("starter");

    expect(await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      ...founderEvent,
      providerEventId: "founder-refund-reversed",
      eventType: "REFUND_REVERSED",
      productId: "founder-product",
      occurredAt: 600,
    })).toBe("applied");
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "stay_activated",
      dimension: "active_stays",
    });
    expect((log.mock.calls.at(-1)?.[1] as { plan: string }).plan).toBe("hostPlus");
  });

  it("keeps legacy subscription snapshots available as a safe fallback", async () => {
    const t = convexTest(schema, modules);
    const future = Date.now() + 60_000;
    const stayId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        clerkUserId: "legacy-snapshot-host",
        name: "Legacy Host",
        createdAt: 1,
        updatedAt: 1,
      });
      const accountId = await ctx.db.insert("householdAccounts", { ownerUserId: userId, createdAt: 1, updatedAt: 1 });
      const stayId = await ctx.db.insert("stays", {
        hostUserId: userId,
        householdAccountId: accountId,
        status: "active",
        timezone: "UTC",
        createdAt: 1,
        updatedAt: 1,
      });
      await ctx.db.insert("subscriptionSnapshots", {
        householdAccountId: accountId,
        provider: "revenuecat",
        providerAppUserId: "legacy-snapshot-host",
        productId: "legacy-plus-product",
        entitlement: "plus",
        status: "active",
        environment: "production",
        currentPeriodEndsAt: future,
        updatedAt: 1,
      });
      return stayId;
    });

    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await t.mutation(internal.subscriptionShadow.recordLimitShadow, {
      stayId,
      event: "stay_activated",
      dimension: "active_stays",
    });
    expect((log.mock.calls.at(-1)?.[1] as { plan: string }).plan).toBe("hostPlus");
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
