import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";
import { createIntroOfferEligibilityJws, readIntroOfferSigningConfig } from "../lib/domain/introOfferSignature";
import { normalizeRevenueCatEvent } from "../lib/domain/revenuecatWebhook";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);
const terms = {
  startDate: "2026-10-22",
  endDate: "2026-11-20",
  cadence: "daily" as const,
  rateCents: 1000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Welcome.",
};
const DAY = 86_400_000;
const signingEnv = ["APP_STORE_IAP_KEY_ID", "APP_STORE_IAP_ISSUER_ID", "APP_STORE_BUNDLE_ID", "APP_STORE_IAP_PRIVATE_KEY"];

async function hostWithStay() {
  const t = convexTest(schema, modules);
  const host = t.withIdentity({ subject: "host", name: "Host", email: "host@example.com" });
  await host.mutation(api.users.syncCurrent, {});
  const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
  const account = (await host.query(api.stays.getBundle, { stayId })).stay.householdAccountId!;
  return { t, host, stayId, account };
}

function trialEvent(account: Id<"householdAccounts">, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    provider: "revenuecat",
    providerEventId: "trial-start",
    householdAccountId: account,
    providerAppUserId: "host",
    eventType: "INITIAL_PURCHASE",
    productId: "kouchd_plus_yearly",
    entitlement: "plus",
    status: "active" as const,
    environment: "production",
    occurredAt: now,
    startedAt: now,
    currentPeriodEndsAt: now + 7 * DAY,
    willRenew: true,
    periodType: "trial" as const,
    store: "app_store" as const,
    ...overrides,
  };
}

async function generatePem() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const body = Buffer.from(pkcs8).toString("base64").match(/.{1,64}/g)!.join("\n");
  return { pem: `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`, publicKey: pair.publicKey };
}

function decodePart(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

beforeEach(() => {
  process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
  for (const key of signingEnv) delete process.env[key];
});

describe("RevenueCat trial and store fields", () => {
  it("normalizes period type and store", () => {
    const parsed = normalizeRevenueCatEvent({
      event: {
        id: "e1", type: "INITIAL_PURCHASE", app_id: "app", app_user_id: "host", environment: "PRODUCTION",
        event_timestamp_ms: 1, entitlement_ids: ["kouchd_plus"], expiration_at_ms: 10,
        period_type: "TRIAL", store: "APP_STORE",
      },
    }, "app");
    expect(parsed).toMatchObject({ kind: "normalized", event: { periodType: "trial", store: "app_store" } });
    const web = normalizeRevenueCatEvent({
      event: {
        id: "e2", type: "RENEWAL", app_id: "app", app_user_id: "host", environment: "PRODUCTION",
        event_timestamp_ms: 1, entitlement_ids: ["kouchd_plus"], expiration_at_ms: 10,
        period_type: "NORMAL", store: "STRIPE",
      },
    }, "app");
    expect(web).toMatchObject({ event: { periodType: "normal", store: "web" } });
  });

  it("shows trial status, store and reminder setting to the host, and keeps them across cancellation events", async () => {
    const { t, host, account } = await hostWithStay();
    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, trialEvent(account));
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({
      plan: "hostPlus",
      planName: "plus",
      isTrial: true,
      store: "app_store",
      productId: "kouchd_plus_yearly",
      trialReminderEnabled: true,
      introOfferEligible: false,
    });
    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, trialEvent(account, {
      providerEventId: "cancel", eventType: "CANCELLATION", status: "canceled", willRenew: false,
      occurredAt: Date.now() + 1, periodType: undefined, store: undefined,
    }));
    expect(await host.query(api.subscriptions.currentAccountSummary, {})).toMatchObject({
      isTrial: true, store: "app_store", willRenew: false,
    });
  });
});

describe("one trial per host billing account", () => {
  it("is eligible until the account has had any subscription, from any store", async () => {
    const { t, host, account } = await hostWithStay();
    expect((await host.query(api.subscriptions.currentAccountSummary, {})).introOfferEligible).toBe(true);
    // A web (Stripe through RevenueCat) subscription that has since expired still uses up the trial.
    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, trialEvent(account, {
      store: "web", status: "expired", eventType: "EXPIRATION", currentPeriodEndsAt: Date.now() - 1,
    }));
    expect((await host.query(api.subscriptions.currentAccountSummary, {})).introOfferEligible).toBe(false);
  });

  it("signs Apple's eligibility JWS from Kouchd's answer, and answers null when signing is not configured", async () => {
    const { t, host, account } = await hostWithStay();
    await expect(host.action(api.introOffer.signEligibility, {
      productId: "kouchd_plus_yearly", appTransactionId: "2000000123456789",
    })).resolves.toEqual({ eligible: null });

    const { pem, publicKey } = await generatePem();
    Object.assign(process.env, {
      APP_STORE_IAP_KEY_ID: "KEY123",
      APP_STORE_IAP_ISSUER_ID: "issuer-uuid",
      APP_STORE_BUNDLE_ID: "com.wrelik.kouchd",
      APP_STORE_IAP_PRIVATE_KEY: pem.replace(/\n/g, "\\n"),
    });
    const fresh = await host.action(api.introOffer.signEligibility, {
      productId: "kouchd_plus_yearly", appTransactionId: "2000000123456789",
    });
    expect(fresh.eligible).toBe(true);
    const [header, payload, signature] = fresh.jws!.split(".");
    expect(decodePart(header)).toEqual({ alg: "ES256", kid: "KEY123", typ: "JWT" });
    expect(decodePart(payload)).toMatchObject({
      iss: "issuer-uuid",
      aud: "introductory-offer-eligibility",
      bid: "com.wrelik.kouchd",
      productId: "kouchd_plus_yearly",
      allowIntroductoryOffer: true,
      transactionId: "2000000123456789",
      nonce: expect.any(String),
      iat: expect.any(Number),
    });
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" }, publicKey,
      Buffer.from(signature, "base64url"), new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(valid).toBe(true);

    const monthly = await host.action(api.introOffer.signEligibility, {
      productId: "kouchd_plus_monthly", appTransactionId: "2000000123456789",
    });
    expect(monthly.eligible).toBe(false);
    expect(decodePart(monthly.jws!.split(".")[1])).toMatchObject({
      productId: "kouchd_plus_monthly",
      allowIntroductoryOffer: false,
    });

    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, trialEvent(account));
    const used = await host.action(api.introOffer.signEligibility, {
      productId: "kouchd_plus_yearly", appTransactionId: "2000000123456789",
    });
    expect(used.eligible).toBe(false);
    expect(decodePart(used.jws!.split(".")[1]).allowIntroductoryOffer).toBe(false);
  });

  it("refuses guests and unknown products", async () => {
    const { t, host, stayId } = await hostWithStay();
    const code = (await host.query(api.stays.getBundle, { stayId })).stay.referralCode!;
    const guest = t.withIdentity({ subject: "guest", name: "Guest" });
    await guest.mutation(api.users.syncCurrent, {});
    await guest.mutation(api.referral.joinWithCode, { referralCode: code });
    await expect(guest.action(api.introOffer.signEligibility, { productId: "kouchd_plus_yearly" }))
      .rejects.toThrow("Only a host");
    await expect(host.action(api.introOffer.signEligibility, { productId: "other" }))
      .rejects.toThrow("Unknown");
  });

  it("reads signing config only when every value is present", () => {
    expect(readIntroOfferSigningConfig({ APP_STORE_IAP_KEY_ID: "k" })).toBeNull();
    expect(readIntroOfferSigningConfig({
      APP_STORE_IAP_KEY_ID: "k", APP_STORE_IAP_ISSUER_ID: "i", APP_STORE_BUNDLE_ID: "b",
      APP_STORE_IAP_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
    })?.privateKeyPem).toContain("\nabc\n");
  });

  it("produces a stable signature input for fixed claims", async () => {
    const { pem } = await generatePem();
    const jws = await createIntroOfferEligibilityJws(
      { keyId: "K", issuerId: "I", bundleId: "B", privateKeyPem: pem },
      { productId: "kouchd_plus_yearly", allowIntroductoryOffer: false, transactionId: "1" },
      { nowMs: 1_800_000_000_000, nonce: "n" },
    );
    expect(decodePart(jws.split(".")[1])).toEqual({
      iss: "I", iat: 1_800_000_000, aud: "introductory-offer-eligibility", bid: "B", nonce: "n",
      productId: "kouchd_plus_yearly", allowIntroductoryOffer: false, transactionId: "1",
    });
  });
});

describe("trial-ending reminder email", () => {
  // Knock must be unconfigured so delivery is deterministic, even on CI hosts
  // (like Vercel) that have a real KNOCK_API_KEY in their environment.
  beforeEach(() => { vi.stubEnv("KNOCK_API_KEY", ""); });
  afterEach(() => { vi.unstubAllEnvs(); });

  async function reminderEvents(t: ReturnType<typeof convexTest>) {
    return t.run(async ({ db }) =>
      (await db.query("notificationEvents").collect()).filter((row) => row.workflow === "plus-trial-ending"));
  }

  it("emails the host 2 days before the trial ends", async () => {
    vi.useFakeTimers();
    const { t, account } = await hostWithStay();
    await t.mutation(internal.subscriptions.recordProviderSnapshotEvent, trialEvent(account));
    vi.advanceTimersByTime(4 * DAY);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const events = await reminderEvents(t);
    expect(events).toHaveLength(1);
    // Knock is not configured in tests, so delivery is recorded as skipped.
    expect(events[0]).toMatchObject({ status: "skipped", entityId: expect.stringMatching(/^plus-trial:/) });
  });

  it("sends nothing when the host turned the reminder off or cancelled the trial", async () => {
    vi.useFakeTimers();
    const optedOut = await hostWithStay();
    await optedOut.host.mutation(api.subscriptions.setTrialReminder, { enabled: false });
    expect((await optedOut.host.query(api.subscriptions.currentAccountSummary, {})).trialReminderEnabled).toBe(false);
    await optedOut.t.mutation(internal.subscriptions.recordProviderSnapshotEvent, trialEvent(optedOut.account));
    await optedOut.t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await reminderEvents(optedOut.t)).toHaveLength(0);

    const cancelled = await hostWithStay();
    await cancelled.t.mutation(internal.subscriptions.recordProviderSnapshotEvent, trialEvent(cancelled.account));
    await cancelled.t.mutation(internal.subscriptions.recordProviderSnapshotEvent, trialEvent(cancelled.account, {
      providerEventId: "cancel", eventType: "CANCELLATION", status: "canceled", willRenew: false,
      occurredAt: Date.now() + 1,
    }));
    await cancelled.t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await reminderEvents(cancelled.t)).toHaveLength(0);
  });
});
