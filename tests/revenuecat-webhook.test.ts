import { convexTest } from "convex-test";
import { afterEach, describe, expect, it } from "vitest";

import schema from "../convex/schema";
import { normalizeRevenueCatEvent } from "../lib/domain/revenuecatWebhook";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const previousAuthorization = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
const previousAppId = process.env.REVENUECAT_APP_ID;
const authorization = "test-webhook-secret";
const appId = "app_kouchd_test";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      id: "event-1",
      type: "INITIAL_PURCHASE",
      app_id: appId,
      app_user_id: "clerk-host-1",
      environment: "PRODUCTION",
      event_timestamp_ms: 1_800_000_000_000,
      product_id: "kouchd_plus_monthly",
      entitlement_ids: ["kouchd_plus"],
      purchased_at_ms: 1_799_000_000_000,
      expiration_at_ms: 1_802_000_000_000,
      will_renew: true,
      ...overrides,
    },
  };
}

function requestBody(body: unknown, headers: Record<string, string> = {}) {
  return {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

afterEach(() => {
  if (previousAuthorization === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
  else process.env.REVENUECAT_WEBHOOK_AUTHORIZATION = previousAuthorization;
  if (previousAppId === undefined) delete process.env.REVENUECAT_APP_ID;
  else process.env.REVENUECAT_APP_ID = previousAppId;
});

describe("RevenueCat webhook normalization", () => {
  it("maps known entitlements and environments while requiring a recognized plan", () => {
    expect(normalizeRevenueCatEvent(payload(), appId)).toMatchObject({
      kind: "normalized",
      event: { entitlement: "plus", environment: "production", status: "active" },
    });
    expect(normalizeRevenueCatEvent(payload({
      type: "RENEWAL",
      environment: "SANDBOX",
      entitlement_ids: ["kouchd_pro"],
    }), appId)).toMatchObject({
      kind: "normalized",
      event: { entitlement: "pro", environment: "sandbox", status: "active" },
    });
  });

  it("keeps cancellation paid-through, but sends terminal and retry events to conservative states", () => {
    expect(normalizeRevenueCatEvent(payload({ type: "CANCELLATION" }), appId)).toMatchObject({
      kind: "normalized",
      event: { status: "canceled", currentPeriodEndsAt: 1_802_000_000_000 },
    });
    expect(normalizeRevenueCatEvent(payload({ type: "BILLING_ISSUE", grace_period_expiration_at_ms: 1_801_000_000_000 }), appId))
      .toMatchObject({ kind: "normalized", event: { status: "grace_period", currentPeriodEndsAt: 1_801_000_000_000 } });
    expect(normalizeRevenueCatEvent(payload({ type: "BILLING_ISSUE" }), appId))
      .toMatchObject({ kind: "normalized", event: { status: "billing_retry" } });
    expect(normalizeRevenueCatEvent(payload({
      type: "CANCELLATION",
      cancel_reason: "BILLING_ERROR",
      grace_period_expiration_at_ms: 1_801_000_000_000,
    }), appId)).toMatchObject({ kind: "normalized", event: { status: "grace_period" } });
    expect(normalizeRevenueCatEvent(payload({ type: "EXPIRATION" }), appId))
      .toMatchObject({ kind: "normalized", event: { status: "expired" } });
    expect(normalizeRevenueCatEvent(payload({ type: "REFUND" }), appId))
      .toMatchObject({ kind: "normalized", event: { status: "refunded" } });
  });

  it("ignores transfers, unknown/ambiguous entitlements, wrong apps, and malformed timestamps", () => {
    expect(normalizeRevenueCatEvent(payload({ type: "TRANSFER", app_user_id: undefined }), appId)).toEqual({ kind: "ignored" });
    expect(normalizeRevenueCatEvent(payload({ type: "TEST" }), appId)).toEqual({ kind: "ignored" });
    expect(normalizeRevenueCatEvent(payload({ entitlement_ids: ["kouchd_plus", "kouchd_pro"] }), appId))
      .toEqual({ kind: "ignored" });
    expect(normalizeRevenueCatEvent(payload({ entitlement_ids: ["unknown"] }), appId)).toEqual({ kind: "ignored" });
    expect(normalizeRevenueCatEvent(payload({ app_id: "another-app" }), appId)).toEqual({ kind: "wrong_app" });
    expect(normalizeRevenueCatEvent(payload({ event_timestamp_ms: Number.MAX_SAFE_INTEGER + 1 }), appId))
      .toEqual({ kind: "invalid" });
  });
});

describe("RevenueCat webhook endpoint", () => {
  it("rejects missing configuration, wrong secrets, malformed bodies, wrong apps, and oversized requests", async () => {
    delete process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
    delete process.env.REVENUECAT_APP_ID;
    const t = convexTest(schema, modules);

    process.env.REVENUECAT_APP_ID = appId;
    expect((await t.fetch("/revenuecat/webhook", requestBody(payload()))).status).toBe(503);

    process.env.REVENUECAT_WEBHOOK_AUTHORIZATION = authorization;
    expect((await t.fetch("/revenuecat/webhook", requestBody(payload(), { authorization: "wrong" }))).status).toBe(401);
    expect((await t.fetch("/revenuecat/webhook", requestBody("{"))).status).toBe(400);
    expect((await t.fetch("/revenuecat/webhook", requestBody(payload({ app_id: "other" })))).status).toBe(400);

    const tooLarge = " ".repeat(64 * 1024 + 1);
    expect((await t.fetch("/revenuecat/webhook", requestBody(tooLarge))).status).toBe(413);
  });

  it("updates only the exact Clerk owner, deduplicates retries, and isolates environments", async () => {
    process.env.REVENUECAT_WEBHOOK_AUTHORIZATION = authorization;
    process.env.REVENUECAT_APP_ID = appId;
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkUserId: "clerk-host-1",
        name: "Synthetic Host",
        createdAt: 1,
        updatedAt: 1,
      });
    });

    const first = await t.fetch("/revenuecat/webhook", requestBody(payload()));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, result: "applied" });

    const duplicate = await t.fetch("/revenuecat/webhook", requestBody(payload()));
    expect(await duplicate.json()).toMatchObject({ received: true, result: "duplicate" });

    const cancellationPayload = payload({
      id: "event-cancel",
      type: "CANCELLATION",
      event_timestamp_ms: 1_800_000_000_100,
      entitlement_ids: [],
      will_renew: false,
    });
    expect(await (await t.fetch("/revenuecat/webhook", requestBody(cancellationPayload))).json())
      .toMatchObject({ received: true, result: "applied" });

    const sandboxPayload = payload({ id: "event-sandbox", environment: "SANDBOX", type: "RENEWAL" });
    expect((await t.fetch("/revenuecat/webhook", requestBody(sandboxPayload))).status).toBe(200);

    const database = await t.run(async (ctx) => ({
      accounts: await ctx.db.query("householdAccounts").collect(),
      snapshots: await ctx.db.query("subscriptionSnapshots").collect(),
      events: await ctx.db.query("providerEvents").collect(),
    }));
    expect(database.accounts).toHaveLength(1);
    expect(database.snapshots).toHaveLength(2);
    expect(database.events).toHaveLength(3);
    expect(database.snapshots.map((snapshot) => snapshot.environment).sort()).toEqual(["production", "sandbox"]);
    expect(database.snapshots.find((snapshot) => snapshot.environment === "production"))
      .toMatchObject({ status: "canceled", entitlement: "plus", willRenew: false });
    expect(database.events.some((event) => "providerAppUserId" in event)).toBe(false);
  });

  it("does not resolve an anonymous App User ID through aliases", async () => {
    process.env.REVENUECAT_WEBHOOK_AUTHORIZATION = authorization;
    process.env.REVENUECAT_APP_ID = appId;
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkUserId: "clerk-host-1",
        name: "Synthetic Host",
        createdAt: 1,
        updatedAt: 1,
      });
    });

    const event = {
      ...payload({ app_user_id: "$RCAnonymousID:123", aliases: ["clerk-host-1"] }),
    };
    const response = await t.fetch("/revenuecat/webhook", requestBody(event));
    expect(await response.json()).toMatchObject({ received: true, result: "ignored" });
    const counts = await t.run(async (ctx) => ({
      accounts: await ctx.db.query("householdAccounts").collect(),
      snapshots: await ctx.db.query("subscriptionSnapshots").collect(),
    }));
    expect(counts.accounts).toHaveLength(0);
    expect(counts.snapshots).toHaveLength(0);
  });
});
