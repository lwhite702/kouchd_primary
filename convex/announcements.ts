import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertAnnouncementInput } from "./lib/validation";

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId }) => {
    await requireMembership(ctx, stayId);
    return await ctx.db
      .query("announcements")
      .withIndex("by_stay", (query) => query.eq("stayId", stayId))
      .order("desc")
      .take(100);
  },
});

export const create = mutation({
  args: { stayId: v.id("stays"), title: v.string(), body: v.string(), pinnedUntil: v.optional(v.string()) },
  returns: v.id("announcements"),
  handler: async (ctx, args) => {
    const { user } = await requireHost(ctx, args.stayId);
    assertAnnouncementInput(args.title, args.body, args.pinnedUntil);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot add announcements");
    const now = Date.now();
    const announcementId = await ctx.db.insert("announcements", {
      stayId: args.stayId,
      createdBy: user._id,
      title: args.title.trim(),
      body: args.body.trim(),
      pinnedUntil: args.pinnedUntil,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      stayId: args.stayId,
      actorUserId: user._id,
      kind: "announcement",
      action: "announcement_created",
      detail: args.title.trim(),
      entityId: announcementId,
    });
    return announcementId;
  },
});
