import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  resolveEffectiveSubscriptionPlan,
  type SubscriptionEntitlement,
  type SubscriptionEntitlementGrant,
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

function statusToGrantStatus(
  status: Doc<"subscriptionSnapshots">["status"] | Doc<"subscriptionEntitlementGrants">["status"],
): SubscriptionEntitlementGrant["status"] {
  switch (status) {
    case "active": return "active";
    case "grace_period": return "grace";
    case "canceled": return "canceledUntilPeriodEnd";
    case "expired": return "expired";
    case "refunded": return "refunded";
    default: return "unknown";
  }
}

function planToEntitlement(plan: Exclude<SubscriptionPlan, "starter">): SubscriptionEntitlement {
  return plan === "householdPro" ? "pro" : "plus";
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

  const snapshots = await ctx.db
    .query("subscriptionSnapshots")
    .withIndex("by_household_account", (query) =>
      query.eq("householdAccountId", owner.householdAccountId!),
    )
    .collect();

  const storedGrants = await ctx.db
    .query("subscriptionEntitlementGrants")
    .withIndex("by_household_account", (query) =>
      query.eq("householdAccountId", owner.householdAccountId!),
    )
    .collect();
  const expectedEnvironmentGrants = storedGrants.filter((grant) => grant.environment === expectedEnvironment);
  const grants: SubscriptionEntitlementGrant[] = expectedEnvironmentGrants.map((grant) => ({
    environment: grant.environment,
    entitlement: grant.entitlement,
    status: statusToGrantStatus(grant.status),
    accessUntilMs: grant.currentPeriodEndsAt,
    lifetime: grant.lifetime,
  }));

  // Preserve older snapshots while reading new data. A legacy snapshot is
  // used only until an independent row exists for that provider/entitlement.
  const storedKeys = new Set(expectedEnvironmentGrants.map((grant) => `${grant.provider}:${grant.entitlement}`));
  for (const snapshot of snapshots) {
    if (snapshot.environment !== expectedEnvironment || !snapshot.entitlement ||
      storedKeys.has(`${snapshot.provider}:${snapshot.entitlement}`)) continue;
    const state = toSubscriptionState(snapshot);
    if (!state?.plan) continue;
    grants.push({
      environment: snapshot.environment,
      entitlement: planToEntitlement(state.plan),
      status: state.status,
      accessUntilMs: state.accessUntilMs,
    });
  }

  return {
    ...owner,
    plan: resolveEffectiveSubscriptionPlan(grants, expectedEnvironment, nowMs),
  };
}
