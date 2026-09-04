import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateStayCharge,
  contributionBalance,
  paymentAdjustment,
  summarizeStayBalance,
} from "../src/pricing.mjs";

test("daily stays charge for every calendar day, including both endpoints", () => {
  assert.equal(
    calculateStayCharge({
      startDate: "2026-09-01",
      endDate: "2026-09-07",
      cadence: "daily",
      rate: 25,
    }),
    175,
  );
});

test("weekly stays prorate partial weeks by day", () => {
  assert.equal(
    calculateStayCharge({
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      cadence: "weekly",
      rate: 140,
    }),
    200,
  );
});

test("early payments receive the configured percentage discount", () => {
  assert.equal(
    paymentAdjustment({ amount: 200, timing: "early", earlyDiscount: 10, lateFee: 15 }),
    -20,
  );
});

test("late payments receive the configured flat fee", () => {
  assert.equal(
    paymentAdjustment({ amount: 200, timing: "late", earlyDiscount: 10, lateFee: 15 }),
    15,
  );
});

test("cash and credited non-cash contributions reduce the balance", () => {
  assert.equal(
    contributionBalance({
      charge: 300,
      contributions: [
        { value: 100, countsTowardBalance: true },
        { value: 35, countsTowardBalance: true },
        { value: 20, countsTowardBalance: false },
      ],
    }),
    165,
  );
});

test("the balance summary excludes pending entries and exposes timing adjustments", () => {
  assert.deepEqual(
    summarizeStayBalance({
      charge: 500,
      earlyDiscount: 10,
      lateFee: 15,
      contributions: [
        { type: "Payment", value: 100, timing: "early", confirmed: true, countsTowardBalance: true },
        { type: "Payment", value: 50, timing: "late", confirmed: false, countsTowardBalance: true },
        { type: "Groceries", value: 25, timing: "on-time", confirmed: true, countsTowardBalance: true },
      ],
    }),
    { charge: 500, credits: 125, adjustments: -10, balance: 365 },
  );
});
