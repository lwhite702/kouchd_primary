import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertChoreInput } from "./lib/validation";

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId }) => {
    await requireMembership(ctx, stayId);
    return await ctx.db.query("chores").withIndex("by_stay_due_date", (query) => query.eq("stayId", stayId)).take(100);
  },
});

export const create = mutation({
  args: { stayId: v.id("stays"), title: v.string(), note: v.string(), assignee: v.union(v.literal("host"), v.literal("guest"), v.literal("shared")), dueDate: v.string() },
  returns: v.id("chores"),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.stayId);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot add ordinary chores");
    assertChoreInput(args.title, args.note, args.dueDate);
    const now = Date.now();
    const choreId = await ctx.db.insert("chores", { ...args, createdBy: user._id, createdAt: now, updatedAt: now });
    await recordActivity(ctx, { stayId: args.stayId, actorUserId: user._id, kind: "chore", action: "created", detail: args.title, entityId: choreId });
    return choreId;
  },
});

export const toggle = mutation({
  args: { choreId: v.id("chores") },
  returns: v.boolean(),
  handler: async (ctx, { choreId }) => {
    const chore = await ctx.db.get(choreId);
    if (!chore) throw new Error("Chore not found");
    const { user } = await requireMembership(ctx, chore.stayId);
    if (chore.voidedAt) throw new Error("Voided chores cannot be changed");
    const isComplete = !chore.completedAt;
    await ctx.db.patch(choreId, { completedAt: isComplete ? Date.now() : undefined, completedBy: isComplete ? user._id : undefined, updatedAt: Date.now() });
    await recordActivity(ctx, { stayId: chore.stayId, actorUserId: user._id, kind: "chore", action: isComplete ? "completed" : "reopened", detail: chore.title, entityId: choreId });
    return isComplete;
  },
});

export const voidChore = mutation({
  args: { choreId: v.id("chores") },
  returns: v.null(),
  handler: async (ctx, { choreId }) => {
    const chore = await ctx.db.get(choreId);
    if (!chore) throw new Error("Chore not found");
    const { user, membership } = await requireMembership(ctx, chore.stayId);
    if (membership.role !== "host" && chore.createdBy !== user._id) throw new Error("Only the creator or host can void this chore");
    if (chore.voidedAt) return null;
    await ctx.db.patch(choreId, { voidedAt: Date.now(), updatedAt: Date.now() });
    await recordActivity(ctx, { stayId: chore.stayId, actorUserId: user._id, kind: "chore", action: "voided", detail: chore.title, entityId: choreId });
    return null;
  },
});
