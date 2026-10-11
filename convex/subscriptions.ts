import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, query } from "./_generated/server";
import { getOrCreateHouseholdAccount } from "./householdOwnership";
import { getEffectiveSubscriptionForAccount } from "./lib/subscriptionAccess";
import { requireCurrentUser } from "./lib/auth";
import { getPlanCapabilities, type SubscriptionPlan } from "../lib/domain/subscriptionPlans";

const planValidator = v.union(v.literal("starter"), v.literal("hostPlus"), v.literal("householdPro"));
const summaryStatusValidator = v.union(
  v.literal("starter"),
  v.literal("active"),
  v.literal("grace_period"),
  v.literal("billing_retry"),
  v.literal("canceled"),
  v.literal("expired"),
  v.literal("refunded"),
  v.literal("unknown"),
);
const capabilitiesValidator = v.object({
  agreementsAndHistory: v.boolean(),
  individualRecords: v.boolean(),
  coreLedger: v.boolean(),
  basicChores: v.boolean(),
  guestFunctions: v.boolean(),
  flexibleTerms: v.boolean(),
  recurringChores: v.boolean(),
  expandedKoins: v.boolean(),
  hostReporting: v.boolean(),
  welcomeKit: v.boolean(),
  multiStayManagement: v.boolean(),
  cohostAdministration: v.boolean(),
  consolidatedReporting: v.boolean(),
});

/**
 * Client-safe view of the signed-in user's own host subscription. A guest
 * cannot query another household's billing state because this query accepts
 * no account or user identifier and returns Starter for guest-only accounts.
 */
export const currentAccountSummary = query({
  args: {},
  returns: v.object({
    canManageSubscription: v.boolean(),
    plan: planValidator,
    status: summaryStatusValidator,
    currentPeriodEndsAt: v.optional(v.number()),
    willRenew: v.optional(v.boolean()),
    capabilities: capabilitiesValidator,
  }),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const hostStay = await ctx.db
      .query("stays")
      .withIndex("by_host_user_id", (q) => q.eq("hostUserId", user._id))
      .first();
    const account = await ctx.db
      .query("householdAccounts")
      .withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", user._id))
      .unique();
    const canManageSubscription = Boolean(hostStay || account);

    // Guests receive only the public Starter baseline, never a billing
    // account lookup or provider state for the household they joined.
    if (!canManageSubscription) {
      const plan: SubscriptionPlan = "starter";
      return {
        canManageSubscription: false,
        plan,
        status: "starter" as const,
        capabilities: getPlanCapabilities(plan),
      };
    }

    const configuredEnvironment = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
    const expectedEnvironment = configuredEnvironment === "production" || configuredEnvironment === "sandbox"
      ? configuredEnvironment
      : undefined;
    const subscription = account && expectedEnvironment
      ? await getEffectiveSubscriptionForAccount(ctx, account._id, expectedEnvironment)
      : null;
    const plan = subscription?.plan ?? "starter";
    const snapshot = subscription?.snapshot;
    const nowMs = Date.now();
    const isPeriodEnded = snapshot?.currentPeriodEndsAt !== undefined
      && nowMs >= snapshot.currentPeriodEndsAt;
    const status: SnapshotStatus | "starter" = !snapshot
      ? "starter"
      : isPeriodEnded && (snapshot.status === "active" || snapshot.status === "grace_period" || snapshot.status === "canceled")
        ? "expired"
        : snapshot.status;

    return {
      canManageSubscription: true,
      plan,
      status,
      currentPeriodEndsAt: snapshot?.currentPeriodEndsAt,
      willRenew: snapshot?.willRenew,
      capabilities: getPlanCapabilities(plan),
    };
  },
});

const statusValidator = v.union(
  v.literal("active"),
  v.literal("grace_period"),
  v.literal("billing_retry"),
  v.literal("canceled"),
  v.literal("expired"),
  v.literal("refunded"),
  v.literal("unknown"),
);

type SnapshotStatus =
  | "active"
  | "grace_period"
  | "billing_retry"
  | "canceled"
  | "expired"
  | "refunded"
  | "unknown";

type ProviderSnapshotEvent = {
  provider: string;
  providerEventId: string;
  householdAccountId: Id<"householdAccounts">;
  providerAppUserId: string;
  eventType: string;
  productId?: string;
  entitlement?: string;
  status: SnapshotStatus;
  environment: string;
  startedAt?: number;
  currentPeriodEndsAt?: number;
  willRenew?: boolean;
  occurredAt: number;
};

type EventResult = "applied" | "stale" | "duplicate";

/**
 * Shared transactional recorder for trusted, normalized provider events.
 * Provider payload parsing and authentication stay at the HTTP boundary.
 */
async function applyProviderSnapshotEvent(
  ctx: MutationCtx,
  args: ProviderSnapshotEvent,
): Promise<EventResult> {
  const account = await ctx.db.get(args.householdAccountId);
  if (!account) throw new Error("Subscription household account does not exist");

  const owner = await ctx.db.get(account.ownerUserId);
  if (!owner) throw new Error("Subscription household owner does not exist");
  if (args.providerAppUserId !== owner.clerkUserId) {
    throw new Error("Provider app user ID does not match the household owner");
  }

  const duplicate = await ctx.db
    .query("providerEvents")
    .withIndex("by_provider_event_id", (query) =>
      query
        .eq("provider", args.provider)
        .eq("environment", args.environment)
        .eq("providerEventId", args.providerEventId),
    )
    .unique();
  if (duplicate) return "duplicate";

  const receivedAt = Date.now();
  await ctx.db.insert("providerEvents", {
    provider: args.provider,
    providerEventId: args.providerEventId,
    householdAccountId: args.householdAccountId,
    eventType: args.eventType,
    productId: args.productId,
    environment: args.environment,
    occurredAt: args.occurredAt,
    receivedAt,
    processedAt: receivedAt,
  });

  const snapshot = await ctx.db
    .query("subscriptionSnapshots")
    .withIndex("by_household_account_provider_environment", (query) =>
      query
        .eq("householdAccountId", args.householdAccountId)
        .eq("provider", args.provider)
        .eq("environment", args.environment),
    )
    .unique();

  // Events at or before the latest event cannot establish a newer ordering.
  // Keep their compact audit records but never let them roll state backward.
  if (snapshot?.latestProviderEventAt !== undefined && args.occurredAt <= snapshot.latestProviderEventAt) {
    return "stale";
  }

  // RevenueCat cancellation events can omit entitlement_ids. Reuse only the
  // last provider-verified entitlement for this same household/environment so
  // cancellation or grace access remains bounded without trusting aliases or
  // product names.
  const entitlement = args.entitlement ?? (
    args.status === "canceled" || args.status === "grace_period"
      ? snapshot?.entitlement
      : undefined
  );
  const snapshotFields = {
    householdAccountId: args.householdAccountId,
    provider: args.provider,
    providerAppUserId: args.providerAppUserId,
    productId: args.productId,
    entitlement,
    status: args.status,
    environment: args.environment,
    startedAt: args.startedAt,
    currentPeriodEndsAt: args.currentPeriodEndsAt,
    willRenew: args.willRenew,
    latestProviderEventAt: args.occurredAt,
    updatedAt: receivedAt,
  };

  if (snapshot) await ctx.db.patch(snapshot._id, snapshotFields);
  else await ctx.db.insert("subscriptionSnapshots", snapshotFields);

  return "applied";
}

/**
 * Trusted internal ingestion path for normalized provider events. It is not
 * exposed to clients and retains an explicit household-owner identity check.
 */
export const recordProviderSnapshotEvent = internalMutation({
  args: {
    provider: v.string(),
    providerEventId: v.string(),
    householdAccountId: v.id("householdAccounts"),
    providerAppUserId: v.string(),
    eventType: v.string(),
    productId: v.optional(v.string()),
    entitlement: v.optional(v.string()),
    status: statusValidator,
    environment: v.string(),
    startedAt: v.optional(v.number()),
    currentPeriodEndsAt: v.optional(v.number()),
    willRenew: v.optional(v.boolean()),
    occurredAt: v.number(),
  },
  returns: v.union(v.literal("applied"), v.literal("stale"), v.literal("duplicate")),
  handler: async (ctx, args) => await applyProviderSnapshotEvent(ctx, args),
});

/**
 * Resolve the RevenueCat App User ID only through an exact Clerk ID match.
 * Unknown, anonymous, and aliases-only IDs are acknowledged without creating
 * accounts or changing subscription state.
 */
export const ingestRevenueCatEvent = internalMutation({
  args: {
    providerEventId: v.string(),
    providerAppUserId: v.string(),
    eventType: v.string(),
    productId: v.optional(v.string()),
    entitlement: v.optional(v.string()),
    status: statusValidator,
    environment: v.union(v.literal("production"), v.literal("sandbox")),
    startedAt: v.optional(v.number()),
    currentPeriodEndsAt: v.optional(v.number()),
    willRenew: v.optional(v.boolean()),
    occurredAt: v.number(),
  },
  returns: v.union(v.literal("applied"), v.literal("stale"), v.literal("duplicate"), v.literal("ignored")),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", args.providerAppUserId))
      .unique();
    if (!user) return "ignored" as const;

    const householdAccountId = await getOrCreateHouseholdAccount(ctx, user._id);
    return await applyProviderSnapshotEvent(ctx, {
      ...args,
      provider: "revenuecat",
      householdAccountId,
    });
  },
});
