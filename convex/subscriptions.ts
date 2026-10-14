import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { getOrCreateHouseholdAccount } from "./householdOwnership";
import { isFoundingHostProductAllowed } from "../lib/domain/revenuecatWebhook";

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

type KnownEntitlement = "plus" | "pro" | "founding_host";

type ProviderSnapshotEvent = {
  provider: string;
  providerEventId: string;
  householdAccountId: Id<"householdAccounts">;
  providerAppUserId: string;
  eventType: string;
  productId?: string;
  sourceKey?: string;
  entitlement?: string;
  entitlements?: KnownEntitlement[];
  status: SnapshotStatus;
  environment: string;
  startedAt?: number;
  currentPeriodEndsAt?: number;
  willRenew?: boolean;
  occurredAt: number;
};

type EventResult = "applied" | "stale" | "duplicate" | "ignored";

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

  // Legacy RevenueCat lifecycle events sometimes omit entitlement_ids. Reuse
  // only the last verified plan for this same household/provider/environment.
  const inferredSnapshotEntitlement = ["canceled", "grace_period", "expired", "refunded"].includes(args.status)
    ? snapshot?.entitlement
    : undefined;
  const requestedEntitlements = args.entitlements?.length
    ? args.entitlements
    : args.entitlement
      ? [args.entitlement as "plus" | "pro"]
      : inferredSnapshotEntitlement
        ? [inferredSnapshotEntitlement as "plus" | "pro"]
        : [];
  const targets = [...new Set(requestedEntitlements)]
    .filter((value): value is KnownEntitlement =>
      value === "plus" || value === "pro" || value === "founding_host",
    );
  const sourceKey = args.sourceKey ?? (args.productId ? `product:${args.productId}` : "legacy");
  const foundingProductAllowed = isFoundingHostProductAllowed(
    args.productId,
    process.env.REVENUECAT_FOUNDING_HOST_PRODUCT_IDS,
  );

  let grantApplied = false;
  let invalidFoundingHostEvent = false;
  for (const entitlement of targets) {
    const grant = await ctx.db
      .query("subscriptionEntitlementGrants")
      .withIndex("by_household_provider_environment_entitlement_source", (query) =>
        query
          .eq("householdAccountId", args.householdAccountId)
          .eq("provider", args.provider)
          .eq("environment", args.environment)
          .eq("entitlement", entitlement)
          .eq("sourceKey", sourceKey),
      )
      .unique();
    if (grant?.latestProviderEventAt !== undefined && args.occurredAt <= grant.latestProviderEventAt) continue;

    const verifiedFoundingHostPurchase = args.eventType === "NON_RENEWING_PURCHASE";
    const verifiedFoundingHostRefundReversal = args.eventType === "REFUND_REVERSED" && grant?.status === "refunded";
    const lifetime = entitlement === "founding_host" && foundingProductAllowed &&
      (verifiedFoundingHostPurchase || verifiedFoundingHostRefundReversal) &&
      args.status === "active" && args.currentPeriodEndsAt === undefined;

    // Never create or renew Founding Host access unless the exact allowlisted
    // product, purchase evidence, and finite/lifetime shape are all verified.
    // Reversal must also target the same source row that was refunded.
    if (entitlement === "founding_host") {
      const terminalEventAllowed = ["CANCELLATION", "EXPIRATION", "REFUND"].includes(args.eventType) &&
        foundingProductAllowed && grant?.productId === args.productId;
      if (args.status === "active" && !lifetime) {
        invalidFoundingHostEvent = true;
        continue;
      }
      if (args.eventType === "REFUND_REVERSED" && !verifiedFoundingHostRefundReversal) {
        invalidFoundingHostEvent = true;
        continue;
      }
      if (args.status !== "active" && !terminalEventAllowed) {
        invalidFoundingHostEvent = true;
        continue;
      }
    }

    const fields = {
      householdAccountId: args.householdAccountId,
      provider: args.provider,
      providerAppUserId: args.providerAppUserId,
      environment: args.environment,
      sourceKey,
      entitlement,
      status: args.status,
      productId: args.productId,
      startedAt: args.startedAt,
      currentPeriodEndsAt: lifetime ? undefined : args.currentPeriodEndsAt,
      lifetime,
      willRenew: args.willRenew,
      latestProviderEventAt: args.occurredAt,
      updatedAt: receivedAt,
    };
    if (grant) await ctx.db.patch(grant._id, fields);
    else await ctx.db.insert("subscriptionEntitlementGrants", fields);
    grantApplied = true;
  }

  // Keep the old snapshot for compatibility, but never let one entitlement
  // overwrite the independent grants used by the server resolver.
  const snapshotIsStale = snapshot?.latestProviderEventAt !== undefined &&
    args.occurredAt <= snapshot.latestProviderEventAt;
  if (!snapshotIsStale && (!invalidFoundingHostEvent || grantApplied)) {
    const snapshotEntitlement = args.entitlement ??
      (targets.includes("pro") ? "pro" : targets.includes("plus") ? "plus" : snapshot?.entitlement);
    const snapshotFields = {
      householdAccountId: args.householdAccountId,
      provider: args.provider,
      providerAppUserId: args.providerAppUserId,
      productId: args.productId,
      entitlement: snapshotEntitlement,
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
  }

  if (grantApplied || (!snapshotIsStale && !invalidFoundingHostEvent)) return "applied";
  if (invalidFoundingHostEvent) return "ignored";
  return "stale";
}

export const recordProviderSnapshotEvent = internalMutation({
  args: {
    provider: v.string(),
    providerEventId: v.string(),
    householdAccountId: v.id("householdAccounts"),
    providerAppUserId: v.string(),
    eventType: v.string(),
    productId: v.optional(v.string()),
    sourceKey: v.optional(v.string()),
    entitlement: v.optional(v.string()),
    entitlements: v.optional(v.array(v.union(v.literal("plus"), v.literal("pro"), v.literal("founding_host")))),
    status: statusValidator,
    environment: v.string(),
    startedAt: v.optional(v.number()),
    currentPeriodEndsAt: v.optional(v.number()),
    willRenew: v.optional(v.boolean()),
    occurredAt: v.number(),
  },
  returns: v.union(v.literal("applied"), v.literal("stale"), v.literal("duplicate"), v.literal("ignored")),
  handler: async (ctx, args) => await applyProviderSnapshotEvent(ctx, args),
});

/** Resolve only the exact Clerk user; aliases and anonymous IDs never grant access. */
export const ingestRevenueCatEvent = internalMutation({
  args: {
    providerEventId: v.string(),
    providerAppUserId: v.string(),
    eventType: v.string(),
    productId: v.optional(v.string()),
    sourceKey: v.optional(v.string()),
    entitlement: v.optional(v.string()),
    entitlements: v.optional(v.array(v.union(v.literal("plus"), v.literal("pro"), v.literal("founding_host")))),
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
