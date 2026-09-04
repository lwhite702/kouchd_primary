import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertContributionInput } from "./lib/validation";

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId }) => {
    await requireMembership(ctx, stayId);
    return await ctx.db.query("contributions").withIndex("by_stay_date", (query) => query.eq("stayId", stayId)).order("desc").take(100);
  },
});

export const create = mutation({
  args: {
    stayId: v.id("stays"),
    type: v.union(v.literal("payment"), v.literal("groceries"), v.literal("supplies"), v.literal("house_work"), v.literal("other")),
    amountCents: v.number(), date: v.string(), note: v.string(), countsTowardBalance: v.boolean(),
  },
  returns: v.id("contributions"),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.stayId);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot add contributions");
    assertContributionInput(args.amountCents, args.date, args.note);
    const contributionId = await ctx.db.insert("contributions", { ...args, createdBy: user._id, status: "pending", createdAt: Date.now() });
    await recordActivity(ctx, { stayId: args.stayId, actorUserId: user._id, kind: "contribution", action: "created", detail: `${args.type} added for confirmation`, entityId: contributionId });
    return contributionId;
  },
});

export const confirm = mutation({
  args: { contributionId: v.id("contributions") },
  returns: v.null(),
  handler: async (ctx, { contributionId }) => {
    const contribution = await ctx.db.get(contributionId);
    if (!contribution) throw new Error("Contribution not found");
    const { user } = await requireMembership(ctx, contribution.stayId);
    if (contribution.createdBy === user._id) throw new Error("Creators cannot confirm their own contribution");
    if (contribution.status === "confirmed") return null;
    if (contribution.status !== "pending") throw new Error("Only pending contributions can be confirmed");
    const now = Date.now();
    await ctx.db.patch(contributionId, { status: "confirmed", confirmedBy: user._id, confirmedAt: now });
    await recordActivity(ctx, { stayId: contribution.stayId, actorUserId: user._id, kind: "contribution", action: "confirmed", detail: "Contribution confirmed by the other member", entityId: contributionId });
    return null;
  },
});

export const dispute = mutation({
  args: { contributionId: v.id("contributions") },
  returns: v.null(),
  handler: async (ctx, { contributionId }) => {
    const contribution = await ctx.db.get(contributionId);
    if (!contribution) throw new Error("Contribution not found");
    const { user } = await requireMembership(ctx, contribution.stayId);
    if (contribution.status === "voided") throw new Error("Voided contributions cannot be disputed");
    await ctx.db.patch(contributionId, { status: "disputed", disputedBy: user._id });
    await recordActivity(ctx, { stayId: contribution.stayId, actorUserId: user._id, kind: "contribution", action: "disputed", detail: "Contribution marked for discussion", entityId: contributionId });
    return null;
  },
});

export const voidContribution = mutation({
  args: { contributionId: v.id("contributions") },
  returns: v.null(),
  handler: async (ctx, { contributionId }) => {
    const contribution = await ctx.db.get(contributionId);
    if (!contribution) throw new Error("Contribution not found");
    const { user, membership } = await requireMembership(ctx, contribution.stayId);
    if (membership.role !== "host" && contribution.createdBy !== user._id) throw new Error("Only the creator or host can void this contribution");
    if (contribution.status === "voided") return null;
    const now = Date.now();
    await ctx.db.patch(contributionId, { status: "voided", voidedBy: user._id, voidedAt: now });
    await recordActivity(ctx, { stayId: contribution.stayId, actorUserId: user._id, kind: "contribution", action: "voided", detail: "Contribution voided; history retained", entityId: contributionId });
    return null;
  },
});
