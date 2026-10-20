import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const rewardsTerms = {
  startDate: "2026-09-01",
  endDate: "2026-09-21",
  cadence: "weekly" as const,
  rateCents: 20_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Community contributions welcome.",
  rewards: {
    enabled: true,
    coinName: "Points",
    centsPerPoint: 100, // 1 point = $1.00
    maxCreditPerPeriodCents: 10_000,
  },
};

async function createUser(t: ReturnType<typeof convexTest>, subject: string, name: string) {
  const actor = t.withIdentity({ subject, name, email: `${subject}@example.com` });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

describe("Contribution Points & Rewards System", () => {
  it("pre-seeds suggested tasks, supports claims, host approval, and points redemption into ledger credit", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-rew-1", "Avery Host");
    const guest = await createUser(t, "guest-rew-1", "Riley Guest");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: rewardsTerms,
    });

    const bundle = await host.query(api.stays.getBundle, { stayId });
    const referralCode = bundle.stay.referralCode!;

    // Guest joins via referral code
    await guest.mutation(api.referral.joinWithCode, { referralCode });

    // Accept terms so obligations generate
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    // Verify rules were seeded
    const rules = await guest.query(api.rewards.listRules, { stayId });
    expect(rules.length).toBeGreaterThan(0);
    const kitchenRule = rules.find((r: { title: string }) => r.title.includes("kitchen"));
    expect(kitchenRule).toBeDefined();
    if (!kitchenRule) throw new Error("Kitchen rule not seeded");

    // Guest submits a claim for cleaning the kitchen (25 points = $25.00)
    const claimId = await guest.mutation(api.rewards.submitClaim, {
      stayId,
      ruleId: kitchenRule._id,
      title: kitchenRule.title,
      points: 25,
      note: "Deep cleaned counters, stovetop, and took out trash",
      date: "2026-09-02",
    });

    // Wallet should show 0 available before confirmation
    let wallet = await guest.query(api.rewards.getWallet, { stayId });
    expect(wallet.availablePoints).toBe(0);
    expect(wallet.claims.length).toBe(1);
    expect(wallet.claims[0].status).toBe("pending");

    // Host confirms the claim
    await host.mutation(api.rewards.confirmClaim, { claimId });

    // Wallet now reflects 25 points = $25.00
    wallet = await guest.query(api.rewards.getWallet, { stayId });
    expect(wallet.availablePoints).toBe(25);
    expect(wallet.dollarEquivalentCents).toBe(2_500);

    // Check obligation balance before redemption
    let ledger = await guest.query(api.obligations.list, {
      stayId,
      asOfDate: "2026-09-07",
    });
    expect(ledger[0].creditedCents).toBe(0);
    expect(ledger[0].balanceCents).toBe(20_000);

    // Guest redeems 20 points ($20.00 credit)
    const redemptionResult = await guest.mutation(api.rewards.redeem, {
      stayId,
      points: 20,
      date: "2026-09-03",
    });
    expect(redemptionResult.pointsRedeemed).toBe(20);
    expect(redemptionResult.amountCents).toBe(2_000);

    // Remaining points in wallet is 5 points ($5.00)
    wallet = await guest.query(api.rewards.getWallet, { stayId });
    expect(wallet.availablePoints).toBe(5);
    expect(wallet.redeemedPoints).toBe(20);
    expect(wallet.dollarEquivalentCents).toBe(500);

    // Check obligation ledger reflects $20 credit towards rent!
    ledger = await guest.query(api.obligations.list, {
      stayId,
      asOfDate: "2026-09-07",
    });
    expect(ledger[0].creditedCents).toBe(2_000);
    expect(ledger[0].balanceCents).toBe(18_000);
  });

  it("enforces outstanding balance limits and cumulative period credit caps", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-rew-cap", "Taylor Host");
    const guest = await createUser(t, "guest-rew-cap", "Morgan Guest");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: {
        ...rewardsTerms,
        rateCents: 5_000, // $50/week = $150 total for 3 weeks
        rewards: {
          enabled: true,
          coinName: "Points",
          centsPerPoint: 100, // 1 point = $1.00
          maxCreditPerPeriodCents: 3_000, // Max $30 per period
        },
      },
    });

    const bundle = await host.query(api.stays.getBundle, { stayId });
    await guest.mutation(api.referral.joinWithCode, { referralCode: bundle.stay.referralCode! });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    // Seed rule and claim 50 points ($50.00)
    const rules = await guest.query(api.rewards.listRules, { stayId });
    const claimId = await guest.mutation(api.rewards.submitClaim, {
      stayId,
      ruleId: rules[0]._id,
      title: rules[0].title,
      points: 50,
      note: "Helped with multiple tasks",
      date: "2026-09-02",
    });
    await host.mutation(api.rewards.confirmClaim, { claimId });

    // 1. Enforce cumulative period credit cap (max $30 per period)
    // Attempting to redeem 35 points ($35.00 > $30.00 allowance) should throw
    await expect(
      guest.mutation(api.rewards.redeem, {
        stayId,
        points: 35,
        date: "2026-09-03",
      })
    ).rejects.toThrow(/exceeds your period allowance/i);

    // Redeeming 25 points ($25.00 <= $30.00) succeeds
    await guest.mutation(api.rewards.redeem, {
      stayId,
      points: 25,
      date: "2026-09-03",
    });

    // Attempting another 10 points ($10.00) in same period should throw since remaining allowance is $5.00
    await expect(
      guest.mutation(api.rewards.redeem, {
        stayId,
        points: 10,
        date: "2026-09-04",
      })
    ).rejects.toThrow(/exceeds your period allowance/i);

    // 2. Enforce outstanding balance limit
    // Pay off all remaining stay balance ($150 - $25 = $125)
    const payoffId = await guest.mutation(api.contributions.create, {
      stayId,
      type: "payment",
      amountCents: 12_500,
      date: "2026-09-05",
      note: "Full payoff",
      countsTowardBalance: true,
    });
    await host.mutation(api.contributions.confirm, { contributionId: payoffId });

    // Now balance is $0, attempting any redemption should throw
    await expect(
      guest.mutation(api.rewards.redeem, {
        stayId,
        points: 5,
        date: "2026-09-08",
      })
    ).rejects.toThrow(/no outstanding balance due/i);
  });

  it("supports guest overdue recovery plan requests and host reviews", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-plan", "Jordan Host");
    const guest = await createUser(t, "guest-plan", "Casey Guest");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: rewardsTerms,
    });

    const bundle = await host.query(api.stays.getBundle, { stayId });
    await guest.mutation(api.referral.joinWithCode, { referralCode: bundle.stay.referralCode! });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    // Guest submits an overdue recovery plan request
    const requestId = await guest.mutation(api.obligations.requestOverduePlan, {
      stayId,
      proposedDate: "2026-09-15",
      proposedAmountCents: 10_000,
      note: "Starting new contract next Monday, will catch up on 9/15",
    });
    expect(requestId).toBeDefined();

    // Host views pending recovery plans
    const hostPlans = await host.query(api.obligations.listOverduePlans, { stayId });
    expect(hostPlans.length).toBe(1);
    expect(hostPlans[0].status).toBe("pending");
    expect(hostPlans[0].proposedDate).toBe("2026-09-15");
    expect(hostPlans[0].note).toContain("new contract");

    // Host approves the recovery plan
    await host.mutation(api.obligations.reviewOverduePlan, {
      requestId,
      decision: "approve",
      reviewNote: "Sounds good, thanks for letting me know Casey!",
    });

    // Check plan status is approved
    const updatedPlans = await guest.query(api.obligations.listOverduePlans, { stayId });
    expect(updatedPlans[0].status).toBe("approved");
    expect(updatedPlans[0].reviewNote).toBe("Sounds good, thanks for letting me know Casey!");
  });
});
