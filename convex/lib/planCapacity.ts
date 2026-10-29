import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getPlanLimits, type SubscriptionPlan } from "../../lib/domain/subscriptionPlans";
import { getEffectiveSubscriptionForAccount } from "./subscriptionAccess";

type AppCtx = QueryCtx | MutationCtx;
export type CapacityDimension = "stay" | "guest";

/** Hard read bound; no supported plan reaches it, so hitting it means review. */
const SCAN_LIMIT = 50;

/** Stable code clients read from `ConvexError.data` to show the right screen. */
export const PLAN_LIMIT_ERROR = "plan_limit";

export type PlanLimitErrorData = {
  code: typeof PLAN_LIMIT_ERROR;
  dimension: CapacityDimension;
  /** "free" or "plus" — the public plan names, never internal ones. */
  plan: "free" | "plus";
  limit: number;
  /** Plus is the highest plan a host can buy, so there is nothing to upsell. */
  atHighestPlan: boolean;
  message: string;
};

export type PlanUsage = {
  billingOwnerId: Id<"users">;
  householdAccountId: Id<"householdAccounts"> | null;
  /** null when the subscription environment is not configured on this deployment. */
  plan: SubscriptionPlan | null;
  stays: Doc<"stays">[];
  guestMemberships: Doc<"memberships">[];
  scanTruncated: boolean;
};

export function publicPlanName(plan: SubscriptionPlan): "free" | "plus" | "pro" {
  if (plan === "hostPlus") return "plus";
  if (plan === "householdPro") return "pro";
  return "free";
}

function expectedSubscriptionEnvironment() {
  const environment = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
  return environment === "production" || environment === "sandbox" ? environment : undefined;
}

/**
 * Count what holds a spot on the host billing account: pending and active
 * stays (ended stays do not count), and active guest memberships on them. A
 * guest whose agreement is still pending review has an active membership, so
 * they hold a spot; removed guests have status "left" and do not.
 *
 * This helper does not authorize the caller.
 */
export async function getPlanUsage(
  ctx: AppCtx,
  ownerUserId: Id<"users">,
  householdAccountId?: Id<"householdAccounts">,
): Promise<PlanUsage> {
  const account = householdAccountId
    ? await ctx.db.get(householdAccountId)
    : await ctx.db.query("householdAccounts")
      .withIndex("by_owner_user_id", q => q.eq("ownerUserId", ownerUserId)).unique();
  if (householdAccountId && !account) {
    throw new Error("Household billing ownership needs review before adding capacity.");
  }
  const billingOwnerId = account?.ownerUserId ?? ownerUserId;
  const environment = expectedSubscriptionEnvironment();
  const plan: SubscriptionPlan | null = !account
    ? "starter"
    : environment
      ? (await getEffectiveSubscriptionForAccount(ctx, account._id, environment)).plan
      : null;

  const groups = await Promise.all((["active", "pending"] as const).flatMap(status => [
    ...(account ? [ctx.db.query("stays").withIndex("by_household_account_status", q => q.eq("householdAccountId", account._id).eq("status", status)).take(SCAN_LIMIT + 1)] : []),
    ctx.db.query("stays").withIndex("by_host_account_status", q => q.eq("hostUserId", billingOwnerId).eq("householdAccountId", undefined).eq("status", status)).take(SCAN_LIMIT + 1),
  ]));
  let scanTruncated = groups.some(rows => rows.length > SCAN_LIMIT);
  const stays = [...new Map(groups.flat().map(stay => [stay._id, stay])).values()];
  const memberships = await Promise.all(stays.map(stay => ctx.db.query("memberships")
    .withIndex("by_stay_role_status", q => q.eq("stayId", stay._id).eq("role", "guest").eq("status", "active"))
    .take(SCAN_LIMIT + 1)));
  scanTruncated ||= memberships.some(rows => rows.length > SCAN_LIMIT);
  return {
    billingOwnerId,
    householdAccountId: account?._id ?? null,
    plan,
    stays,
    guestMemberships: memberships.flat(),
    scanTruncated,
  };
}

function limitMessage(dimension: CapacityDimension, plan: SubscriptionPlan, limit: number) {
  if (plan === "hostPlus") {
    return dimension === "stay"
      ? `Plus covers up to ${limit} active stays. End a stay to start a new one.`
      : `Plus covers up to ${limit} guests across your stays. Remove a guest from any stay to make room.`;
  }
  return dimension === "stay"
    ? `Free includes ${limit} active stay. End your current stay or move to Plus to host up to ${getPlanLimits("hostPlus").maxActiveStays} at once.`
    : `Free includes ${limit} guest across your stays. Remove a guest or move to Plus to invite up to ${getPlanLimits("hostPlus").maxActiveGuests}.`;
}

/**
 * Enforce the plan's stay or guest limit before a write. Convex runs the check
 * and the caller's insert in one serializable transaction, so two competing
 * joins cannot both take the last spot.
 *
 * Guest-limit errors reach the joining guest. Their client must show its own
 * "this stay is full" copy and never the host-facing `message`.
 */
export async function assertPlanCapacity(
  ctx: MutationCtx,
  ownerUserId: Id<"users">,
  dimension: CapacityDimension,
  householdAccountId?: Id<"householdAccounts">,
) {
  const usage = await getPlanUsage(ctx, ownerUserId, householdAccountId);
  const used = dimension === "stay" ? usage.stays.length : usage.guestMemberships.length;
  if (usage.scanTruncated) {
    throw new Error(dimension === "stay"
      ? "This account needs a capacity review before adding another stay. Please contact support."
      : "Your host needs to review household capacity before adding another guest.");
  }
  const freeLimit = getPlanLimits("starter")[dimension === "stay" ? "maxActiveStays" : "maxActiveGuests"]!;
  if (usage.plan === null) {
    // Without a configured subscription environment, a paid plan cannot be
    // read. Usage under the Free limit is allowed whatever the plan is; above
    // it, refuse rather than treat a paying host as Free.
    if (used < freeLimit) return;
    throw new Error("Host plan limits are being configured. Please contact support before adding capacity.");
  }
  const limits = getPlanLimits(usage.plan);
  const limit = dimension === "stay" ? limits.maxActiveStays : limits.maxActiveGuests;
  if (limit === null) return; // Preserve verified legacy Pro access.
  if (used < limit) return;
  const plan = usage.plan === "hostPlus" ? "plus" : "free";
  const data: PlanLimitErrorData = {
    code: PLAN_LIMIT_ERROR,
    dimension,
    plan,
    limit,
    atHighestPlan: plan === "plus",
    message: limitMessage(dimension, usage.plan, limit),
  };
  throw new ConvexError(data);
}
