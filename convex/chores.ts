import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertChoreInput } from "./lib/validation";
import { addCalendarDays, calendarDateInTimezone } from "../lib/domain/dates";
import { ANALYTICS_EVENTS } from "../lib/analytics/events";
import { trackServerEvent } from "./lib/posthog";

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId }) => {
    await requireMembership(ctx, stayId);
    return await ctx.db.query("chores").withIndex("by_stay_due_date", (query) => query.eq("stayId", stayId)).take(100);
  },
});

export const create = mutation({
  args: { stayId: v.id("stays"), title: v.string(), note: v.string(), assignee: v.union(v.literal("host"), v.literal("guest"), v.literal("shared")), assigneeUserId: v.optional(v.id("users")), dueDate: v.string(), repeatCadence: v.optional(v.union(v.literal("daily"), v.literal("weekly"))) },
  returns: v.id("chores"),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.stayId);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot add ordinary chores");
    const assigneeUserId = args.assigneeUserId;
    if (assigneeUserId) {
      const assignee = await ctx.db.query("memberships").withIndex("by_stay_user", (query) => query.eq("stayId", args.stayId).eq("userId", assigneeUserId)).unique();
      if (!assignee || assignee.status !== "active") throw new Error("Chore assignee must be an active member");
    }
    assertChoreInput(args.title, args.note, args.dueDate);
    const now = Date.now();
    const choreId = await ctx.db.insert("chores", { ...args, createdBy: user._id, createdAt: now, updatedAt: now });
    if (args.repeatCadence) await ctx.db.patch(choreId, { recurrenceRootId: choreId });
    await recordActivity(ctx, { stayId: args.stayId, actorUserId: user._id, kind: "chore", action: "created", detail: args.title, entityId: choreId });
    trackServerEvent(ctx, user, ANALYTICS_EVENTS.CHORE_CREATED, { stayId: args.stayId, choreId }, args.stayId);
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
    const now = Date.now();
    let nextDueDate: string | undefined;
    if (isComplete && chore.repeatCadence && !chore.nextOccurrenceId) {
      const stay = await ctx.db.get(chore.stayId);
      if (!stay || stay.status === "ended") throw new Error("Ended stays cannot schedule recurring chores");
      const intervalDays = chore.repeatCadence === "daily" ? 1 : 7;
      const today = calendarDateInTimezone(new Date(now), stay.timezone);
      nextDueDate = addCalendarDays(chore.dueDate, intervalDays);
      while (nextDueDate <= today) nextDueDate = addCalendarDays(nextDueDate, intervalDays);
      const nextOccurrenceId = await ctx.db.insert("chores", {
        stayId: chore.stayId,
        createdBy: chore.createdBy,
        title: chore.title,
        note: chore.note,
        assignee: chore.assignee,
        assigneeUserId: chore.assigneeUserId,
        dueDate: nextDueDate,
        repeatCadence: chore.repeatCadence,
        recurrenceRootId: chore.recurrenceRootId ?? chore._id,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(choreId, { nextOccurrenceId });
    }
    await ctx.db.patch(choreId, { completedAt: isComplete ? now : undefined, completedBy: isComplete ? user._id : undefined, updatedAt: now });
    await recordActivity(ctx, { stayId: chore.stayId, actorUserId: user._id, kind: "chore", action: isComplete ? "completed" : "reopened", detail: chore.title, entityId: choreId });
    if (isComplete) trackServerEvent(ctx, user, ANALYTICS_EVENTS.CHORE_COMPLETED, { stayId: chore.stayId, choreId }, chore.stayId);
    if (nextDueDate) await recordActivity(ctx, { stayId: chore.stayId, actorUserId: user._id, kind: "chore", action: "recurrence_scheduled", detail: `${chore.title} scheduled again for ${nextDueDate}`, entityId: choreId });
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

export const advanceOverdueRecurring = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const utcToday = calendarDateInTimezone(new Date(now), "UTC");
    const candidates = await ctx.db.query("chores")
      .withIndex("by_due_date", (query) => query.lte("dueDate", utcToday))
      .order("desc")
      .take(1_000);
    let advanced = 0;
    for (const chore of candidates) {
      if (!chore.repeatCadence || chore.nextOccurrenceId || chore.completedAt || chore.voidedAt) continue;
      const stay = await ctx.db.get(chore.stayId);
      if (!stay || stay.status === "ended") continue;
      const localToday = calendarDateInTimezone(new Date(now), stay.timezone);
      if (chore.dueDate >= localToday) continue;
      const intervalDays = chore.repeatCadence === "daily" ? 1 : 7;
      let nextDueDate = addCalendarDays(chore.dueDate, intervalDays);
      while (nextDueDate <= localToday) nextDueDate = addCalendarDays(nextDueDate, intervalDays);
      const nextOccurrenceId = await ctx.db.insert("chores", {
        stayId: chore.stayId,
        createdBy: chore.createdBy,
        title: chore.title,
        note: chore.note,
        assignee: chore.assignee,
        assigneeUserId: chore.assigneeUserId,
        dueDate: nextDueDate,
        repeatCadence: chore.repeatCadence,
        recurrenceRootId: chore.recurrenceRootId ?? chore._id,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(chore._id, { nextOccurrenceId });
      await recordActivity(ctx, { stayId: chore.stayId, actorUserId: chore.createdBy, kind: "chore", action: "recurrence_scheduled", detail: `${chore.title} scheduled again for ${nextDueDate}`, entityId: chore._id });
      advanced += 1;
    }
    return advanced;
  },
});
