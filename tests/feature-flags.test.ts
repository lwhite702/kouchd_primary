import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { isFeatureEnabled } from "../convex/flags";
import { FEATURE_FLAGS, FEATURE_FLAGS_REGISTRY, ALL_FEATURE_FLAGS } from "../lib/flags/config";
import { getLocalDevOverride, setLocalDevOverride } from "../lib/flags/client";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const sampleTerms = {
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  cadence: "weekly" as const,
  paymentDayOfWeek: 1,
  rateCents: 20_000,
  earlyDiscountEnabled: true,
  earlyDiscountPercentage: 5,
  earlyDiscountDays: 2,
  lateFeeEnabled: true,
  lateFeeCents: 1_500,
  graceDays: 2,
  houseNotes: "Quiet hours after 10 PM.",
};

async function createAdminUser(t: ReturnType<typeof convexTest>, email: string) {
  const admin = t.withIdentity({
    subject: "admin-operator",
    name: "Admin Operator",
    email,
  });
  await admin.mutation(api.users.syncCurrent, { clerkName: "Admin Operator", email });
  return admin;
}

async function createStandardUser(t: ReturnType<typeof convexTest>, subject: string, name: string) {
  const user = t.withIdentity({
    subject,
    name,
    email: `${subject}@example.com`,
  });
  await user.mutation(api.users.syncCurrent, { clerkName: name, email: `${subject}@example.com` });
  return user;
}

describe("Feature Flags Registry & Types", () => {
  it("defines all canonical feature flags with valid metadata", () => {
    expect(ALL_FEATURE_FLAGS.length).toBeGreaterThanOrEqual(14);

    for (const flag of ALL_FEATURE_FLAGS) {
      expect(flag.key).toBeTruthy();
      expect(flag.label).toBeTruthy();
      expect(flag.description).toBeTruthy();
      expect(typeof flag.defaultValue).toBe("boolean");
      expect(["household", "core", "onboarding", "monetization", "messaging"]).toContain(flag.category);
    }
  });

  it("has correct baseline defaults for initial release and roadmap features", () => {
    // Household
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.SHOPPING_LIST].defaultValue).toBe(true);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.CHECK_IN_BOARD].defaultValue).toBe(true);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.REWARDS_SYSTEM].defaultValue).toBe(true);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.HOUSEHOLD_ANNOUNCEMENTS].defaultValue).toBe(true);

    // Onboarding
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.GUIDED_TOUR].defaultValue).toBe(true);

    // Messaging
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.SMS_REMINDERS].defaultValue).toBe(true);

    // Roadmap launch features (controlled in progress)
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.FLEXIBLE_PAYMENT_SCHEDULES].defaultValue).toBe(false);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.RECORDED_OVERNIGHTS].defaultValue).toBe(false);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.MULTI_STAY_MANAGEMENT].defaultValue).toBe(true);

    // RevenueCat & Monetization
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.BILLING_PORTAL].defaultValue).toBe(false);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.REVENUECAT_PAYWALL].defaultValue).toBe(false);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.KOUCHD_PLUS_ENTITLEMENT].defaultValue).toBe(false);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.CUSTOMER_CENTER].defaultValue).toBe(true);
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.KOUCHD_PLUS_TRIAL].defaultValue).toBe(false);
  });
});

describe("Client Developer / QA Overrides", () => {
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map();
    (globalThis as unknown as { window: unknown }).window = {
      location: { search: "" },
      localStorage: {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => mockStorage.set(k, String(v)),
        removeItem: (k: string) => mockStorage.delete(k),
        clear: () => mockStorage.clear(),
      },
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("returns null when no URL or localStorage override is set", () => {
    expect(getLocalDevOverride(FEATURE_FLAGS.SHOPPING_LIST)).toBeNull();
  });

  it("evaluates URL query parameter override (?flag:key=false or true)", () => {
    const win = (globalThis as unknown as { window: { location: { search: string } } }).window;
    win.location.search = `?flag:${FEATURE_FLAGS.SHOPPING_LIST}=false`;
    expect(getLocalDevOverride(FEATURE_FLAGS.SHOPPING_LIST)).toBe(false);

    win.location.search = `?flag:${FEATURE_FLAGS.SHOPPING_LIST}=true`;
    expect(getLocalDevOverride(FEATURE_FLAGS.SHOPPING_LIST)).toBe(true);
  });

  it("evaluates localStorage override when set", () => {
    setLocalDevOverride(FEATURE_FLAGS.BILLING_PORTAL, true);
    expect(getLocalDevOverride(FEATURE_FLAGS.BILLING_PORTAL)).toBe(true);

    setLocalDevOverride(FEATURE_FLAGS.BILLING_PORTAL, null);
    expect(getLocalDevOverride(FEATURE_FLAGS.BILLING_PORTAL)).toBeNull();
  });
});

describe("Convex Feature Flag Backend Evaluation & Overrides", () => {
  const adminEmail = "operator@kouchd.com";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, PLATFORM_ADMIN_EMAILS: adminEmail };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to code default when no database override exists", async () => {
    const t = convexTest(schema, modules);

    const shoppingEnabled = await t.run(async (ctx) => {
      return await isFeatureEnabled(ctx, FEATURE_FLAGS.SHOPPING_LIST);
    });
    expect(shoppingEnabled).toBe(true);

    const billingEnabled = await t.run(async (ctx) => {
      return await isFeatureEnabled(ctx, FEATURE_FLAGS.BILLING_PORTAL);
    });
    expect(billingEnabled).toBe(false);
  });

  it("enforces emergency kill-switch when set to disabled in database", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAdminUser(t, adminEmail);

    // Set kill switch on shopping list
    await admin.mutation(api.flags.setOverride, {
      key: FEATURE_FLAGS.SHOPPING_LIST,
      override: "disabled",
      note: "Emergency kill-switch activated",
    });

    // Check evaluation
    const shoppingEnabled = await t.run(async (ctx) => {
      return await isFeatureEnabled(ctx, FEATURE_FLAGS.SHOPPING_LIST);
    });
    expect(shoppingEnabled).toBe(false);

    // List query reflects override
    const all = await t.query(api.flags.list, {});
    const match = all.find((entry: { key: string }) => entry.key === FEATURE_FLAGS.SHOPPING_LIST);
    expect(match?.override).toBe("disabled");
  });

  it("reverts override back to default when set to 'default'", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAdminUser(t, adminEmail);

    // First force billing ON
    await admin.mutation(api.flags.setOverride, {
      key: FEATURE_FLAGS.BILLING_PORTAL,
      override: "enabled",
    });

    let billingEnabled = await t.run(async (ctx) => {
      return await isFeatureEnabled(ctx, FEATURE_FLAGS.BILLING_PORTAL);
    });
    expect(billingEnabled).toBe(true);

    // Now reset billing back to default
    await admin.mutation(api.flags.setOverride, {
      key: FEATURE_FLAGS.BILLING_PORTAL,
      override: "default",
    });

    billingEnabled = await t.run(async (ctx) => {
      return await isFeatureEnabled(ctx, FEATURE_FLAGS.BILLING_PORTAL);
    });
    // Default for billing is false
    expect(billingEnabled).toBe(false);
  });

  it("rejects non-admin users from setting or resetting overrides", async () => {
    const t = convexTest(schema, modules);
    const user = await createStandardUser(t, "guest-user", "Guest User");

    await expect(
      user.mutation(api.flags.setOverride, {
        key: FEATURE_FLAGS.SHOPPING_LIST,
        override: "disabled",
      })
    ).rejects.toThrow(/Platform admin grant required/i);

    await expect(user.mutation(api.flags.resetOverrides, {})).rejects.toThrow(
      /Platform admin grant required/i
    );
  });

  it("resets all overrides in batch via resetOverrides mutation", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAdminUser(t, adminEmail);

    await admin.mutation(api.flags.setOverride, {
      key: FEATURE_FLAGS.SHOPPING_LIST,
      override: "disabled",
    });
    await admin.mutation(api.flags.setOverride, {
      key: FEATURE_FLAGS.BILLING_PORTAL,
      override: "enabled",
    });

    let all = await t.query(api.flags.list, {});
    expect(all.length).toBe(2);

    const result = await admin.mutation(api.flags.resetOverrides, {});
    expect(result.cleared).toBe(2);

    all = await t.query(api.flags.list, {});
    expect(all.length).toBe(0);
  });
});

describe("Backend Mutation Gating via Feature Flags", () => {
  const adminEmail = "operator@kouchd.com";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, PLATFORM_ADMIN_EMAILS: adminEmail };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("blocks checkIns.create when feature_check_in_board is disabled", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAdminUser(t, adminEmail);

    // Seed host user and stay
    const hostUser = await createStandardUser(t, "host-clerk-1", "Host One");
    const stayId = await hostUser.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Maple House",
      terms: sampleTerms,
    });

    // Disable check-in board via platform admin
    await admin.mutation(api.flags.setOverride, {
      key: FEATURE_FLAGS.CHECK_IN_BOARD,
      override: "disabled",
    });

    // Attempt to create check-in should be rejected
    await expect(
      hostUser.mutation(api.checkIns.create, {
        stayId,
        checkInDate: "2026-10-15",
        topic: "Weekly sync",
        note: "Checking in on the quiet hours.",
      })
    ).rejects.toThrow(/disabled by platform policy/i);
  });

  it("blocks shopping.create when feature_shopping_list is disabled", async () => {
    const t = convexTest(schema, modules);
    const admin = await createAdminUser(t, adminEmail);

    const hostUser = await createStandardUser(t, "host-clerk-2", "Host Two");
    const stayId = await hostUser.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Pine Villa",
      terms: sampleTerms,
    });

    // Disable shopping list
    await admin.mutation(api.flags.setOverride, {
      key: FEATURE_FLAGS.SHOPPING_LIST,
      override: "disabled",
    });

    // Attempt to add item should be rejected
    await expect(
      hostUser.mutation(api.shopping.create, {
        stayId,
        title: "Paper towels",
        quantity: "2 packs",
        note: "Kitchen counter",
        visibility: "shared",
      })
    ).rejects.toThrow(/disabled by platform policy/i);
  });
});
