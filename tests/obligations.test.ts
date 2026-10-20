import { describe, expect, it } from "vitest";

import {
  buildObligationPeriods,
  calculateObligationLedger,
} from "../lib/domain/obligations";

const weeklyTerms = {
  startDate: "2026-09-01",
  endDate: "2026-09-10",
  cadence: "weekly" as const,
  rateCents: 14_000,
  earlyDiscountEnabled: true,
  earlyDiscountPercentage: 5,
  earlyDiscountDays: 2,
  lateFeeEnabled: true,
  lateFeeCents: 1_500,
  graceDays: 2,
};

describe("obligation ledger", () => {
  it("creates full weekly periods and prorates the final period", () => {
    expect(buildObligationPeriods(weeklyTerms)).toEqual([
      {
        periodStart: "2026-09-01",
        periodEnd: "2026-09-07",
        dueDate: "2026-09-07",
        baseAmountCents: 14_000,
      },
      {
        periodStart: "2026-09-08",
        periodEnd: "2026-09-10",
        dueDate: "2026-09-10",
        baseAmountCents: 6_000,
      },
    ]);
  });

  it("applies an early discount only after the obligation is fully satisfied by its threshold", () => {
    const obligations = buildObligationPeriods(weeklyTerms).slice(0, 1);
    const qualified = calculateObligationLedger({
      obligations,
      contributions: [{ amountCents: 13_300, date: "2026-09-05" }],
      asOfDate: "2026-09-07",
      terms: weeklyTerms,
    });
    expect(qualified[0]).toMatchObject({
      earlyDiscountCents: -700,
      effectiveChargeCents: 13_300,
      creditedCents: 13_300,
      balanceCents: 0,
      status: "paid",
    });

    const partial = calculateObligationLedger({
      obligations,
      contributions: [
        { amountCents: 5_000, date: "2026-09-05" },
        { amountCents: 8_300, date: "2026-09-06" },
      ],
      asOfDate: "2026-09-07",
      terms: weeklyTerms,
    });
    expect(partial[0]).toMatchObject({
      earlyDiscountCents: 0,
      effectiveChargeCents: 14_000,
      creditedCents: 13_300,
      balanceCents: 700,
      status: "due",
    });
  });

  it("adds a weekly rollover fee while the balance remains unpaid", () => {
    const obligations = buildObligationPeriods({
      ...weeklyTerms,
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      cadence: "daily",
      rateCents: 10_000,
      earlyDiscountPercentage: 0,
    });
    const [late] = calculateObligationLedger({
      obligations,
      contributions: [{ amountCents: 4_000, date: "2026-09-01" }],
      asOfDate: "2026-09-30",
      terms: { ...weeklyTerms, cadence: "daily", rateCents: 10_000, earlyDiscountPercentage: 0 },
    });
    expect(late).toMatchObject({
      lateFeeCents: 6_000,
      lateFeeOccurrences: 4,
      effectiveChargeCents: 16_000,
      creditedCents: 4_000,
      balanceCents: 12_000,
      status: "late",
    });
  });

  it("carries unused confirmed credit into the next obligation", () => {
    const obligations = buildObligationPeriods({ ...weeklyTerms, cadence: "daily", rateCents: 2_500, endDate: "2026-09-02", earlyDiscountPercentage: 0, lateFeeCents: 0 });
    const ledger = calculateObligationLedger({
      obligations,
      contributions: [{ amountCents: 4_000, date: "2026-09-01" }],
      asOfDate: "2026-09-02",
      terms: { ...weeklyTerms, cadence: "daily", rateCents: 2_500, earlyDiscountPercentage: 0, lateFeeCents: 0 },
    });
    expect(ledger.map((item) => item.creditedCents)).toEqual([2_500, 1_500]);
    expect(ledger.map((item) => item.balanceCents)).toEqual([0, 1_000]);
  });

  it("preserves total expected cents on weekly cadence with remainder days", () => {
    const terms = {
      ...weeklyTerms,
      startDate: "2026-09-01",
      endDate: "2026-09-11", // 11 days
      cadence: "weekly" as const,
      rateCents: 10_000,
    };
    const periods = buildObligationPeriods(terms);
    const sumCents = periods.reduce((sum, p) => sum + p.baseAmountCents, 0);
    const expectedTotal = Math.round((11 * 10_000) / 7);
    expect(sumCents).toBe(expectedTotal);
  });
});
