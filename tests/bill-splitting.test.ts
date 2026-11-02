import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import { assertPlanCapability } from "../convex/lib/planCapacity";
import schema from "../convex/schema";
import { getPlanCapabilities } from "../lib/domain/subscriptionPlans";
import { FEATURE_FLAGS, FEATURE_FLAGS_REGISTRY } from "../lib/flags/config";
import { planLimitError } from "../lib/planLimitError";
import { grantPlus } from "./helpers/plans";

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
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Quiet hours after 10 PM.",
};

afterEach(() => {
  delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
});

describe("Task 1: Plan capabilities, feature flag, and server capability guard", () => {
  it("defines billSplits and subleases capabilities across plans", () => {
    expect(getPlanCapabilities("starter").billSplits).toBe(false);
    expect(getPlanCapabilities("hostPlus").billSplits).toBe(true);
    expect(getPlanCapabilities("householdPro").billSplits).toBe(true);

    expect(getPlanCapabilities("starter").subleases).toBe(false);
    expect(getPlanCapabilities("hostPlus").subleases).toBe(true);
    expect(getPlanCapabilities("householdPro").subleases).toBe(true);
  });

  it("registers FEATURE_FLAGS.BILL_SPLITTING in household category with defaultValue false", () => {
    expect(FEATURE_FLAGS.BILL_SPLITTING).toBe("feature_bill_splitting");
    expect(FEATURE_FLAGS_REGISTRY[FEATURE_FLAGS.BILL_SPLITTING]).toMatchObject({
      key: "feature_bill_splitting",
      category: "household",
      defaultValue: false,
    });
  });

  it("throws ConvexError plan_limit for Free host on billSplits and subleases and parses via planLimitError", async () => {
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "free-host", name: "Free Host", email: "free@example.com" });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Oak House",
      terms: sampleTerms,
    });

    await t.run(async (ctx) => {
      const stay = (await ctx.db.get(stayId))!;
      let billErr: unknown;
      try {
        await assertPlanCapability(ctx, stay.hostUserId, "billSplits", stay.householdAccountId);
      } catch (err) {
        billErr = err;
      }
      expect(billErr).toBeInstanceOf(ConvexError);
      expect(planLimitError(billErr)).toEqual({
        code: "plan_limit",
        dimension: "billSplits",
        plan: "free",
        limit: 0,
        atHighestPlan: false,
        message: "Splitting household bills is included with Plus. Move to Plus to split bills across guests.",
      });

      let subleaseErr: unknown;
      try {
        await assertPlanCapability(ctx, stay.hostUserId, "subleases", stay.householdAccountId);
      } catch (err) {
        subleaseErr = err;
      }
      expect(subleaseErr).toBeInstanceOf(ConvexError);
      expect(planLimitError(subleaseErr)).toEqual({
        code: "plan_limit",
        dimension: "subleases",
        plan: "free",
        limit: 0,
        atHighestPlan: false,
        message: "Subleases are included with Plus. Move to Plus to set up a sublease.",
      });
    });
  });

  it("refuses with 'Host plan limits are being configured' when SUBSCRIPTION_EXPECTED_ENVIRONMENT is unset and stay has householdAccountId", async () => {
    delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "unconfigured-host", name: "Host", email: "unconfigured@example.com" });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Maple House",
      terms: sampleTerms,
    });

    await t.run(async (ctx) => {
      const stay = (await ctx.db.get(stayId))!;
      expect(stay.householdAccountId).toBeDefined();
      await expect(
        assertPlanCapability(ctx, stay.hostUserId, "billSplits", stay.householdAccountId),
      ).rejects.toThrow("Host plan limits are being configured");
      await expect(
        assertPlanCapability(ctx, stay.hostUserId, "subleases", stay.householdAccountId),
      ).rejects.toThrow("Host plan limits are being configured");
    });
  });

  it("resolves without throwing for a Plus host", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "plus-host", name: "Plus Host", email: "plus@example.com" });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      name: "Pine House",
      terms: sampleTerms,
    });
    await grantPlus(t, stayId);

    await t.run(async (ctx) => {
      const stay = (await ctx.db.get(stayId))!;
      await expect(
        assertPlanCapability(ctx, stay.hostUserId, "billSplits", stay.householdAccountId),
      ).resolves.toBeUndefined();
      await expect(
        assertPlanCapability(ctx, stay.hostUserId, "subleases", stay.householdAccountId),
      ).resolves.toBeUndefined();
    });
  });
});
