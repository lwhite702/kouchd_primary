import { describe, expect, it } from "vitest";

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
