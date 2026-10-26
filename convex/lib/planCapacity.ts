import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getPlanLimits, type SubscriptionPlan } from "../../lib/domain/subscriptionPlans";
import { getEffectiveSubscriptionForAccount } from "./subscriptionAccess";

/** Check and write happen in one Convex transaction, including concurrent joins. */
export async function assertPlanCapacity(
  ctx: MutationCtx,
  ownerUserId: Id<"users">,
  dimension: "stay" | "guest",
  householdAccountId?: Id<"householdAccounts">,
) {
  // Enable only after ownership reconciliation and production billing checks.
  if (process.env.SUBSCRIPTION_LIMITS_ENFORCED !== "true") return;
  const account = householdAccountId ? await ctx.db.get(householdAccountId) : await ctx.db.query("householdAccounts")
    .withIndex("by_owner_user_id", q => q.eq("ownerUserId", ownerUserId)).unique();
  if (householdAccountId && !account) throw new Error("Household billing ownership needs review before adding capacity.");
  const billingOwnerId = account?.ownerUserId ?? ownerUserId;
  const environment = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
  if (environment !== "production" && environment !== "sandbox") {
    throw new Error("Host plan limits are being configured. Please contact support before adding capacity.");
  }
  const plan: SubscriptionPlan = account
    ? (await getEffectiveSubscriptionForAccount(ctx, account._id, environment)).plan : "starter";
  const limits = getPlanLimits(plan);
  const limit = dimension === "stay" ? limits.maxActiveStays : limits.maxActiveGuests;
  if (limit === null) return; // Preserve verified legacy Pro access.
  // Pending stays reserve capacity, including while changed terms need review.
  const readLimit = dimension === "stay" ? limit + 1 : 51;
  const groups = await Promise.all((["active", "pending"] as const).flatMap(status => [
    ...(account ? [ctx.db.query("stays").withIndex("by_household_account_status", q => q.eq("householdAccountId", account._id).eq("status", status)).take(readLimit)] : []),
    ctx.db.query("stays").withIndex("by_host_account_status", q => q.eq("hostUserId", billingOwnerId).eq("householdAccountId", undefined).eq("status", status)).take(readLimit),
  ]));
  const stays: Doc<"stays">[] = groups.flat();
  let used = stays.length;
  if (dimension === "guest") {
    if (groups.some(rows => rows.length > 50)) throw new Error("Your host needs to review household capacity before adding another guest.");
    const memberships = await Promise.all(stays.map(stay => ctx.db.query("memberships")
      .withIndex("by_stay_role_status", q => q.eq("stayId", stay._id).eq("role", "guest").eq("status", "active"))
      .take(limit + 1)));
    used = memberships.reduce((sum, rows) => sum + rows.length, 0);
  }
  if (used >= limit) throw new Error(dimension === "stay"
    ? `Your plan includes ${limit} active ${limit === 1 ? "stay" : "stays"}. End a stay or review your host plan before creating another.`
    : `This host plan includes ${limit} active guest ${limit === 1 ? "membership" : "memberships"} across its stays. Ask your host to review their plan.`);
}
