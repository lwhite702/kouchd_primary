import { convexTest } from "convex-test";
import { afterEach, describe, expect, it } from "vitest";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";

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
  delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
});

describe("current account subscription summary", () => {
  it("requires an authenticated, synced account", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.subscriptions.currentAccountSummary, {})).rejects.toThrow("Unauthenticated");
    const unsynced = t.withIdentity({ subject: "summary-unsynced", name: "Not Synced" });
    await expect(unsynced.query(api.subscriptions.currentAccountSummary, {})).rejects.toThrow("User profile is not synced");
  });

  it("returns a Starter baseline for guests without revealing host billing state", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "summary-host", name: "Host" });
    const guest = t.withIdentity({ subject: "summary-guest", name: "Guest" });
    const otherHost = t.withIdentity({ subject: "summary-other-host", name: "Other Host" });
    await host.mutation(api.users.syncCurrent, {});
    await guest.mutation(api.users.syncCurrent, {});
    await otherHost.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
    await otherHost.mutation(api.stays.create, { timezone: "UTC", terms });
    const referralCode = (await host.query(api.stays.getBundle, { stayId })).stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });

    const { accountId, ownerClerkId } = await t.run(async (ctx) => {
      const stay = await ctx.db.get(stayId);
      const owner = stay ? await ctx.db.get(stay.hostUserId) : null;
      return { accountId: stay?.householdAccountId, ownerClerkId: owner?.clerkUserId };
    });
    if (!accountId || !ownerClerkId) throw new Error("Expected a host billing account");
    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      provider: "revenuecat",
      providerEventId: "host-pro-plus",
      householdAccountId: accountId,
      providerAppUserId: ownerClerkId,
      eventType: "subscription_renewed",
      entitlement: "pro",
      status: "active",
      environment: "production",
      occurredAt: 100,
      currentPeriodEndsAt: Date.now() + 60_000,
    });
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";

    const summary = await guest.query(api.subscriptions.currentAccountSummary, {});
    expect(summary).toMatchObject({
      canManageSubscription: false,
      plan: "starter",
      status: "starter",
      capabilities: { guestFunctions: true, coreLedger: true },
    });
    expect(summary).not.toHaveProperty("householdAccountId");
    expect(summary).not.toHaveProperty("providerAppUserId");
    expect((await host.query(api.subscriptions.currentAccountSummary, {})).plan).toBe("householdPro");
    expect(await otherHost.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({
      canManageSubscription: true,
      plan: "starter",
      status: "starter",
    });
  });

  it("lets the authenticated owner manage a subscription before creating a stay", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "summary-owner-without-stay", name: "Owner" });
    await owner.mutation(api.users.syncCurrent, {});
    const { accountId, ownerClerkId } = await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "summary-owner-without-stay"))
        .unique();
      if (!user) throw new Error("Expected a synced user");
      const accountId = await ctx.db.insert("householdAccounts", {
        ownerUserId: user._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { accountId, ownerClerkId: user.clerkUserId };
    });
    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      provider: "revenuecat",
      providerEventId: "pre-stay-plus",
      householdAccountId: accountId,
      providerAppUserId: ownerClerkId,
      eventType: "subscription_renewed",
      entitlement: "plus",
      status: "active",
      environment: "production",
      occurredAt: 100,
      currentPeriodEndsAt: Date.now() + 60_000,
    });
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";

    expect(await owner.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({
      canManageSubscription: true,
      plan: "hostPlus",
      status: "active",
    });
  });

  it("keeps paid access through grace and cancellation periods, then falls back at expiry", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "summary-lifecycle-host", name: "Host" });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
    const { accountId, ownerClerkId } = await t.run(async (ctx) => {
      const stay = await ctx.db.get(stayId);
      const owner = stay ? await ctx.db.get(stay.hostUserId) : null;
      return { accountId: stay?.householdAccountId, ownerClerkId: owner?.clerkUserId };
    });
    if (!accountId || !ownerClerkId) throw new Error("Expected a host billing account");
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";

    const record = (
      eventId: string,
      status: "active" | "grace_period" | "billing_retry" | "canceled" | "expired" | "refunded",
      occurredAt: number,
      currentPeriodEndsAt: number,
    ) =>
      t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
        provider: "revenuecat",
        providerEventId: eventId,
        householdAccountId: accountId,
        providerAppUserId: ownerClerkId,
        eventType: status,
        entitlement: "plus",
        status,
        environment: "production",
        occurredAt,
        currentPeriodEndsAt,
        willRenew: status === "active",
      });

    const futurePeriodEnd = Date.now() + 60_000;
    await record("lifecycle-active", "active", 100, futurePeriodEnd);
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({ plan: "hostPlus", status: "active" });
    await record("lifecycle-grace", "grace_period", 200, futurePeriodEnd);
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({ plan: "hostPlus", status: "grace_period" });
    await record("lifecycle-canceled", "canceled", 300, futurePeriodEnd);
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({ plan: "hostPlus", status: "canceled" });
    await record("lifecycle-expired-period", "canceled", 400, Date.now() - 1);
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({ plan: "starter", status: "expired" });
    await record("lifecycle-expired-grace", "grace_period", 500, Date.now() - 1);
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({ plan: "starter", status: "expired" });
    await record("lifecycle-expired-event", "expired", 600, Date.now() + 60_000);
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({ plan: "starter", status: "expired" });
    await record("lifecycle-billing-retry", "billing_retry", 700, Date.now() + 60_000);
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({ plan: "starter", status: "billing_retry" });
    await record("lifecycle-refunded", "refunded", 800, Date.now() + 60_000);
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({ plan: "starter", status: "refunded" });
  });

  it("fails closed for missing environment, provider expiry, and unknown provider status", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "summary-fail-closed-host", name: "Host" });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
    const { accountId, ownerClerkId } = await t.run(async (ctx) => {
      const stay = await ctx.db.get(stayId);
      const owner = stay ? await ctx.db.get(stay.hostUserId) : null;
      return { accountId: stay?.householdAccountId, ownerClerkId: owner?.clerkUserId };
    });
    if (!accountId || !ownerClerkId) throw new Error("Expected a host billing account");

    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      provider: "revenuecat",
      providerEventId: "host-sandbox-pro",
      householdAccountId: accountId,
      providerAppUserId: ownerClerkId,
      eventType: "subscription_renewed",
      entitlement: "pro",
      status: "active",
      environment: "sandbox",
      occurredAt: 100,
      currentPeriodEndsAt: Date.now() + 60_000,
    });

    expect((await host.query(api.subscriptions.currentAccountSummary, {})).plan).toBe("starter");
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    expect((await host.query(api.subscriptions.currentAccountSummary, {})).plan).toBe("starter");

    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      provider: "revenuecat",
      providerEventId: "host-prod-unknown",
      householdAccountId: accountId,
      providerAppUserId: ownerClerkId,
      eventType: "unknown",
      entitlement: "pro",
      status: "unknown",
      environment: "production",
      occurredAt: 200,
      currentPeriodEndsAt: Date.now() + 60_000,
    });
    const unknown = await host.query(api.subscriptions.currentAccountSummary, {});
    expect(unknown.plan).toBe("starter");
    expect(unknown.status).toBe("unknown");
  });
});
