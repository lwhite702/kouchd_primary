import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { resolveFinancialGuest } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertContributionInput } from "./lib/validation";

export const list = query({
  args: { stayId: v.id("stays"), guestUserId: v.optional(v.id("users")) },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId, guestUserId: requestedGuestUserId }) => {
    const access = await resolveFinancialGuest(ctx, stayId, requestedGuestUserId);
    if (!access.guestUserId) return [];
    const scoped = await ctx.db
      .query("contributions")
      .withIndex("by_stay_guest_and_date", (query) => query.eq("stayId", stayId).eq("guestUserId", access.guestUserId))
      .order("desc")
      .take(100);
    if (!access.includeLegacyUnscoped) return scoped;
    const legacy = await ctx.db
      .query("contributions")
      .withIndex("by_stay_guest_and_date", (query) => query.eq("stayId", stayId).eq("guestUserId", undefined))
      .order("desc")
      .take(100);
    return [...scoped, ...legacy]
      .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt - left.createdAt)
      .slice(0, 100);
  },
});

export const create = mutation({
  args: {
    stayId: v.id("stays"),
    guestUserId: v.optional(v.id("users")),
    type: v.union(v.literal("payment"), v.literal("groceries"), v.literal("supplies"), v.literal("house_work"), v.literal("other")),
    amountCents: v.number(), date: v.string(), note: v.string(), countsTowardBalance: v.boolean(),
  },
  returns: v.id("contributions"),
  handler: async (ctx, args) => {
    const { user, guestUserId } = await resolveFinancialGuest(ctx, args.stayId, args.guestUserId);
    if (!guestUserId) throw new Error("Add a guest before recording contributions");
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot add contributions");
    assertContributionInput(args.amountCents, args.date, args.note);
    const contributionId = await ctx.db.insert("contributions", { ...args, guestUserId, createdBy: user._id, status: "pending", createdAt: Date.now() });
    await recordActivity(ctx, { stayId: args.stayId, actorUserId: user._id, guestUserId, kind: "contribution", action: "created", detail: `${args.type} added for confirmation`, entityId: contributionId });
    return contributionId;
  },
});

export const confirm = mutation({
  args: { contributionId: v.id("contributions") },
  returns: v.null(),
  handler: async (ctx, { contributionId }) => {
    const contribution = await ctx.db.get(contributionId);
    if (!contribution) throw new Error("Contribution not found");
    const access = await resolveFinancialGuest(ctx, contribution.stayId, contribution.guestUserId);
    const { user } = access;
    if (!contribution.guestUserId && !access.includeLegacyUnscoped && access.membership.role !== "host") throw new Error("Not authorized for this financial record");
    if (contribution.createdBy === user._id) throw new Error("Creators cannot confirm their own contribution");
    if (contribution.status === "confirmed") return null;
    if (contribution.status !== "pending") throw new Error("Only pending contributions can be confirmed");
    const now = Date.now();
    await ctx.db.patch(contributionId, { status: "confirmed", confirmedBy: user._id, confirmedAt: now });
    await recordActivity(ctx, { stayId: contribution.stayId, actorUserId: user._id, guestUserId: contribution.guestUserId, kind: "contribution", action: "confirmed", detail: "Contribution confirmed by the other member", entityId: contributionId });
    return null;
  },
});

export const dispute = mutation({
  args: { contributionId: v.id("contributions") },
  returns: v.null(),
  handler: async (ctx, { contributionId }) => {
    const contribution = await ctx.db.get(contributionId);
    if (!contribution) throw new Error("Contribution not found");
    const access = await resolveFinancialGuest(ctx, contribution.stayId, contribution.guestUserId);
    const { user } = access;
    if (!contribution.guestUserId && !access.includeLegacyUnscoped && access.membership.role !== "host") throw new Error("Not authorized for this financial record");
    if (contribution.status === "voided") throw new Error("Voided contributions cannot be disputed");
    await ctx.db.patch(contributionId, { status: "disputed", disputedBy: user._id });
    await recordActivity(ctx, { stayId: contribution.stayId, actorUserId: user._id, guestUserId: contribution.guestUserId, kind: "contribution", action: "disputed", detail: "Contribution marked for discussion", entityId: contributionId });
    return null;
  },
});

export const voidContribution = mutation({
  args: { contributionId: v.id("contributions") },
  returns: v.null(),
  handler: async (ctx, { contributionId }) => {
    const contribution = await ctx.db.get(contributionId);
    if (!contribution) throw new Error("Contribution not found");
    const access = await resolveFinancialGuest(ctx, contribution.stayId, contribution.guestUserId);
    const { user, membership } = access;
    if (!contribution.guestUserId && !access.includeLegacyUnscoped && membership.role !== "host") throw new Error("Not authorized for this financial record");
    if (membership.role !== "host" && contribution.createdBy !== user._id) throw new Error("Only the creator or host can void this contribution");
    if (contribution.status === "voided") return null;
    const now = Date.now();
    await ctx.db.patch(contributionId, { status: "voided", voidedBy: user._id, voidedAt: now });
    await recordActivity(ctx, { stayId: contribution.stayId, actorUserId: user._id, guestUserId: contribution.guestUserId, kind: "contribution", action: "voided", detail: "Contribution voided; history retained", entityId: contributionId });
    return null;
  },
});
