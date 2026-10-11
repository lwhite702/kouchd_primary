import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * Ingests a normalized, already-verified subscription event from a trusted
 * server-side provider adapter. Webhook verification and provider-specific
 * parsing belong outside this mutation.
 *
 * Only compact event metadata is retained. Provider app user IDs are used to
 * refresh the private snapshot and are deliberately not copied into the event
 * log. This endpoint is internal-only and must not be called from clients.
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
    status: v.union(
      v.literal("active"),
      v.literal("grace_period"),
      v.literal("billing_retry"),
      v.literal("canceled"),
      v.literal("expired"),
      v.literal("refunded"),
      v.literal("unknown"),
    ),
    environment: v.string(),
    startedAt: v.optional(v.number()),
    currentPeriodEndsAt: v.optional(v.number()),
    willRenew: v.optional(v.boolean()),
    occurredAt: v.number(),
  },
  returns: v.union(
    v.literal("applied"),
    v.literal("stale"),
    v.literal("duplicate"),
  ),
  handler: async (ctx, args) => {
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

    if (duplicate) return "duplicate" as const;

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

    // Events at or before the current timestamp cannot establish a newer
    // ordering. They remain in the compact audit log but cannot roll the
    // snapshot backward or replace it ambiguously.
    if (snapshot?.latestProviderEventAt !== undefined && args.occurredAt <= snapshot.latestProviderEventAt) {
      return "stale" as const;
    }

    const snapshotFields = {
      householdAccountId: args.householdAccountId,
      provider: args.provider,
      providerAppUserId: args.providerAppUserId,
      productId: args.productId,
      entitlement: args.entitlement,
      status: args.status,
      environment: args.environment,
      startedAt: args.startedAt,
      currentPeriodEndsAt: args.currentPeriodEndsAt,
      willRenew: args.willRenew,
      latestProviderEventAt: args.occurredAt,
      updatedAt: receivedAt,
    };

    if (snapshot) {
      await ctx.db.patch(snapshot._id, snapshotFields);
    } else {
      await ctx.db.insert("subscriptionSnapshots", snapshotFields);
    }

    return "applied" as const;
  },
});
