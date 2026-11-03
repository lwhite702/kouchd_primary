import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../convex/_generated/api";
import { assertStayTerms } from "../convex/lib/validation";
import schema from "../convex/schema";
import {
  calendarMonthDueDate,
  calendarMonthEnd,
  daysInCalendarMonth,
} from "../lib/domain/dates";
import {
  buildObligationPeriods,
  calculateObligationLedger,
  type ObligationTerms,
} from "../lib/domain/obligations";
import { calculateStayChargeCents } from "../lib/domain/pricing";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const baseWeeklyTerms = {
  startDate: "2026-10-01",
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
  houseNotes: "Quiet hours after 10 PM.",
};

const baseSubleaseMonthlyTerms = {
  startDate: "2026-10-15",
  endDate: "2026-12-20",
  cadence: "monthly" as const,
  paymentDayOfMonth: 1,
  rateCents: 180_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Sublease rent due on the 1st of each month.",
};

async function createUser(
  t: ReturnType<typeof convexTest>,
  subject: string,
  name: string,
) {
  const actor = t.withIdentity({
    subject,
    name,
    email: `${subject}@example.com`,
  });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

afterEach(() => {
  vi.useRealTimers();
});

function makeMonthlyTerms(overrides: Partial<ObligationTerms> = {}): ObligationTerms {
  return {
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    cadence: "monthly",
    paymentDayOfMonth: 1,
    rateCents: 150_000,
    earlyDiscountEnabled: false,
    earlyDiscountPercentage: 0,
    earlyDiscountDays: 0,
    lateFeeEnabled: false,
    lateFeeCents: 0,
    graceDays: 5,
    ...overrides,
  };
}

describe("calendar month date helpers", () => {
  it("computes days in 28, 29, 30, and 31 day months", () => {
    expect(daysInCalendarMonth(2027, 2)).toBe(28);
    expect(daysInCalendarMonth(2028, 2)).toBe(29);
    expect(daysInCalendarMonth(2026, 11)).toBe(30);
    expect(daysInCalendarMonth(2026, 12)).toBe(31);
  });

  it("returns the UTC calendar month end date", () => {
    expect(calendarMonthEnd("2026-10-01")).toBe("2026-10-31");
    expect(calendarMonthEnd("2026-11-15")).toBe("2026-11-30");
    expect(calendarMonthEnd("2027-02-01")).toBe("2027-02-28");
    expect(calendarMonthEnd("2028-02-10")).toBe("2028-02-29");
  });

  it("computes the monthly due date and clamps to periodStart if already passed", () => {
    expect(calendarMonthDueDate("2026-10-01", 1)).toBe("2026-10-01");
    expect(calendarMonthDueDate("2026-10-01", 15)).toBe("2026-10-15");
    expect(calendarMonthDueDate("2026-10-15", 1)).toBe("2026-10-15");
    expect(calendarMonthDueDate("2026-10-05", 15)).toBe("2026-10-15");
    expect(calendarMonthDueDate("2027-02-01", 31)).toBe("2027-02-28");
  });
});

describe("monthly obligation period generation and proration", () => {
  it("generates full calendar months with paymentDayOfMonth 1 and 15", () => {
    const periodsDay1 = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        rateCents: 150_000,
        paymentDayOfMonth: 1,
      }),
    );
    expect(periodsDay1).toEqual([
      {
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        dueDate: "2026-10-01",
        baseAmountCents: 150_000,
      },
      {
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
        dueDate: "2026-11-01",
        baseAmountCents: 150_000,
      },
      {
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        dueDate: "2026-12-01",
        baseAmountCents: 150_000,
      },
    ]);

    const periodsDay15 = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        rateCents: 150_000,
        paymentDayOfMonth: 15,
      }),
    );
    expect(periodsDay15).toEqual([
      {
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        dueDate: "2026-10-15",
        baseAmountCents: 150_000,
      },
      {
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
        dueDate: "2026-11-15",
        baseAmountCents: 150_000,
      },
      {
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        dueDate: "2026-12-15",
        baseAmountCents: 150_000,
      },
    ]);
  });

  it("prorates a partial first month when startDate is after paymentDayOfMonth and clamps dueDate to startDate", () => {
    const periods = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2026-10-15",
        endDate: "2026-12-31",
        rateCents: 150_000,
        paymentDayOfMonth: 1,
      }),
    );
    // Oct 15..31 = 17 days in a 31-day month: Math.round((150000 * 17) / 31) = 82258
    expect(periods).toEqual([
      {
        periodStart: "2026-10-15",
        periodEnd: "2026-10-31",
        dueDate: "2026-10-15",
        baseAmountCents: 82_258,
      },
      {
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
        dueDate: "2026-11-01",
        baseAmountCents: 150_000,
      },
      {
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        dueDate: "2026-12-01",
        baseAmountCents: 150_000,
      },
    ]);
  });

  it("prorates a partial first month when startDate is before paymentDayOfMonth and keeps paymentDayOfMonth as dueDate", () => {
    const periods = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2026-10-05",
        endDate: "2026-11-30",
        rateCents: 150_000,
        paymentDayOfMonth: 15,
      }),
    );
    // Oct 5..31 = 27 days in a 31-day month: Math.round((150000 * 27) / 31) = 130645
    expect(periods).toEqual([
      {
        periodStart: "2026-10-05",
        periodEnd: "2026-10-31",
        dueDate: "2026-10-15",
        baseAmountCents: 130_645,
      },
      {
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
        dueDate: "2026-11-15",
        baseAmountCents: 150_000,
      },
    ]);
  });

  it("prorates partial last months accurately across 28, 29 (leap year), 30, and 31 day months", () => {
    // 28-day month: Feb 2027 (14 days = half month)
    const feb28 = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2027-01-01",
        endDate: "2027-02-14",
        rateCents: 140_000,
        paymentDayOfMonth: 1,
      }),
    );
    expect(feb28[1]).toEqual({
      periodStart: "2027-02-01",
      periodEnd: "2027-02-14",
      dueDate: "2027-02-01",
      baseAmountCents: 70_000,
    });

    // 29-day leap-year month: Feb 2028 (10 days)
    const feb29 = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2028-01-01",
        endDate: "2028-02-10",
        rateCents: 145_000,
        paymentDayOfMonth: 1,
      }),
    );
    expect(feb29[1]).toEqual({
      periodStart: "2028-02-01",
      periodEnd: "2028-02-10",
      dueDate: "2028-02-01",
      baseAmountCents: 50_000,
    });

    // 30-day month: Nov 2026 (12 days)
    const nov30 = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2026-10-01",
        endDate: "2026-11-12",
        rateCents: 150_000,
        paymentDayOfMonth: 1,
      }),
    );
    expect(nov30[1]).toEqual({
      periodStart: "2026-11-01",
      periodEnd: "2026-11-12",
      dueDate: "2026-11-01",
      baseAmountCents: 60_000,
    });

    // 31-day month: Dec 2026 (10 days)
    const dec31 = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2026-11-01",
        endDate: "2026-12-10",
        rateCents: 155_000,
        paymentDayOfMonth: 1,
      }),
    );
    expect(dec31[1]).toEqual({
      periodStart: "2026-12-01",
      periodEnd: "2026-12-10",
      dueDate: "2026-12-01",
      baseAmountCents: 50_000,
    });
  });

  it("clamps dueDate to periodEnd when a partial last month ends before paymentDayOfMonth", () => {
    const periods = buildObligationPeriods(
      makeMonthlyTerms({
        startDate: "2026-11-01",
        endDate: "2026-12-10",
        rateCents: 155_000,
        paymentDayOfMonth: 15,
      }),
    );
    expect(periods[1]).toEqual({
      periodStart: "2026-12-01",
      periodEnd: "2026-12-10",
      dueDate: "2026-12-10",
      baseAmountCents: 50_000,
    });
  });

  it("supports monthly fallback in calculateStayChargeCents", () => {
    expect(
      calculateStayChargeCents({
        startDate: "2026-11-01",
        endDate: "2026-11-15",
        cadence: "monthly",
        rateCents: 150_000,
      }),
    ).toBe(75_000);
  });
});

describe("calculateObligationLedger with monthly obligations", () => {
  it("allocates credits FIFO across multiple monthly periods and tracks partial balances", () => {
    const terms = makeMonthlyTerms({
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      rateCents: 150_000,
      paymentDayOfMonth: 1,
    });
    const obligations = buildObligationPeriods(terms);

    const ledger = calculateObligationLedger({
      obligations,
      contributions: [
        { amountCents: 150_000, date: "2026-10-01" },
        { amountCents: 60_000, date: "2026-11-02" },
      ],
      asOfDate: "2026-11-04",
      terms,
    });

    expect(ledger[0]).toMatchObject({
      periodStart: "2026-10-01",
      creditedCents: 150_000,
      balanceCents: 0,
      status: "paid",
    });
    expect(ledger[1]).toMatchObject({
      periodStart: "2026-11-01",
      creditedCents: 60_000,
      balanceCents: 90_000,
      status: "due",
    });
    expect(ledger[2]).toMatchObject({
      periodStart: "2026-12-01",
      creditedCents: 0,
      balanceCents: 150_000,
      status: "upcoming",
    });
  });

  it("assesses late fees after dueDate + graceDays when enabled on a monthly obligation", () => {
    const terms = makeMonthlyTerms({
      startDate: "2026-10-01",
      endDate: "2026-11-30",
      rateCents: 150_000,
      paymentDayOfMonth: 1,
      lateFeeEnabled: true,
      lateFeeCents: 5_000,
      graceDays: 5,
    });
    const obligations = buildObligationPeriods(terms);

    // Due 2026-10-01, graceEnd = 2026-10-06, first late fee assessed on 2026-10-07
    const ledger = calculateObligationLedger({
      obligations,
      contributions: [{ amountCents: 50_000, date: "2026-10-03" }],
      asOfDate: "2026-10-08",
      terms,
    });

    expect(ledger[0]).toMatchObject({
      periodStart: "2026-10-01",
      dueDate: "2026-10-01",
      lateFeeOccurrences: 1,
      lateFeeCents: 5_000,
      effectiveChargeCents: 155_000,
      creditedCents: 50_000,
      balanceCents: 105_000,
      status: "late",
    });
  });
});

describe("monthly rent server validation & Convex safeguards", () => {
  it("rejects monthly cadence when arrangement is not sublease in stays.create and terms.updateCurrent", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "monthly-guard-host", "Lee");

    await expect(
      host.mutation(api.stays.create, {
        timezone: "UTC",
        terms: baseSubleaseMonthlyTerms,
      }),
    ).rejects.toThrow("Monthly rent is only available on sublease stays");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms: baseWeeklyTerms,
    });

    await expect(
      host.mutation(api.terms.updateCurrent, {
        stayId,
        terms: baseSubleaseMonthlyTerms,
      }),
    ).rejects.toThrow("Monthly rent is only available on sublease stays");
  });

  it("enforces all monthly term invariants in assertStayTerms and Convex mutations", () => {
    for (const invalidDay of [undefined, 0, 29, 1.5]) {
      expect(() =>
        assertStayTerms(
          {
            ...baseSubleaseMonthlyTerms,
            paymentDayOfMonth: invalidDay,
          },
          { arrangement: "sublease" },
        ),
      ).toThrow("Monthly payment day must be a whole number from 1 to 28");
    }

    expect(() =>
      assertStayTerms(
        {
          ...baseSubleaseMonthlyTerms,
          paymentDayOfWeek: 1,
        },
        { arrangement: "sublease" },
      ),
    ).toThrow("Monthly contributions do not use a weekly payment day");

    expect(() =>
      assertStayTerms(
        {
          ...baseSubleaseMonthlyTerms,
          billingBasis: "occupied_nights",
        },
        { arrangement: "sublease" },
      ),
    ).toThrow("Monthly subleases must bill every day in the stay");

    expect(() =>
      assertStayTerms(
        {
          ...baseSubleaseMonthlyTerms,
          earlyDiscountEnabled: true,
          earlyDiscountPercentage: 5,
          earlyDiscountDays: 3,
        },
        { arrangement: "sublease" },
      ),
    ).toThrow(
      "Early contribution discounts are not available on monthly subleases",
    );

    expect(() =>
      assertStayTerms(
        {
          ...baseSubleaseMonthlyTerms,
          rewards: {
            enabled: true,
            coinName: "Stars",
            centsPerPoint: 100,
            maxCreditPerPeriodCents: 5_000,
          },
        },
        { arrangement: "sublease" },
      ),
    ).toThrow("Contribution rewards are not available on monthly subleases");

    expect(() =>
      assertStayTerms({
        ...baseWeeklyTerms,
        paymentDayOfMonth: 1,
      }),
    ).toThrow("Only monthly contributions use a monthly payment day");

    expect(() =>
      assertStayTerms({
        ...baseWeeklyTerms,
        cadence: "daily",
        paymentDayOfWeek: undefined,
        paymentDayOfMonth: 15,
      }),
    ).toThrow("Only monthly contributions use a monthly payment day");
  });

  it("runs a full sublease monthly flow: updateCurrent, invite, acceptCurrent, obligations, contributions, and overdue recovery", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "sublease-monthly-host", "Lee");
    const guest = await createUser(t, "sublease-monthly-guest", "Maya");

    const stayId = await host.mutation(api.stays.create, {
      name: "Oak Street Sublease",
      timezone: "UTC",
      terms: baseWeeklyTerms,
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(stayId, { arrangement: "sublease" });
    });

    await host.mutation(api.terms.updateCurrent, {
      stayId,
      terms: baseSubleaseMonthlyTerms,
    });

    const tokenHash = "a".repeat(64);
    await host.mutation(api.invites.create, {
      stayId,
      tokenHash,
      expiresAt: Date.now() + 86_400_000,
    });
    const preview = await guest.query(api.invites.preview, { tokenHash });
    expect(preview).toMatchObject({
      valid: true,
      terms: {
        cadence: "monthly",
        rateCents: 180_000,
      },
    });

    await guest.mutation(api.invites.accept, { tokenHash });

    // Reject daily/weekly schedule override during onboarding acceptance
    await expect(
      guest.mutation(api.terms.acceptCurrent, {
        stayId,
        initialCadence: "daily",
      }),
    ).rejects.toThrow(
      "Monthly sublease agreements cannot be switched to daily or weekly schedules",
    );
    await expect(
      guest.mutation(api.terms.acceptCurrent, {
        stayId,
        initialCadence: "weekly",
        initialPaymentDayOfWeek: 1,
      }),
    ).rejects.toThrow(
      "Monthly sublease agreements cannot be switched to daily or weekly schedules",
    );

    const status = await guest.mutation(api.terms.acceptCurrent, { stayId });
    expect(status).toBe("active");

    const bundle = await guest.query(api.stays.getBundle, { stayId });
    expect(bundle.stay.arrangement).toBe("sublease");
    expect(bundle.terms).toMatchObject({
      cadence: "monthly",
      paymentDayOfMonth: 1,
      rateCents: 180_000,
    });

    // Reject payment schedule change requests on monthly agreements
    await expect(
      guest.mutation(api.paymentSchedule.requestChange, {
        stayId,
        cadence: "weekly",
        paymentDayOfWeek: 1,
      }),
    ).rejects.toThrow(
      "Monthly agreements do not support daily or weekly schedule changes",
    );

    // Reject recording individual nights on monthly agreements
    await expect(
      host.mutation(api.occupancy.recordOvernight, {
        stayId,
        guestUserId: bundle.membership.userId,
        nightDate: "2026-10-15",
      }),
    ).rejects.toThrow(
      "Monthly agreements use continuous billing and do not record individual nights",
    );

    const ledgerInitial = await guest.query(api.obligations.list, {
      stayId,
      asOfDate: "2026-10-20",
    });
    // Oct 15..31 = 17/31 of 180,000 = 98,710
    // Nov 01..30 = full month = 180,000
    // Dec 01..20 = 20/31 of 180,000 = 116,129
    expect(ledgerInitial).toHaveLength(3);
    expect(ledgerInitial[0]).toMatchObject({
      periodStart: "2026-10-15",
      periodEnd: "2026-10-31",
      dueDate: "2026-10-15",
      baseAmountCents: 98_710,
      balanceCents: 98_710,
      status: "late",
    });
    expect(ledgerInitial[1]).toMatchObject({
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      dueDate: "2026-11-01",
      baseAmountCents: 180_000,
      balanceCents: 180_000,
      status: "upcoming",
    });
    expect(ledgerInitial[2]).toMatchObject({
      periodStart: "2026-12-01",
      periodEnd: "2026-12-20",
      dueDate: "2026-12-01",
      baseAmountCents: 116_129,
      balanceCents: 116_129,
      status: "upcoming",
    });

    // Record and confirm a contribution for October rent
    const contributionId = await guest.mutation(api.contributions.create, {
      stayId,
      type: "payment",
      amountCents: 98_710,
      date: "2026-10-16",
      note: "October prorated sublease rent",
      countsTowardBalance: true,
    });
    await host.mutation(api.contributions.confirm, { contributionId });

    const ledgerAfterPayment = await guest.query(api.obligations.list, {
      stayId,
      asOfDate: "2026-11-05",
    });
    expect(ledgerAfterPayment[0]).toMatchObject({
      periodStart: "2026-10-15",
      creditedCents: 98_710,
      balanceCents: 0,
      status: "paid",
    });
    expect(ledgerAfterPayment[1]).toMatchObject({
      periodStart: "2026-11-01",
      creditedCents: 0,
      balanceCents: 180_000,
      status: "late",
    });

    // Request an overdue recovery plan on the November monthly obligation
    const recoveryId = await guest.mutation(
      api.obligations.requestOverduePlan,
      {
        stayId,
        obligationId: ledgerAfterPayment[1]._id,
        proposedDate: "2026-11-10",
        proposedAmountCents: 180_000,
        note: "Payroll transfer lands on the 10th.",
      },
    );
    const plans = await host.query(api.obligations.listOverduePlans, {
      stayId,
    });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      _id: recoveryId,
      obligationId: ledgerAfterPayment[1]._id,
      proposedDate: "2026-11-10",
      proposedAmountCents: 180_000,
      status: "pending",
    });
  });

  it("prorates a split calendar month and preserves the earlier dueDate on a mid-month agreement revision", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));

    const t = convexTest(schema, modules);
    const host = await createUser(t, "midmonth-revision-host", "Lee");
    const guest = await createUser(t, "midmonth-revision-guest", "Maya");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms: baseWeeklyTerms,
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(stayId, { arrangement: "sublease" });
    });

    await host.mutation(api.terms.updateCurrent, {
      stayId,
      terms: {
        ...baseSubleaseMonthlyTerms,
        startDate: "2026-10-01",
        endDate: "2026-11-30",
        rateCents: 150_000,
        paymentDayOfMonth: 1,
      },
    });

    const tokenHash = "b".repeat(64);
    await host.mutation(api.invites.create, {
      stayId,
      tokenHash,
      expiresAt: Date.now() + 86_400_000,
    });
    await guest.mutation(api.invites.accept, { tokenHash });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const guestId = (await guest.query(api.stays.getBundle, { stayId }))
      .membership.userId;

    // Advance to mid-November (2026-11-16) and revise the guest agreement to $180,000/mo
    vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
    await host.mutation(api.terms.updateGuest, {
      stayId,
      guestUserId: guestId,
      terms: {
        ...baseSubleaseMonthlyTerms,
        startDate: "2026-10-01",
        endDate: "2026-11-30",
        rateCents: 180_000,
        paymentDayOfMonth: 1,
      },
    });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const ledger = await guest.query(api.obligations.list, {
      stayId,
      asOfDate: "2026-11-16",
    });

    // Expect:
    // 1. Oct 01..31 full month at $1,500 (150,000), dueDate 2026-10-01
    // 2. Nov 01..15 (15 days of 30 at $1,500 = 75,000), preserving original dueDate 2026-11-01
    // 3. Nov 16..30 (15 days of 30 at $1,800 = 90,000), dueDate clamped to 2026-11-16
    expect(ledger).toHaveLength(3);
    expect(ledger[0]).toMatchObject({
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      dueDate: "2026-10-01",
      baseAmountCents: 150_000,
    });
    expect(ledger[1]).toMatchObject({
      periodStart: "2026-11-01",
      periodEnd: "2026-11-15",
      dueDate: "2026-11-01",
      baseAmountCents: 75_000,
    });
    expect(ledger[2]).toMatchObject({
      periodStart: "2026-11-16",
      periodEnd: "2026-11-30",
      dueDate: "2026-11-16",
      baseAmountCents: 90_000,
    });
  });
});
