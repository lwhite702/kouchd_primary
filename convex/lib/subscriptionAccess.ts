import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  resolveSubscriptionPlan,
  type SubscriptionPlan,
  type SubscriptionState,
} from "../../lib/domain/subscriptionPlans";

type AppCtx = QueryCtx | MutationCtx;

/**
 * Resolve the billing owner associated with a stay. This is a lookup only: it
 * does not create an account during reads, so legacy stays remain Starter until
 * the household-account backfill has associated them.
 *
 * This helper does not authorize the caller. Callers must first authorize the
 * host or household owner; guests must never be authorized by this utility.
 */
export async function resolveHouseholdOwnerForStay(
  ctx: AppCtx,
  stay: Doc<"stays">,
): Promise<{
  householdAccountId: Id<"householdAccounts"> | null;
  ownerUserId: Id<"users">;
}> {
  if (stay.householdAccountId) {
    const account = await ctx.db.get(stay.householdAccountId);
    if (account) {
      return { householdAccountId: account._id, ownerUserId: account.ownerUserId };
    }
  }

  // Legacy fallback: older stays may not yet have householdAccountId. Resolve
  // an existing account by the stay's host; do not create one here.
  const legacyAccount = await ctx.db
    .query("householdAccounts")
    .withIndex("by_owner_user_id", (query) => query.eq("ownerUserId", stay.hostUserId))
    .unique();

  return {
    householdAccountId: legacyAccount?._id ?? null,
    ownerUserId: legacyAccount?.ownerUserId ?? stay.hostUserId,
  };
}

function getPaidPlan(entitlement: string | undefined): Exclude<SubscriptionPlan, "starter"> | undefined {
  if (entitlement === "plus") return "hostPlus";
  if (entitlement === "pro") return "householdPro";
  return undefined;
}

function toSubscriptionState(snapshot: Doc<"subscriptionSnapshots"> | undefined): SubscriptionState | null {
  if (!snapshot) return null;

  const plan = getPaidPlan(snapshot.entitlement);
  const accessUntilMs = snapshot.currentPeriodEndsAt;

  switch (snapshot.status) {
    case "active":
      // An active provider status without a known period boundary is
      // insufficient evidence for granting paid access.
      if (!plan || accessUntilMs === undefined) return null;
      return { status: "active", plan, accessUntilMs };
    case "grace_period":
      if (!plan || accessUntilMs === undefined) return null;
      return { status: "grace", plan, accessUntilMs };
    case "canceled":
      if (!plan || accessUntilMs === undefined) return null;
      return { status: "canceledUntilPeriodEnd", plan, accessUntilMs };
    case "billing_retry":
    case "expired":
    case "refunded":
    case "unknown":
      return null;
    default:
      return null;
  }
}

/** Select verified account state for trusted server-side callers. */
export async function getEffectiveSubscriptionForAccount(
  ctx: AppCtx,
  householdAccountId: Id<"householdAccounts">,
  expectedEnvironment: string,
  nowMs = Date.now(),
): Promise<{
  plan: SubscriptionPlan;
  snapshot: Doc<"subscriptionSnapshots"> | null;
}> {
  const snapshots = await ctx.db
    .query("subscriptionSnapshots")
    .withIndex("by_household_account", (query) =>
      query.eq("householdAccountId", householdAccountId),
    )
    .collect();
  const matchingSnapshots = snapshots.filter(
    (snapshot) => snapshot.environment === expectedEnvironment,
  );
  const statusRank: Record<Doc<"subscriptionSnapshots">["status"], number> = {
    active: 6,
    grace_period: 5,
    canceled: 4,
    billing_retry: 3,
    expired: 2,
    refunded: 1,
    unknown: 0,
  };
  matchingSnapshots.sort((a, b) =>
    (b.updatedAt - a.updatedAt) ||
    ((b.latestProviderEventAt ?? 0) - (a.latestProviderEventAt ?? 0)) ||
    (statusRank[b.status] - statusRank[a.status]),
  );
  const snapshot = matchingSnapshots[0] ?? null;
  const state = toSubscriptionState(snapshot ?? undefined);
  return { plan: resolveSubscriptionPlan(state, nowMs), snapshot };
}

/**
 * Return the account's effective plan for a stay. Subscription snapshot IDs
 * and provider identifiers are deliberately not included in the result.
 *
 * This helper does not authorize the caller. Callers must first authorize the
 * host or household owner; guests must never be authorized by this utility.
 */
export async function getEffectivePlanForStay(
  ctx: AppCtx,
  stay: Doc<"stays">,
  expectedEnvironment: string,
  nowMs = Date.now(),
): Promise<{
  householdAccountId: Id<"householdAccounts"> | null;
  ownerUserId: Id<"users">;
  plan: SubscriptionPlan;
}> {
  const owner = await resolveHouseholdOwnerForStay(ctx, stay);
  if (!owner.householdAccountId) return { ...owner, plan: "starter" };

  const subscription = await getEffectiveSubscriptionForAccount(
    ctx,
    owner.householdAccountId,
    expectedEnvironment,
    nowMs,
  );

  return {
    ...owner,
    plan: subscription.plan,
  };
}
