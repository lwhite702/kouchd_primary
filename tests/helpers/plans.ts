import type { convexTest } from "convex-test";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Give the stay's host billing account an active Plus snapshot so fixtures
 * with more than one guest fit the plan limits (Plus: 3 stays, 5 guests).
 */
export async function grantPlus(t: ReturnType<typeof convexTest>, stayId: Id<"stays">) {
  process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT ??= "production";
  const environment = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
  await t.run(async ({ db }) => {
    const stay = await db.get(stayId);
    if (!stay?.householdAccountId) throw new Error("Stay has no household account");
    const now = Date.now();
    await db.insert("subscriptionSnapshots", {
      householdAccountId: stay.householdAccountId,
      provider: "revenuecat",
      entitlement: "plus",
      status: "active",
      environment,
      currentPeriodEndsAt: now + 365 * 86_400_000,
      latestProviderEventAt: now,
      updatedAt: now,
    });
  });
}
