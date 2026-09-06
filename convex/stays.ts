import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertCalendarDate, assertStayTerms, assertTimezone } from "./lib/validation";

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
};

export const create = mutation({
  args: { timezone: v.string(), nextCheckInDate: v.optional(v.string()), terms: v.object(termsInput) },
  returns: v.id("stays"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertTimezone(args.timezone);
    assertStayTerms(args.terms);
    if (args.nextCheckInDate) assertCalendarDate(args.nextCheckInDate, "Next check-in date");
    const now = Date.now();
    const stayId = await ctx.db.insert("stays", { hostUserId: user._id, status: "pending", timezone: args.timezone, nextCheckInDate: args.nextCheckInDate, createdAt: now, updatedAt: now });
    await ctx.db.insert("memberships", { stayId, userId: user._id, role: "host", status: "active", joinedAt: now });
    const termsId = await ctx.db.insert("terms", { stayId, version: 1, ...args.terms, createdBy: user._id, createdAt: now });
    await ctx.db.patch(stayId, { currentTermsId: termsId });
    await ctx.db.insert("termsAcceptances", { stayId, termsId, userId: user._id, acceptedAt: now });
    const membership = await ctx.db.query("memberships").withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", user._id)).unique();
    if (membership) await ctx.db.patch(membership._id, { acceptedTermsId: termsId });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "stay", action: "created", detail: "Stay and first terms version created", entityId: stayId });
    return stayId;
  },
});

export const listMine = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const memberships = await ctx.db.query("memberships").withIndex("by_user", (query) => query.eq("userId", user._id)).take(50);
    const results = [];
    for (const membership of memberships) {
      if (membership.status !== "active") continue;
      const stay = await ctx.db.get(membership.stayId);
      if (stay) results.push({ stay, membership });
    }
    return results;
  },
});

export const getBundle = query({
  args: { stayId: v.id("stays") },
  returns: v.any(),
  handler: async (ctx, { stayId }) => {
    const { membership } = await requireMembership(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay) throw new Error("Stay not found");
    const terms = stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    const memberships = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stayId)).take(50);
    const members = [];
    for (const item of memberships) {
      const person = await ctx.db.get(item.userId);
      if (person) members.push({ membership: item, person: { id: person._id, name: person.name, imageUrl: person.imageUrl } });
    }
    return { stay, terms, membership, members };
  },
});

export const end = mutation({
  args: { stayId: v.id("stays") },
  returns: v.null(),
  handler: async (ctx, { stayId }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay) throw new Error("Stay not found");
    if (stay.status === "ended") return null;
    const now = Date.now();
    await ctx.db.patch(stayId, { status: "ended", endedAt: now, updatedAt: now });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "stay", action: "ended", detail: "Stay ended and record retained", entityId: stayId });
    return null;
  },
});
