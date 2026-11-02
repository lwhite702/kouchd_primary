import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { afterEach, describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import { assertPlanCapability } from "../convex/lib/planCapacity";
import schema from "../convex/schema";
import { getPlanCapabilities } from "../lib/domain/subscriptionPlans";
import { calculateBillShares } from "../lib/domain/billSplitting";
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

describe("Task 2: Pure bill-splitting & proration calculation", () => {
  it("distributes equal split with host excluded across 3 guests with leftover cent to earliest joinedAt", () => {
    const shares = calculateBillShares({
      totalCents: 1000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "equal",
      includeHost: false,
      prorateByStayDates: false,
      guests: [
        { guestUserId: "guest-b", joinedAt: 200, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
        { guestUserId: "guest-c", joinedAt: 300, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
      ],
    });

    const byGuest = Object.fromEntries(shares.map((s) => [s.guestUserId, s.amountCents]));
    expect(byGuest).toEqual({
      "guest-a": 334,
      "guest-b": 333,
      "guest-c": 333,
    });
    expect(shares.reduce((sum, s) => sum + s.amountCents, 0)).toBe(1000);
  });

  it("distributes equal split with host included across host + 2 guests so each guest gets 333 cents", () => {
    const shares = calculateBillShares({
      totalCents: 1000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "equal",
      includeHost: true,
      prorateByStayDates: false,
      guests: [
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
        { guestUserId: "guest-b", joinedAt: 200, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
      ],
    });

    const byGuest = Object.fromEntries(shares.map((s) => [s.guestUserId, s.amountCents]));
    expect(byGuest).toEqual({
      "guest-a": 333,
      "guest-b": 333,
    });
    expect(shares.reduce((sum, s) => sum + s.amountCents, 0)).toBeLessThanOrEqual(1000);
  });

  it("produces deterministic results independent of guest input order and breaks joinedAt ties by lexical guestUserId", () => {
    const order1 = calculateBillShares({
      totalCents: 1000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "equal",
      includeHost: false,
      prorateByStayDates: false,
      guests: [
        { guestUserId: "guest-z", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
        { guestUserId: "guest-m", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
      ],
    });
    const order2 = calculateBillShares({
      totalCents: 1000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "equal",
      includeHost: false,
      prorateByStayDates: false,
      guests: [
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
        { guestUserId: "guest-m", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
        { guestUserId: "guest-z", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30" },
      ],
    });

    const map1 = Object.fromEntries(order1.map((s) => [s.guestUserId, s.amountCents]));
    const map2 = Object.fromEntries(order2.map((s) => [s.guestUserId, s.amountCents]));
    expect(map1).toEqual(map2);
    expect(map1).toEqual({
      "guest-a": 334,
      "guest-m": 333,
      "guest-z": 333,
    });
  });

  it("handles percentage split with host excluded and largest remainder rounding", () => {
    const thirds = calculateBillShares({
      totalCents: 1000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "percentage",
      includeHost: false,
      prorateByStayDates: false,
      guests: [
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 33.33 },
        { guestUserId: "guest-b", joinedAt: 200, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 33.33 },
        { guestUserId: "guest-c", joinedAt: 300, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 33.34 },
      ],
    });
    expect(Object.fromEntries(thirds.map((s) => [s.guestUserId, s.amountCents]))).toEqual({
      "guest-a": 333,
      "guest-b": 333,
      "guest-c": 334,
    });

    const halves = calculateBillShares({
      totalCents: 1001,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "percentage",
      includeHost: false,
      prorateByStayDates: false,
      guests: [
        { guestUserId: "guest-b", joinedAt: 200, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 50 },
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 50 },
      ],
    });
    expect(Object.fromEntries(halves.map((s) => [s.guestUserId, s.amountCents]))).toEqual({
      "guest-a": 501,
      "guest-b": 500,
    });
  });

  it("handles percentage split with host included and validates percentage bounds", () => {
    const shares = calculateBillShares({
      totalCents: 1001,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "percentage",
      includeHost: true,
      prorateByStayDates: false,
      guests: [
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 50 },
      ],
    });
    expect(shares).toHaveLength(1);
    expect([500, 501]).toContain(shares[0].amountCents);
    expect(shares[0].amountCents).toBeLessThanOrEqual(1001);

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "percentage",
        includeHost: false,
        prorateByStayDates: false,
        guests: [
          { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 60 },
        ],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "percentage",
        includeHost: true,
        prorateByStayDates: false,
        guests: [
          { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 60 },
          { guestUserId: "guest-b", joinedAt: 200, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 50 },
        ],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "percentage",
        includeHost: true,
        prorateByStayDates: false,
        guests: [
          { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: -5 },
        ],
      }),
    ).toThrow();
  });

  it("handles fixed split and rejects invalid fixed inputs", () => {
    const shares = calculateBillShares({
      totalCents: 1000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "fixed",
      includeHost: true,
      prorateByStayDates: false,
      guests: [
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 400 },
        { guestUserId: "guest-b", joinedAt: 200, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 350 },
      ],
    });
    expect(Object.fromEntries(shares.map((s) => [s.guestUserId, s.amountCents]))).toEqual({
      "guest-a": 400,
      "guest-b": 350,
    });

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "fixed",
        includeHost: true,
        prorateByStayDates: false,
        guests: [
          { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 600 },
          { guestUserId: "guest-b", joinedAt: 200, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 500 },
        ],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "fixed",
        includeHost: true,
        prorateByStayDates: false,
        guests: [
          { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 0 },
        ],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "fixed",
        includeHost: true,
        prorateByStayDates: false,
        guests: [
          { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-01", stayEndDate: "2026-10-30", input: 12.5 },
        ],
      }),
    ).toThrow();
  });

  it("prorates guest shares by stay-date overlap with the service window", () => {
    // Whole-place sublease preset: equal split, includeHost: false, 1 guest overlapping 15 of 30 days
    const wholePlace = calculateBillShares({
      totalCents: 10_000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "equal",
      includeHost: false,
      prorateByStayDates: true,
      guests: [
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-16", stayEndDate: "2026-10-30" },
      ],
    });
    expect(wholePlace).toEqual([
      {
        guestUserId: "guest-a",
        prorationDays: 15,
        amountCents: 5000,
      },
    ]);

    // Equal split with host included: 1 guest overlapping 15 of 30 days on 12000 cent bill -> 6000 * (15/30) = 3000
    const withHost = calculateBillShares({
      totalCents: 12_000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "equal",
      includeHost: true,
      prorateByStayDates: true,
      guests: [
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-16", stayEndDate: "2026-10-30" },
        { guestUserId: "guest-b", joinedAt: 200, stayStartDate: "2026-11-01", stayEndDate: "2026-11-15" },
      ],
    });
    // Note: 2 guests + host = 3 participants, or let's test 1 guest + host = 2 participants separately:
    const singleGuestWithHost = calculateBillShares({
      totalCents: 12_000,
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-30",
      splitMethod: "equal",
      includeHost: true,
      prorateByStayDates: true,
      guests: [
        { guestUserId: "guest-a", joinedAt: 100, stayStartDate: "2026-10-16", stayEndDate: "2026-10-30" },
      ],
    });
    expect(singleGuestWithHost).toEqual([
      {
        guestUserId: "guest-a",
        prorationDays: 15,
        amountCents: 3000,
      },
    ]);

    const zeroOverlap = withHost.find((s) => s.guestUserId === "guest-b")!;
    expect(zeroOverlap).toMatchObject({
      guestUserId: "guest-b",
      prorationDays: 0,
      amountCents: 0,
    });
  });

  it("validates dates, totalCents, empty guests, and duplicate guestUserId", () => {
    const validGuest = {
      guestUserId: "guest-a",
      joinedAt: 100,
      stayStartDate: "2026-10-01",
      stayEndDate: "2026-10-30",
    };

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-30",
        serviceEnd: "2026-10-01",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [validGuest],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 0,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [validGuest],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 100_000_001,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [validGuest],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 100.5,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [validGuest],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [],
      }),
    ).toThrow();

    expect(() =>
      calculateBillShares({
        totalCents: 1000,
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-30",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [validGuest, { ...validGuest, joinedAt: 200 }],
      }),
    ).toThrow();
  });
});
