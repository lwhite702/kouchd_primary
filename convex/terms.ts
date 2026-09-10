import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { ensureObligationsForTerms } from "./lib/obligations";
import { assertStayTerms } from "./lib/validation";

const termsInput = {
  startDate: v.string(),
  endDate: v.string(),
  cadence: v.union(v.literal("daily"), v.literal("weekly")),
  rateCents: v.number(),
  earlyDiscountEnabled: v.boolean(),
  earlyDiscountPercentage: v.number(),
  earlyDiscountDays: v.number(),
  lateFeeEnabled: v.boolean(),
  lateFeeCents: v.number(),
  graceDays: v.number(),
  houseNotes: v.string(),
  houseRules: v.optional(
    v.array(
      v.object({
        id: v.string(),
        category: v.string(),
        title: v.string(),
        description: v.string(),
        required: v.boolean(),
      })
    )
  ),
  rewards: v.optional(
    v.object({
      enabled: v.boolean(),
      coinName: v.string(),
      centsPerPoint: v.number(),
      maxCreditPerPeriodCents: v.number(),
    })
  ),
};

export const acceptCurrent = mutation({
  args: { stayId: v.id("stays") },
  returns: v.union(v.literal("pending"), v.literal("active")),
  handler: async (ctx, { stayId }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || !stay.currentTermsId || stay.status === "ended") throw new Error("No active terms to accept");
    const termsId = stay.currentTermsId;
    const existing = await ctx.db.query("termsAcceptances").withIndex("by_terms_user", (query) => query.eq("termsId", termsId).eq("userId", user._id)).unique();
    if (!existing) await ctx.db.insert("termsAcceptances", { stayId, termsId, userId: user._id, acceptedAt: Date.now() });
    if (membership.acceptedTermsId !== termsId) await ctx.db.patch(membership._id, { acceptedTermsId: termsId });
    if (membership.role === "guest") {
      await ensureObligationsForTerms(ctx, stayId, termsId, user._id, user._id);
    }
    const memberships = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stayId)).take(50);
    const activeMemberships = memberships.filter((member) => member.status === "active");
    const allAccepted = activeMemberships.length >= 2
      && activeMemberships.every((member) => member.userId === user._id ? true : member.acceptedTermsId === termsId);
    if (allAccepted) {
      if (stay.status !== "active") await ctx.db.patch(stayId, { status: "active", updatedAt: Date.now() });
    }
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "terms", action: "accepted", detail: "Current stay terms accepted", entityId: termsId });
    return allAccepted ? "active" : "pending";
  },
});

export const updateCurrent = mutation({
  args: { stayId: v.id("stays"), terms: v.object(termsInput) },
  returns: v.id("terms"),
  handler: async (ctx, { stayId, terms }) => {
    const { user, membership } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    assertStayTerms(terms);
    const previous = stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    const now = Date.now();
    const termsId = await ctx.db.insert("terms", { stayId, version: (previous?.version ?? 0) + 1, ...terms, createdBy: user._id, createdAt: now });
    await ctx.db.patch(stayId, { currentTermsId: termsId, status: "pending", updatedAt: now });
    await ctx.db.insert("termsAcceptances", { stayId, termsId, userId: user._id, acceptedAt: now });
    await ctx.db.patch(membership._id, { acceptedTermsId: termsId });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "terms", action: "updated", detail: `Terms version ${(previous?.version ?? 0) + 1} created`, entityId: termsId });
    return termsId;
  },
});
