import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";

export const getRecipient = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), v.object({
    id: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notifyEmail: v.boolean(),
    notifySms: v.boolean(),
  })),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      notifyEmail: user.notifyEmail ?? true,
      notifySms: user.notifySms ?? false,
    };
  },
});

export const wasSent = internalQuery({
  args: { userId: v.id("users"), workflow: v.string(), entityId: v.optional(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user_workflow_and_entity", (query) => query.eq("userId", args.userId).eq("workflow", args.workflow).eq("entityId", args.entityId))
      .take(1);
    return existing.length > 0;
  },
});

export const recordSent = internalMutation({
  args: { userId: v.id("users"), stayId: v.optional(v.id("stays")), workflow: v.string(), entityId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user_workflow_and_entity", (query) => query.eq("userId", args.userId).eq("workflow", args.workflow).eq("entityId", args.entityId))
      .take(1);
    if (existing.length === 0) await ctx.db.insert("notifications", { ...args, sentAt: Date.now() });
    return null;
  },
});

export const reminderCandidates = internalQuery({
  args: { targetDate: v.string(), choreDate: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { targetDate, choreDate }) => {
    const candidates: Array<{
      userId: Id<"users">;
      stayId: Id<"stays">;
      workflow: string;
      entityId: string;
      data: Record<string, unknown>;
    }> = [];

    const stays = await ctx.db.query("stays").withIndex("by_next_check_in_date", (query) => query.eq("nextCheckInDate", targetDate)).take(100);
    for (const stay of stays) {
      const members = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stay._id)).take(20);
      const host = members.find((member) => member.role === "host");
      const hostUser = host ? await ctx.db.get(host.userId) : null;
      for (const member of members.filter((item) => item.status === "active")) {
        candidates.push({
          userId: member.userId,
          stayId: stay._id,
          workflow: "check-in-reminder",
          entityId: `check-in:${stay._id}:${targetDate}`,
          data: { stayName: "Shared stay", hostName: hostUser?.name ?? "Your host", checkInDate: targetDate },
        });
      }
    }

    const obligations = await ctx.db.query("obligations").withIndex("by_due_date", (query) => query.eq("dueDate", targetDate)).take(200);
    for (const obligation of obligations) {
      if (!obligation.guestUserId || obligation.voidedAt) continue;
      candidates.push({
        userId: obligation.guestUserId,
        stayId: obligation.stayId,
        workflow: "payment-due-reminder",
        entityId: `obligation:${obligation._id}:${targetDate}`,
        data: {
          stayName: "Shared stay",
          amountDue: obligation.baseAmountCents,
          periodLabel: obligation.title ?? `${obligation.periodStart} to ${obligation.periodEnd}`,
          dueDate: obligation.dueDate,
          balance: obligation.baseAmountCents,
        },
      });
    }

    const chores = await ctx.db.query("chores").withIndex("by_due_date", (query) => query.eq("dueDate", choreDate)).take(200);
    for (const chore of chores) {
      if (chore.completedAt || chore.voidedAt) continue;
      const members = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", chore.stayId)).take(20);
      const recipients = chore.assigneeUserId
        ? members.filter((member) => member.userId === chore.assigneeUserId && member.status === "active")
        : members.filter((member) => member.status === "active");
      for (const member of recipients) {
        candidates.push({
          userId: member.userId,
          stayId: chore.stayId,
          workflow: "chore-reminder",
          entityId: `chore:${chore._id}:${choreDate}`,
          data: { choreTitle: chore.title, dueDate: chore.dueDate },
        });
      }
    }

    return candidates.slice(0, 500);
  },
});
