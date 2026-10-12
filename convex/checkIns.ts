import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertCalendarDate } from "./lib/validation";
import { isFeatureEnabled } from "./flags";
import { FEATURE_FLAGS } from "../lib/flags/config";

function validateText(topic: string, note: string) {
  if (!topic.trim() || topic.trim().length > 120) throw new Error("Check-in topic must be between 1 and 120 characters");
  if (!note.trim() || note.trim().length > 2_000) throw new Error("Check-in notes must be between 1 and 2,000 characters");
}

async function requireCheckInAccess(ctx: MutationCtx, stayId: Id<"stays">, guestUserId: Id<"users">) {
  const { user, membership } = await requireMembership(ctx, stayId);
  if (membership.role === "guest" && membership.userId !== guestUserId) throw new Error("Guests can only access their own check-ins");
  const guestMembership = await ctx.db.query("memberships")
    .withIndex("by_stay_user", (q) => q.eq("stayId", stayId).eq("userId", guestUserId))
    .unique();
  if (!guestMembership || guestMembership.status !== "active" || guestMembership.role !== "guest") throw new Error("Check-in guest is not an active member of this stay");
  return { user, membership };
}

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const items = membership.role === "host"
      ? await ctx.db.query("checkIns").withIndex("by_stay_and_date", (q) => q.eq("stayId", stayId)).order("desc").take(100)
      : await ctx.db.query("checkIns").withIndex("by_stay_guest_and_date", (q) => q.eq("stayId", stayId).eq("guestUserId", user._id)).order("desc").take(100);
    const guests = await Promise.all(items.map((item) => ctx.db.get(item.guestUserId)));
    return items.map((item, index) => ({ ...item, guestName: guests[index]?.name ?? "Guest" }));
  },
});

export const create = mutation({
  args: { stayId: v.id("stays"), guestUserId: v.optional(v.id("users")), checkInDate: v.string(), topic: v.string(), note: v.string() },
  returns: v.id("checkIns"),
  handler: async (ctx, args) => {
    if (!await isFeatureEnabled(ctx, FEATURE_FLAGS.CHECK_IN_BOARD)) {
      throw new Error("Weekly check-in board is currently disabled by platform policy.");
    }
    const { user, membership } = await requireMembership(ctx, args.stayId);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot start check-ins");
    const guestUserId = membership.role === "guest" ? user._id : args.guestUserId;
    if (!guestUserId) throw new Error("Choose the guest for this check-in");
    await requireCheckInAccess(ctx, args.stayId, guestUserId);
    assertCalendarDate(args.checkInDate, "Check-in date");
    validateText(args.topic, args.note);
    const now = Date.now();
    const checkInId = await ctx.db.insert("checkIns", { ...args, guestUserId, createdBy: user._id, topic: args.topic.trim(), note: args.note.trim(), status: "open", responses: [], createdAt: now, updatedAt: now });
    await recordActivity(ctx, { stayId: args.stayId, actorUserId: user._id, guestUserId, kind: "check_in", action: "check_in_created", detail: args.topic.trim(), entityId: checkInId });
    return checkInId;
  },
});

export const respond = mutation({
  args: { checkInId: v.id("checkIns"), body: v.string() },
  returns: v.null(),
  handler: async (ctx, { checkInId, body }) => {
    const item = await ctx.db.get(checkInId);
    if (!item) throw new Error("Check-in not found");
    const { user } = await requireCheckInAccess(ctx, item.stayId, item.guestUserId);
    const response = body.trim();
    if (!response || response.length > 2_000) throw new Error("Response must be between 1 and 2,000 characters");
    if (item.status === "resolved") throw new Error("Resolved check-ins cannot receive new responses");
    const now = Date.now();
    await ctx.db.patch(item._id, { responses: [...item.responses, { userId: user._id, body: response, createdAt: now }], updatedAt: now });
    await recordActivity(ctx, { stayId: item.stayId, actorUserId: user._id, guestUserId: item.guestUserId, kind: "check_in", action: "check_in_response", detail: `Response added to ${item.topic}`, entityId: item._id });
    return null;
  },
});

export const setStatus = mutation({
  args: { checkInId: v.id("checkIns"), status: v.union(v.literal("open"), v.literal("follow_up"), v.literal("resolved")) },
  returns: v.null(),
  handler: async (ctx, { checkInId, status }) => {
    const item = await ctx.db.get(checkInId);
    if (!item) throw new Error("Check-in not found");
    const { user } = await requireCheckInAccess(ctx, item.stayId, item.guestUserId);
    if (item.status === status) return null;
    await ctx.db.patch(item._id, { status, updatedAt: Date.now() });
    await recordActivity(ctx, { stayId: item.stayId, actorUserId: user._id, guestUserId: item.guestUserId, kind: "check_in", action: `check_in_${status}`, detail: `${item.topic} marked ${status.replaceAll("_", " ")}`, entityId: item._id });
    return null;
  },
});
