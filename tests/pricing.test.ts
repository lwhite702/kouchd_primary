import { describe, expect, it } from "vitest";

import {
  balanceCents,
  calculateStayChargeCents,
  confirmedCreditCents,
  earlyDiscountCents,
} from "../lib/domain/pricing";

describe("stay pricing", () => {
  it("charges for both endpoint days", () => {
    expect(calculateStayChargeCents({
      startDate: "2026-09-01",
      endDate: "2026-09-07",
      cadence: "daily",
      rateCents: 2_500,
    })).toBe(17_500);
  });

  it("prorates partial weekly periods to the cent", () => {
    expect(calculateStayChargeCents({
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      cadence: "weekly",
      rateCents: 14_000,
    })).toBe(20_000);
  });

  it("uses only confirmed balance credits", () => {
    const contributions = [
      { amountCents: 10_000, countsTowardBalance: true, status: "confirmed" as const },
      { amountCents: 3_500, countsTowardBalance: true, status: "pending" as const },
      { amountCents: 2_000, countsTowardBalance: false, status: "confirmed" as const },
      { amountCents: 1_000, countsTowardBalance: true, status: "disputed" as const },
    ];
    expect(confirmedCreditCents(contributions)).toBe(10_000);
    expect(balanceCents({ chargeCents: 30_000, contributions })).toBe(20_000);
  });

  it("rounds an early discount deterministically", () => {
    expect(earlyDiscountCents(19_999, 5)).toBe(-1_000);
  });
});
