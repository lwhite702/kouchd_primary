import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getOrCreateHouseholdAccount } from "./householdOwnership";
import { getEffectiveSubscriptionForAccount } from "./lib/subscriptionAccess";
import { requireCurrentUser } from "./lib/auth";
import { getPlanUsage, publicPlanName } from "./lib/planCapacity";
import { resolveMemberName } from "./lib/names";
import { assertInviteHash, assertReferralCode } from "./lib/validation";
import { normalizeReferralCode } from "../lib/referral";
import { getPlanCapabilities, getPlanLimits, type SubscriptionPlan } from "../lib/domain/subscriptionPlans";

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
    /** Public plan name for display: the UI never shows internal plan names. */
    planName: v.optional(v.union(v.literal("free"), v.literal("plus"), v.literal("pro"))),
    isTrial: v.optional(v.boolean()),
    productId: v.optional(v.string()),
    store: v.optional(v.union(v.literal("app_store"), v.literal("web"), v.literal("other"))),
    trialReminderEnabled: v.optional(v.boolean()),
    /** Cross-platform answer used for paywall wording; purchases also need the signed JWS. */
    introOfferEligible: v.optional(v.boolean()),
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
        planName: "free" as const,
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
      planName: publicPlanName(plan),
      isTrial: plan !== "starter" && snapshot?.periodType === "trial",
      productId: snapshot?.productId,
      store: snapshot?.store,
      trialReminderEnabled: account?.trialReminderOptOut !== true,
      introOfferEligible: await isIntroOfferEligible(ctx, account?._id ?? null),
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

const periodTypeValidator = v.union(v.literal("trial"), v.literal("intro"), v.literal("normal"));
const storeValidator = v.union(v.literal("app_store"), v.literal("web"), v.literal("other"));

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
  periodType?: "trial" | "intro" | "normal";
  store?: "app_store" | "web" | "other";
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
    // Cancellation and billing events can omit these; keep the last known values.
    periodType: args.periodType ?? snapshot?.periodType,
    store: args.store ?? snapshot?.store,
    latestProviderEventAt: args.occurredAt,
    updatedAt: receivedAt,
  };

  if (snapshot) await ctx.db.patch(snapshot._id, snapshotFields);
  else await ctx.db.insert("subscriptionSnapshots", snapshotFields);

  if (snapshotFields.periodType === "trial" && snapshotFields.currentPeriodEndsAt !== snapshot?.currentPeriodEndsAt) {
    await scheduleTrialReminderIfNeeded(ctx, snapshotFields);
  }

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
    periodType: v.optional(periodTypeValidator),
    store: v.optional(storeValidator),
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
    periodType: v.optional(periodTypeValidator),
    store: v.optional(storeValidator),
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

const TRIAL_REMINDER_LEAD_MS = 2 * 24 * 60 * 60 * 1000;
export const TRIAL_REMINDER_WORKFLOW = "plus-trial-ending";

/**
 * Queue the "trial ends in 2 days" email when a trial starts or its end date
 * moves. The job re-checks everything when it runs, so a stale schedule (the
 * trial was cancelled, converted early, or the host opted out) sends nothing.
 */
export async function scheduleTrialReminderIfNeeded(
  ctx: MutationCtx,
  args: Pick<ProviderSnapshotEvent, "householdAccountId" | "status" | "periodType" | "currentPeriodEndsAt" | "willRenew" | "environment">,
) {
  if (args.status !== "active" || args.periodType !== "trial" || args.willRenew === false) return;
  if (args.currentPeriodEndsAt === undefined) return;
  const sendAt = args.currentPeriodEndsAt - TRIAL_REMINDER_LEAD_MS;
  if (sendAt <= Date.now()) return;
  await ctx.scheduler.runAt(sendAt, internal.subscriptions.sendTrialEndingReminder, {
    householdAccountId: args.householdAccountId,
    environment: args.environment,
    trialEndsAt: args.currentPeriodEndsAt,
  });
}

export const sendTrialEndingReminder = internalMutation({
  args: {
    householdAccountId: v.id("householdAccounts"),
    environment: v.string(),
    trialEndsAt: v.number(),
  },
  returns: v.union(v.literal("queued"), v.literal("skipped")),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.householdAccountId);
    if (!account || account.trialReminderOptOut) return "skipped" as const;
    if (process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT !== args.environment) return "skipped" as const;
    const { snapshot } = await getEffectiveSubscriptionForAccount(ctx, account._id, args.environment);
    if (!snapshot
      || snapshot.status !== "active"
      || snapshot.periodType !== "trial"
      || snapshot.willRenew === false
      || snapshot.currentPeriodEndsAt !== args.trialEndsAt) {
      return "skipped" as const;
    }
    // Email only: push does not exist yet, and SMS delivery is not verified.
    // The entityId makes Knock delivery idempotent per trial end date.
    await ctx.scheduler.runAfter(0, internal.knock.triggerWorkflow, {
      userId: account.ownerUserId,
      workflow: TRIAL_REMINDER_WORKFLOW,
      entityId: `plus-trial:${args.trialEndsAt}`,
      data: {
        planName: "Plus",
        trialEndsAt: new Date(args.trialEndsAt).toISOString(),
        boughtOn: snapshot.store === "app_store" ? "iPhone" : snapshot.store === "web" ? "web" : "other",
        manageUrl: snapshot.store === "app_store"
          ? "https://apps.apple.com/account/subscriptions"
          : "https://app.kouchd.com/settings",
        detail: "Your Kouchd Plus free trial ends in 2 days.",
        action: "trial_ending",
      },
    });
    return "queued" as const;
  },
});

/** Host turns the trial-ending email on or off (P4 / Settings → Plan). */
export const setTrialReminder = mutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { enabled }) => {
    const user = await requireCurrentUser(ctx);
    const account = await ctx.db
      .query("householdAccounts")
      .withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", user._id))
      .unique();
    if (!account) throw new Error("Only a host with a Kouchd plan can change this reminder.");
    await ctx.db.patch(account._id, { trialReminderOptOut: !enabled, updatedAt: Date.now() });
    return null;
  },
});

const BLOCKED_JOIN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Host-only view of guest spots across every pending and active stay on the
 * billing account, with blocked join attempts. Guests get null: they never see
 * plan limits, prices, or Plus.
 */
export const planUsage = query({
  args: {},
  returns: v.union(v.null(), v.object({
    plan: v.union(v.literal("free"), v.literal("plus"), v.literal("pro")),
    planConfigured: v.boolean(),
    stays: v.object({ used: v.number(), limit: v.union(v.number(), v.null()) }),
    guests: v.object({ used: v.number(), limit: v.union(v.number(), v.null()) }),
    guestSpots: v.array(v.object({
      stayId: v.id("stays"),
      stayName: v.string(),
      guestUserId: v.id("users"),
      guestName: v.string(),
      pendingAgreement: v.boolean(),
    })),
    blockedJoins: v.array(v.object({
      id: v.id("blockedJoins"),
      stayId: v.id("stays"),
      stayName: v.string(),
      guestName: v.string(),
      attemptedAt: v.number(),
    })),
  })),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const account = await ctx.db
      .query("householdAccounts")
      .withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", user._id))
      .unique();
    const hostStay = await ctx.db
      .query("stays")
      .withIndex("by_host_user_id", (q) => q.eq("hostUserId", user._id))
      .first();
    if (!account && !hostStay) return null;

    const usage = await getPlanUsage(ctx, user._id, account?._id);
    const effectivePlan = usage.plan ?? "starter";
    const limits = getPlanLimits(effectivePlan);
    const stayName = (stay: Doc<"stays">) => stay.name ?? "Shared stay";
    const staysById = new Map(usage.stays.map((stay) => [stay._id, stay]));

    const guestSpots = await Promise.all(usage.guestMemberships.map(async (membership) => {
      const person = await ctx.db.get(membership.userId);
      const offer = await ctx.db.query("agreementOffers")
        .withIndex("by_stay_guest", (q) => q.eq("stayId", membership.stayId).eq("guestUserId", membership.userId))
        .order("desc").first();
      return {
        stayId: membership.stayId,
        stayName: stayName(staysById.get(membership.stayId)!),
        guestUserId: membership.userId,
        guestName: membership.preferredName ?? resolveMemberName({ existingName: person?.name, email: person?.email, role: "guest" }),
        pendingAgreement: offer?.status === "pending",
      };
    }));

    const since = Date.now() - BLOCKED_JOIN_WINDOW_MS;
    const blockedRows = await ctx.db.query("blockedJoins")
      .withIndex("by_host_attempted", (q) => q.eq("hostUserId", usage.billingOwnerId).gt("attemptedAt", since))
      .order("desc").take(20);
    const blockedJoins = (await Promise.all(blockedRows.map(async (row) => {
      const stay = staysById.get(row.stayId) ?? await ctx.db.get(row.stayId);
      if (!stay || stay.status === "ended") return null;
      const person = await ctx.db.get(row.guestUserId);
      return {
        id: row._id,
        stayId: row.stayId,
        stayName: stayName(stay),
        guestName: resolveMemberName({ existingName: person?.name, email: person?.email, role: "guest" }),
        attemptedAt: row.attemptedAt,
      };
    }))).filter((row) => row !== null);

    return {
      plan: publicPlanName(effectivePlan),
      planConfigured: usage.plan !== null,
      stays: { used: usage.stays.length, limit: limits.maxActiveStays },
      guests: { used: usage.guestMemberships.length, limit: limits.maxActiveGuests },
      guestSpots,
      blockedJoins,
    };
  },
});

/**
 * Called by a guest's app after a join was refused with the plan-limit error.
 * The refusal itself rolls back, so the attempt is recorded here, and only if
 * the host's guest spots are in fact full right now. The guest learns nothing
 * about the host's plan from this call.
 */
export const recordBlockedJoin = mutation({
  args: { referralCode: v.optional(v.string()), tokenHash: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    let stay: Doc<"stays"> | null = null;
    if (args.referralCode) {
      assertReferralCode(args.referralCode);
      const referralCode = normalizeReferralCode(args.referralCode);
      stay = await ctx.db.query("stays").withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode)).first();
    } else if (args.tokenHash) {
      assertInviteHash(args.tokenHash);
      const tokenHash = args.tokenHash;
      const invite = await ctx.db.query("invites").withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash)).unique();
      if (invite && !invite.usedAt && invite.expiresAt > Date.now()) stay = await ctx.db.get(invite.stayId);
    }
    if (!stay || stay.status === "ended") return null;
    const stayId = stay._id;
    const existingMembership = await ctx.db.query("memberships")
      .withIndex("by_stay_user", (q) => q.eq("stayId", stayId).eq("userId", user._id)).unique();
    if (existingMembership?.status === "active") return null;

    const usage = await getPlanUsage(ctx, stay.hostUserId, stay.householdAccountId);
    const limit = getPlanLimits(usage.plan ?? "starter").maxActiveGuests;
    if (limit === null || usage.guestMemberships.length < limit) return null;

    const existing = await ctx.db.query("blockedJoins")
      .withIndex("by_stay_guest", (q) => q.eq("stayId", stayId).eq("guestUserId", user._id)).first();
    const now = Date.now();
    if (existing) await ctx.db.patch(existing._id, { attemptedAt: now });
    else await ctx.db.insert("blockedJoins", { stayId, hostUserId: usage.billingOwnerId, guestUserId: user._id, attemptedAt: now });
    return null;
  },
});

export const dismissBlockedJoin = mutation({
  args: { blockedJoinId: v.id("blockedJoins") },
  returns: v.null(),
  handler: async (ctx, { blockedJoinId }) => {
    const user = await requireCurrentUser(ctx);
    const row = await ctx.db.get(blockedJoinId);
    if (!row) return null;
    if (row.hostUserId !== user._id) throw new Error("Only the host can dismiss this.");
    await ctx.db.delete(row._id);
    return null;
  },
});

/** Remove a guest's blocked-join note once they are in. */
export async function clearBlockedJoins(ctx: MutationCtx, stayId: Id<"stays">, guestUserId: Id<"users">) {
  const rows = await ctx.db.query("blockedJoins")
    .withIndex("by_stay_guest", (q) => q.eq("stayId", stayId).eq("guestUserId", guestUserId)).take(10);
  for (const row of rows) await ctx.db.delete(row._id);
}

/**
 * One free trial per host billing account across web and iPhone. Any
 * subscription the account has ever had, through any store, ends eligibility:
 * snapshots are kept for every provider and environment and never deleted.
 */
export async function isIntroOfferEligible(ctx: QueryCtx | MutationCtx, householdAccountId: Id<"householdAccounts"> | null) {
  if (!householdAccountId) return true;
  const environment = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
  if (environment !== "production" && environment !== "sandbox") return false;
  const prior = await ctx.db.query("subscriptionSnapshots")
    .withIndex("by_household_environment_updated", (q) => q.eq("householdAccountId", householdAccountId).eq("environment", environment))
    .first();
  return prior === null;
}

/** Internal read for the signing action; the caller is the signed-in host. */
export const introOfferEligibilityForViewer = internalQuery({
  args: { clerkUserId: v.string() },
  returns: v.union(v.null(), v.object({ eligible: v.boolean() })),
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db.query("users").withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user) return null;
    const account = await ctx.db.query("householdAccounts")
      .withIndex("by_owner_user_id", (q) => q.eq("ownerUserId", user._id)).unique();
    const hostStay = await ctx.db.query("stays").withIndex("by_host_user_id", (q) => q.eq("hostUserId", user._id)).first();
    // Guests never buy Plus.
    if (!account && !hostStay) return null;
    return { eligible: await isIntroOfferEligible(ctx, account?._id ?? null) };
  },
});
