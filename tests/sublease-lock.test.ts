import { describe, expect, it } from "vitest";
import {
  evaluateSubleaseLockFromSnapshot,
  SUBLEASE_BILLING_RETRY_GRACE_MS,
} from "../convex/lib/subleaseLock";
import { assertSubleaseInput } from "../convex/lib/validation";

describe("evaluateSubleaseLockFromSnapshot", () => {
  const nowMs = Date.UTC(2026, 10, 2, 12, 0, 0);

  it("never locks a home_stay or stay without an arrangement", () => {
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "home_stay",
        environmentConfigured: true,
        snapshot: null,
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: null,
    });

    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: undefined,
        environmentConfigured: true,
        snapshot: {
          status: "expired",
          entitlement: "plus",
          currentPeriodEndsAt: nowMs - 1_000,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: null,
    });
  });

  it("never locks a sublease when the subscription environment is unconfigured or snapshot status is unknown", () => {
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: false,
        snapshot: null,
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: false,
      operationalAlert: true,
      reason: null,
    });

    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "unknown",
          entitlement: "plus",
          currentPeriodEndsAt: nowMs - 60_000,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: false,
      operationalAlert: true,
      reason: null,
    });
  });

  it("keeps a sublease unlocked on active, grace_period, or canceled before currentPeriodEndsAt", () => {
    for (const status of ["active", "grace_period", "canceled"] as const) {
      expect(
        evaluateSubleaseLockFromSnapshot({
          arrangement: "sublease",
          environmentConfigured: true,
          snapshot: {
            status,
            entitlement: "plus",
            currentPeriodEndsAt: nowMs + 86_400_000,
            updatedAt: nowMs,
          },
          nowMs,
        }),
      ).toEqual({
        locked: false,
        billingRetryWarning: false,
        operationalAlert: false,
        reason: null,
      });
    }
  });

  it("locks a sublease when active, canceled, or grace_period has passed currentPeriodEndsAt", () => {
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "canceled",
          entitlement: "plus",
          currentPeriodEndsAt: nowMs,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "period_ended",
    });

    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "grace_period",
          entitlement: "plus",
          currentPeriodEndsAt: nowMs - 1,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "grace_ended",
    });
  });

  it("locks immediately on expired, refunded, or missing subscription snapshot", () => {
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: null,
        nowMs,
      }),
    ).toEqual({
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "no_subscription",
    });

    for (const status of ["expired", "refunded"] as const) {
      expect(
        evaluateSubleaseLockFromSnapshot({
          arrangement: "sublease",
          environmentConfigured: true,
          snapshot: {
            status,
            entitlement: "plus",
            currentPeriodEndsAt: nowMs + 86_400_000,
            updatedAt: nowMs,
          },
          nowMs,
        }),
      ).toEqual({
        locked: true,
        billingRetryWarning: false,
        operationalAlert: false,
        reason: status,
      });
    }
  });

  it("warns the host during the 7-day billing_retry window and locks only after 7 days", () => {
    const retryStart = nowMs - 6 * 24 * 60 * 60 * 1000;
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "billing_retry",
          entitlement: "plus",
          billingRetryStartedAt: retryStart,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: true,
      operationalAlert: false,
      reason: null,
    });

    // Exactly at 7 days: still unlocked with warning
    const exactBoundary = nowMs - SUBLEASE_BILLING_RETRY_GRACE_MS;
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "billing_retry",
          entitlement: "plus",
          billingRetryStartedAt: exactBoundary,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: false,
      billingRetryWarning: true,
      operationalAlert: false,
      reason: null,
    });

    // Past 7 days (e.g., 8 days): locked
    const eightDaysAgo = nowMs - 8 * 24 * 60 * 60 * 1000;
    expect(
      evaluateSubleaseLockFromSnapshot({
        arrangement: "sublease",
        environmentConfigured: true,
        snapshot: {
          status: "billing_retry",
          entitlement: "plus",
          billingRetryStartedAt: eightDaysAgo,
          updatedAt: nowMs,
        },
        nowMs,
      }),
    ).toEqual({
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "billing_retry_exceeded",
    });
  });
});

describe("assertSubleaseInput", () => {
  it("validates whole_place and private_room sublease inputs", () => {
    expect(() =>
      assertSubleaseInput({
        arrangement: "home_stay",
      }),
    ).not.toThrow();

    expect(() =>
      assertSubleaseInput({
        arrangement: "home_stay",
        subleaseLayout: "whole_place",
      }),
    ).toThrow(/only used on sublease stays/);

    expect(() =>
      assertSubleaseInput({
        arrangement: "sublease",
        subleaseLayout: "whole_place",
      }),
    ).not.toThrow();

    expect(() =>
      assertSubleaseInput({
        arrangement: "sublease",
        subleaseLayout: "whole_place",
        roommateCount: 1,
      }),
    ).toThrow(/do not include roommates/);

    expect(() =>
      assertSubleaseInput({
        arrangement: "sublease",
        subleaseLayout: "private_room",
        roommateCount: 2,
        roommateNames: ["Alex", "Jordan"],
      }),
    ).not.toThrow();

    expect(() =>
      assertSubleaseInput({
        arrangement: "sublease",
        subleaseLayout: "private_room",
      }),
    ).toThrow(/Roommate count must be a whole number/);
  });
});
