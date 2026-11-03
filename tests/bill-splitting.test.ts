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

async function setBillSplittingFlag(
  t: ReturnType<typeof convexTest>,
  override: "enabled" | "disabled",
) {
  await t.run(async ({ db }) => {
    const flags = await db.query("featureFlags").collect();
    const existing = flags.find((f) => f.key === FEATURE_FLAGS.BILL_SPLITTING);
    if (existing) {
      await db.patch(existing._id, { override, updatedAt: Date.now() });
    } else {
      await db.insert("featureFlags", {
        key: FEATURE_FLAGS.BILL_SPLITTING,
        override,
        updatedAt: Date.now(),
      });
    }
  });
}

async function setupHouseholdWithGuests(
  t: ReturnType<typeof convexTest>,
  options: { plus?: boolean; guestCount?: 1 | 2 } = {},
) {
  const { plus = true, guestCount = 2 } = options;
  process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
  await setBillSplittingFlag(t, "enabled");

  const host = t.withIdentity({
    subject: "bill-host",
    name: "Dana Host",
    email: "dana@example.com",
  });
  const guestA = t.withIdentity({
    subject: "bill-guest-a",
    name: "Alex Guest",
    email: "alex@example.com",
  });
  const guestB = t.withIdentity({
    subject: "bill-guest-b",
    name: "Blair Guest",
    email: "blair@example.com",
  });

  const hostUserId = await host.mutation(api.users.syncCurrent, {});
  const guestAUserId = await guestA.mutation(api.users.syncCurrent, {});
  const guestBUserId = await guestB.mutation(api.users.syncCurrent, {});

  const stayId = await host.mutation(api.stays.create, {
    timezone: "America/New_York",
    name: "Cedar House",
    terms: sampleTerms,
  });

  if (plus) {
    await grantPlus(t, stayId);
  }

  const hashA = "a".repeat(64);
  await host.mutation(api.invites.create, {
    stayId,
    tokenHash: hashA,
    expiresAt: Date.now() + 86_400_000,
  });
  await guestA.mutation(api.invites.accept, { tokenHash: hashA });
  await guestA.mutation(api.terms.acceptCurrent, { stayId });

  if (guestCount === 2) {
    const hashB = "b".repeat(64);
    await host.mutation(api.invites.create, {
      stayId,
      tokenHash: hashB,
      expiresAt: Date.now() + 86_400_000,
    });
    await guestB.mutation(api.invites.accept, { tokenHash: hashB });
    await guestB.mutation(api.terms.acceptCurrent, { stayId });
  }

  return {
    host,
    guestA,
    guestB,
    hostUserId,
    guestAUserId,
    guestBUserId,
    stayId,
  };
}

describe("Task 3: Schema, convex/bills.ts, and voidAdhocCharge guard", () => {
  it("blocks a Free host on bills.create with plan_limit and lets a Plus host create a bill whose shares appear on each guest's ledger", async () => {
    const t = convexTest(schema, modules);
    const { host, guestA, guestAUserId, stayId } = await setupHouseholdWithGuests(t, {
      plus: false,
      guestCount: 1,
    });

    let freeErr: unknown;
    try {
      await host.mutation(api.bills.create, {
        stayId,
        title: "October Electricity",
        category: "electricity",
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-31",
        totalCents: 12_000,
        dueDate: "2026-10-25",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [{ guestUserId: guestAUserId }],
      });
    } catch (err) {
      freeErr = err;
    }
    expect(planLimitError(freeErr)).toMatchObject({
      code: "plan_limit",
      dimension: "billSplits",
      plan: "free",
      limit: 0,
      atHighestPlan: false,
    });

    await grantPlus(t, stayId);

    const billId = await host.mutation(api.bills.create, {
      stayId,
      title: "October Electricity",
      category: "electricity",
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-31",
      totalCents: 12_000,
      dueDate: "2026-10-25",
      splitMethod: "equal",
      includeHost: true,
      prorateByStayDates: false,
      guests: [{ guestUserId: guestAUserId }],
    });
    expect(billId).toBeDefined();

    const guestLedger = await guestA.query(api.obligations.list, {
      stayId,
      asOfDate: "2026-10-20",
    });
    const billObligation = guestLedger.find((item) => item.title === "October Electricity");
    expect(billObligation).toBeDefined();
    expect(billObligation).toMatchObject({
      type: "adhoc",
      title: "October Electricity",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      dueDate: "2026-10-25",
      baseAmountCents: 6_000,
    });
  });

  it("keeps existing bills and ledger obligations visible when Plus expires after posting, while refusing new bills.create", async () => {
    const t = convexTest(schema, modules);
    const { host, guestA, guestB, guestAUserId, guestBUserId, stayId } =
      await setupHouseholdWithGuests(t, { plus: true, guestCount: 2 });

    const billId = await host.mutation(api.bills.create, {
      stayId,
      title: "Fiber Internet",
      category: "internet",
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-31",
      totalCents: 9_000,
      dueDate: "2026-10-20",
      splitMethod: "equal",
      includeHost: true,
      prorateByStayDates: false,
      guests: [{ guestUserId: guestAUserId }, { guestUserId: guestBUserId }],
    });

    // Expire the Plus subscription snapshot
    await t.run(async ({ db }) => {
      const snapshots = await db.query("subscriptionSnapshots").collect();
      const past = Date.now() - 86_400_000;
      for (const snap of snapshots) {
        await db.patch(snap._id, {
          status: "expired",
          currentPeriodEndsAt: past,
          updatedAt: Date.now(),
        });
      }
    });

    // Existing bills and obligations remain visible to host and guests
    const hostBills = await host.query(api.bills.list, { stayId });
    expect(hostBills).toHaveLength(1);
    expect(hostBills[0]._id).toBe(billId);
    expect(hostBills[0].shares).toHaveLength(2);

    const guestABills = await guestA.query(api.bills.list, { stayId });
    expect(guestABills).toHaveLength(1);
    expect(guestABills[0].shares).toHaveLength(1);
    expect(guestABills[0].shares[0].amountCents).toBe(3_000);

    const guestALedger = await guestA.query(api.obligations.list, {
      stayId,
      asOfDate: "2026-10-15",
    });
    expect(guestALedger.some((item) => item.title === "Fiber Internet" && item.baseAmountCents === 3_000)).toBe(true);

    const guestBLedger = await guestB.query(api.obligations.list, {
      stayId,
      asOfDate: "2026-10-15",
    });
    expect(guestBLedger.some((item) => item.title === "Fiber Internet" && item.baseAmountCents === 3_000)).toBe(true);

    // Creating a new bill is now refused with plan_limit
    let expiredErr: unknown;
    try {
      await host.mutation(api.bills.create, {
        stayId,
        title: "November Water",
        category: "water",
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-31",
        totalCents: 6_000,
        dueDate: "2026-10-28",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [{ guestUserId: guestAUserId }],
      });
    } catch (err) {
      expiredErr = err;
    }
    expect(planLimitError(expiredErr)).toMatchObject({
      code: "plan_limit",
      dimension: "billSplits",
      plan: "free",
    });
  });

  it("enforces guest privacy on bills.list so Guest A sees only Guest A's share and never Guest B's share or user ID", async () => {
    const t = convexTest(schema, modules);
    const { host, guestA, guestAUserId, guestBUserId, stayId } =
      await setupHouseholdWithGuests(t, { plus: true, guestCount: 2 });

    await host.mutation(api.bills.create, {
      stayId,
      title: "Water & Sewer",
      category: "water",
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-31",
      totalCents: 10_000,
      dueDate: "2026-10-22",
      splitMethod: "percentage",
      includeHost: true,
      prorateByStayDates: false,
      guests: [
        { guestUserId: guestAUserId, input: 30 },
        { guestUserId: guestBUserId, input: 45 },
      ],
    });

    // Bill that only includes Guest B
    await host.mutation(api.bills.create, {
      stayId,
      title: "Parking Pass Utility",
      category: "other",
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-31",
      totalCents: 4_000,
      dueDate: "2026-10-24",
      splitMethod: "fixed",
      includeHost: false,
      prorateByStayDates: false,
      guests: [{ guestUserId: guestBUserId, input: 4_000 }],
    });

    const guestAResponse = await guestA.query(api.bills.list, { stayId });
    expect(guestAResponse).toHaveLength(1);
    const billForA = guestAResponse[0];
    expect(billForA).toMatchObject({
      title: "Water & Sewer",
      category: "water",
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-31",
      totalCents: 10_000,
      dueDate: "2026-10-22",
      splitMethod: "percentage",
      includeHost: true,
      prorateByStayDates: false,
    });
    expect(billForA.shares).toHaveLength(1);
    expect(billForA.shares[0]).toMatchObject({
      guestUserId: guestAUserId,
      guestName: "Alex Guest",
      input: 30,
      amountCents: 3_000,
    });

    const serializedForA = JSON.stringify(guestAResponse);
    expect(serializedForA).not.toContain(guestBUserId);
    expect(serializedForA).not.toContain("Blair Guest");
    expect(serializedForA).not.toContain("4500");

    // Host sees both bills and all shares
    const hostResponse = await host.query(api.bills.list, { stayId });
    expect(hostResponse).toHaveLength(2);
    const hostWaterBill = hostResponse.find((b) => b.title === "Water & Sewer")!;
    expect(hostWaterBill.shares).toHaveLength(2);
  });

  it("refuses direct obligations.voidAdhocCharge on a bill obligation and voids the bill + all guest obligations via bills.voidBill", async () => {
    const t = convexTest(schema, modules);
    const { host, guestA, guestB, guestAUserId, guestBUserId, stayId } =
      await setupHouseholdWithGuests(t, { plus: true, guestCount: 2 });

    const billId = await host.mutation(api.bills.create, {
      stayId,
      title: "Gas Heating",
      category: "gas",
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-31",
      totalCents: 9_000,
      dueDate: "2026-10-25",
      splitMethod: "equal",
      includeHost: true,
      prorateByStayDates: false,
      guests: [{ guestUserId: guestAUserId }, { guestUserId: guestBUserId }],
    });

    const hostBills = await host.query(api.bills.list, { stayId });
    const bill = hostBills.find((b) => b._id === billId)!;
    expect(bill.shares).toHaveLength(2);

    const shareObligationId = bill.shares[0].obligationId;
    await expect(
      host.mutation(api.obligations.voidAdhocCharge, {
        obligationId: shareObligationId,
      }),
    ).rejects.toThrow("This charge comes from a split bill. Void the bill to void its charges.");

    // Void the bill and verify all guest obligations are voided and removed from active ledger totals
    await host.mutation(api.bills.voidBill, { billId });

    const updatedBills = await host.query(api.bills.list, { stayId });
    expect(updatedBills[0].voidedAt).toEqual(expect.any(Number));

    const ledgerA = await guestA.query(api.obligations.ledgerWithTotals, {
      stayId,
      asOfDate: "2026-10-20",
    });
    expect(ledgerA.rows.some((r) => r._id === bill.shares[0].obligationId)).toBe(false);
    expect(ledgerA.rows.some((r) => r.title === "Gas Heating")).toBe(false);

    const ledgerB = await guestB.query(api.obligations.ledgerWithTotals, {
      stayId,
      asOfDate: "2026-10-20",
    });
    expect(ledgerB.rows.some((r) => r._id === bill.shares[1].obligationId)).toBe(false);
    expect(ledgerB.rows.some((r) => r.title === "Gas Heating")).toBe(false);
  });

  it("enforces the FEATURE_FLAGS.BILL_SPLITTING kill switch across create, voidBill, and list", async () => {
    const t = convexTest(schema, modules);
    const { host, guestA, guestAUserId, stayId } = await setupHouseholdWithGuests(t, {
      plus: true,
      guestCount: 1,
    });

    const billId = await host.mutation(api.bills.create, {
      stayId,
      title: "Trash Collection",
      category: "trash",
      serviceStart: "2026-10-01",
      serviceEnd: "2026-10-31",
      totalCents: 4_000,
      dueDate: "2026-10-25",
      splitMethod: "equal",
      includeHost: true,
      prorateByStayDates: false,
      guests: [{ guestUserId: guestAUserId }],
    });

    await setBillSplittingFlag(t, "disabled");

    await expect(
      host.mutation(api.bills.create, {
        stayId,
        title: "Blocked Bill",
        category: "other",
        serviceStart: "2026-10-01",
        serviceEnd: "2026-10-31",
        totalCents: 4_000,
        dueDate: "2026-10-25",
        splitMethod: "equal",
        includeHost: true,
        prorateByStayDates: false,
        guests: [{ guestUserId: guestAUserId }],
      }),
    ).rejects.toThrow("Bill splitting is currently disabled by platform policy.");

    await expect(
      host.mutation(api.bills.voidBill, { billId }),
    ).rejects.toThrow("Bill splitting is currently disabled by platform policy.");

    await expect(host.query(api.bills.list, { stayId })).resolves.toEqual([]);
    await expect(guestA.query(api.bills.list, { stayId })).resolves.toEqual([]);
  });
});
