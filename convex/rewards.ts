import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireHost, requireMembership, resolveFinancialGuest } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertCalendarDate, assertContributionRuleInput, assertPointClaimInput } from "./lib/validation";
import { pointsToCents } from "../lib/domain/rewards";

export const getSettings = query({
  args: { stayId: v.id("stays") },
  returns: v.object({
    enabled: v.boolean(),
    coinName: v.string(),
    centsPerPoint: v.number(),
    maxCreditPerPeriodCents: v.number(),
  }),
  handler: async (ctx, { stayId }) => {
    await requireMembership(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || !stay.currentTermsId) {
      return { enabled: false, coinName: "Coins", centsPerPoint: 100, maxCreditPerPeriodCents: 0 };
    }
    const terms = await ctx.db.get(stay.currentTermsId);
    return terms?.rewards ?? { enabled: false, coinName: "Coins", centsPerPoint: 100, maxCreditPerPeriodCents: 0 };
  },
});

export const listRules = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId }) => {
    await requireMembership(ctx, stayId);
    return await ctx.db
      .query("contributionRules")
      .withIndex("by_stay", (q) => q.eq("stayId", stayId))
      .collect();
  },
});

export const createRule = mutation({
  args: {
    stayId: v.id("stays"),
    title: v.string(),
    category: v.union(v.literal("cleaning"), v.literal("groceries"), v.literal("maintenance"), v.literal("cooking"), v.literal("care"), v.literal("other")),
    pointsAwarded: v.number(),
    description: v.string(),
    cadenceLimit: v.optional(v.string()),
  },
  returns: v.id("contributionRules"),
  handler: async (ctx, args) => {
    const { user } = await requireHost(ctx, args.stayId);
    assertContributionRuleInput(args.title, args.pointsAwarded, args.description);

    const now = Date.now();
    const ruleId = await ctx.db.insert("contributionRules", {
      stayId: args.stayId,
      title: args.title.trim(),
      category: args.category,
      pointsAwarded: args.pointsAwarded,
      description: args.description.trim(),
      cadenceLimit: args.cadenceLimit,
      isActive: true,
      createdAt: now,
    });

    await recordActivity(ctx, {
      stayId: args.stayId,
      actorUserId: user._id,
      kind: "reward",
      action: "rule_created",
      detail: `Contribution rule created: ${args.title.trim()} (${args.pointsAwarded} pts)`,
      entityId: ruleId,
    });

    return ruleId;
  },
});

export const toggleRule = mutation({
  args: { ruleId: v.id("contributionRules") },
  returns: v.boolean(),
  handler: async (ctx, { ruleId }) => {
    const rule = await ctx.db.get(ruleId);
    if (!rule) throw new Error("Contribution rule not found");
    const { user } = await requireHost(ctx, rule.stayId);

    const updatedActive = !rule.isActive;
    await ctx.db.patch(ruleId, { isActive: updatedActive });

    await recordActivity(ctx, {
      stayId: rule.stayId,
      actorUserId: user._id,
      kind: "reward",
      action: updatedActive ? "rule_enabled" : "rule_disabled",
      detail: `Rule ${rule.title} ${updatedActive ? "enabled" : "disabled"}`,
      entityId: ruleId,
    });

    return updatedActive;
  },
});

export const getWallet = query({
  args: { stayId: v.id("stays"), guestUserId: v.optional(v.id("users")) },
  returns: v.any(),
  handler: async (ctx, { stayId, guestUserId: requestedGuestUserId }) => {
    const access = await resolveFinancialGuest(ctx, stayId, requestedGuestUserId);
    if (!access.guestUserId) {
      return {
        availablePoints: 0,
        earnedPoints: 0,
        redeemedPoints: 0,
        dollarEquivalentCents: 0,
        settings: { enabled: false, coinName: "Coins", centsPerPoint: 100, maxCreditPerPeriodCents: 0 },
        claims: [],
        redemptions: [],
      };
    }

    const guestUserId = access.guestUserId;
    const stay = await ctx.db.get(stayId);
    const terms = stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    const settings = terms?.rewards ?? { enabled: false, coinName: "Coins", centsPerPoint: 100, maxCreditPerPeriodCents: 0 };

    const claims = await ctx.db
      .query("pointClaims")
      .withIndex("by_stay_and_guest", (q) => q.eq("stayId", stayId).eq("guestUserId", guestUserId))
      .order("desc")
      .take(100);

    const redemptions = await ctx.db
      .query("pointRedemptions")
      .withIndex("by_stay_and_guest", (q) => q.eq("stayId", stayId).eq("guestUserId", guestUserId))
      .order("desc")
      .take(100);

    const earnedPoints = claims
      .filter((c) => c.status === "confirmed")
      .reduce((sum, c) => sum + c.points, 0);

    const redeemedPoints = redemptions.reduce((sum, r) => sum + r.pointsRedeemed, 0);
    const availablePoints = Math.max(0, earnedPoints - redeemedPoints);
    const dollarEquivalentCents = pointsToCents(availablePoints, settings.centsPerPoint);

    return {
      availablePoints,
      earnedPoints,
      redeemedPoints,
      dollarEquivalentCents,
      settings,
      claims,
      redemptions,
    };
  },
});

export const submitClaim = mutation({
  args: {
    stayId: v.id("stays"),
    ruleId: v.optional(v.id("contributionRules")),
    title: v.string(),
    points: v.number(),
    note: v.string(),
    date: v.string(),
  },
  returns: v.id("pointClaims"),
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.stayId);
    if (membership.role !== "guest") {
      throw new Error("Only guests can submit contribution claims");
    }

    assertPointClaimInput(args.title, args.points, args.note, args.date);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") {
      throw new Error("Ended stays cannot record contribution claims");
    }

    const claimId = await ctx.db.insert("pointClaims", {
      stayId: args.stayId,
      guestUserId: user._id,
      ruleId: args.ruleId,
      title: args.title.trim(),
      points: args.points,
      note: args.note.trim(),
      date: args.date,
      status: "pending",
      createdAt: Date.now(),
    });

    await recordActivity(ctx, {
      stayId: args.stayId,
      actorUserId: user._id,
      guestUserId: user._id,
      kind: "reward",
      action: "claim_submitted",
      detail: `${user.name} submitted a claim for ${args.points} points: ${args.title.trim()}`,
      entityId: claimId,
    });

    return claimId;
  },
});

export const confirmClaim = mutation({
  args: { claimId: v.id("pointClaims") },
  returns: v.null(),
  handler: async (ctx, { claimId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Contribution claim not found");

    const { user } = await requireHost(ctx, claim.stayId);
    if (claim.status === "confirmed") return null;
    if (claim.status !== "pending") {
      throw new Error("Only pending contribution claims can be confirmed");
    }

    const now = Date.now();
    await ctx.db.patch(claimId, {
      status: "confirmed",
      confirmedBy: user._id,
      confirmedAt: now,
    });

    await recordActivity(ctx, {
      stayId: claim.stayId,
      actorUserId: user._id,
      guestUserId: claim.guestUserId,
      kind: "reward",
      action: "claim_confirmed",
      detail: `Host confirmed ${claim.points} points for ${claim.title}`,
      entityId: claimId,
    });

    return null;
  },
});

export const disputeClaim = mutation({
  args: { claimId: v.id("pointClaims") },
  returns: v.null(),
  handler: async (ctx, { claimId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Contribution claim not found");

    const access = await resolveFinancialGuest(ctx, claim.stayId, claim.guestUserId);
    if (claim.status === "voided") throw new Error("Voided claims cannot be disputed");

    await ctx.db.patch(claimId, {
      status: "disputed",
      disputedBy: access.user._id,
    });

    await recordActivity(ctx, {
      stayId: claim.stayId,
      actorUserId: access.user._id,
      guestUserId: claim.guestUserId,
      kind: "reward",
      action: "claim_disputed",
      detail: `Contribution claim for ${claim.title} marked for discussion`,
      entityId: claimId,
    });

    return null;
  },
});

export const voidClaim = mutation({
  args: { claimId: v.id("pointClaims") },
  returns: v.null(),
  handler: async (ctx, { claimId }) => {
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Contribution claim not found");

    const access = await resolveFinancialGuest(ctx, claim.stayId, claim.guestUserId);
    if (access.membership.role !== "host" && claim.guestUserId !== access.user._id) {
      throw new Error("Only the claimant or host can void this claim");
    }
    if (claim.status === "voided") return null;

    const now = Date.now();
    await ctx.db.patch(claimId, {
      status: "voided",
      voidedBy: access.user._id,
      voidedAt: now,
    });

    await recordActivity(ctx, {
      stayId: claim.stayId,
      actorUserId: access.user._id,
      guestUserId: claim.guestUserId,
      kind: "reward",
      action: "claim_voided",
      detail: `Contribution claim for ${claim.title} voided; audit retained`,
      entityId: claimId,
    });

    return null;
  },
});

export const redeem = mutation({
  args: {
    stayId: v.id("stays"),
    points: v.number(),
    date: v.string(),
  },
  returns: v.object({
    pointsRedeemed: v.number(),
    amountCents: v.number(),
    contributionId: v.id("contributions"),
  }),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_stay_user", (q) => q.eq("stayId", args.stayId).eq("userId", user._id))
      .unique();

    if (!membership || membership.status !== "active" || membership.role !== "guest") {
      throw new Error("Only active guests can redeem contribution points");
    }

    assertCalendarDate(args.date, "Redemption date");
    if (!Number.isInteger(args.points) || args.points <= 0) {
      throw new Error("Redemption points must be a positive whole number");
    }

    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") {
      throw new Error("Ended stays cannot redeem contribution points");
    }
    if (!stay.currentTermsId) throw new Error("Stay has no active terms");

    const terms = await ctx.db.get(stay.currentTermsId);
    if (!terms?.rewards?.enabled) {
      throw new Error("Contribution rewards are not enabled for this stay");
    }

    const centsPerPoint = terms.rewards.centsPerPoint;
    const coinName = terms.rewards.coinName;

    // Calculate confirmed points available
    const [claims, redemptions] = await Promise.all([
      ctx.db
        .query("pointClaims")
        .withIndex("by_stay_and_guest", (q) => q.eq("stayId", args.stayId).eq("guestUserId", user._id))
        .collect(),
      ctx.db
        .query("pointRedemptions")
        .withIndex("by_stay_and_guest", (q) => q.eq("stayId", args.stayId).eq("guestUserId", user._id))
        .collect(),
    ]);

    const earned = claims
      .filter((c) => c.status === "confirmed")
      .reduce((sum, c) => sum + c.points, 0);

    const alreadyRedeemed = redemptions.reduce((sum, r) => sum + r.pointsRedeemed, 0);
    const available = Math.max(0, earned - alreadyRedeemed);

    if (args.points > available) {
      throw new Error(`Insufficient ${coinName}. Available: ${available}, requested: ${args.points}`);
    }

    const amountCents = pointsToCents(args.points, centsPerPoint);
    if (amountCents <= 0) throw new Error("Points redeem to 0 cents");

    const now = Date.now();

    // Insert into contributions table as confirmed credit
    const contributionId = await ctx.db.insert("contributions", {
      stayId: args.stayId,
      guestUserId: user._id,
      createdBy: user._id,
      type: "house_work",
      amountCents,
      date: args.date,
      note: `Redeemed ${args.points} ${coinName} for stay credit`,
      countsTowardBalance: true,
      status: "confirmed",
      confirmedBy: user._id,
      confirmedAt: now,
      createdAt: now,
    });

    await ctx.db.insert("pointRedemptions", {
      stayId: args.stayId,
      guestUserId: user._id,
      pointsRedeemed: args.points,
      amountCents,
      date: args.date,
      contributionId,
      createdAt: now,
    });

    await recordActivity(ctx, {
      stayId: args.stayId,
      actorUserId: user._id,
      guestUserId: user._id,
      kind: "reward",
      action: "points_redeemed",
      detail: `${user.name} converted ${args.points} ${coinName} to $${(amountCents / 100).toFixed(2)} stay credit`,
      entityId: contributionId,
    });

    return {
      pointsRedeemed: args.points,
      amountCents,
      contributionId,
    };
  },
});
