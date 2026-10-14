import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { getOrCreateHouseholdAccount } from "./householdOwnership";

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
