import { v } from "convex/values";

import { calculateObligationLedger } from "../lib/domain/obligations";
import { addCalendarDays, calendarDateInTimezone } from "../lib/domain/dates";
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
  args: { now: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, { now }) => {
    const candidates: Array<{
      userId: Id<"users">;
      stayId: Id<"stays">;
      workflow: string;
      entityId: string;
      data: Record<string, unknown>;
    }> = [];
    const utcToday = calendarDateInTimezone(new Date(now), "UTC");
    const minDate = addCalendarDays(utcToday, -1);
    const maxDate = addCalendarDays(utcToday, 2);

    const stays = await ctx.db.query("stays").withIndex("by_next_check_in_date", (query) =>
      query.gte("nextCheckInDate", minDate).lte("nextCheckInDate", maxDate),
    ).take(500);
    for (const stay of stays) {
      const localToday = calendarDateInTimezone(new Date(now), stay.timezone);
      const localTomorrow = addCalendarDays(localToday, 1);
      if (stay.status === "ended" || stay.nextCheckInDate !== localTomorrow) continue;
      const members = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stay._id)).take(20);
      const host = members.find((member) => member.role === "host");
      const hostUser = host ? await ctx.db.get(host.userId) : null;
      for (const member of members.filter((item) => item.status === "active")) {
        candidates.push({
          userId: member.userId,
          stayId: stay._id,
          workflow: "check-in-reminder",
          entityId: `check-in:${stay._id}:${localTomorrow}`,
          data: { stayName: "Shared stay", hostName: hostUser?.name ?? "Your host", checkInDate: localTomorrow },
        });
      }
    }

    const obligations = await ctx.db.query("obligations").withIndex("by_due_date", (query) =>
      query.gte("dueDate", minDate).lte("dueDate", maxDate),
    ).take(1_000);
    const ledgersByGuest = new Map<string, ReturnType<typeof calculateObligationLedger>>();
    for (const obligation of obligations) {
      const guestUserId = obligation.guestUserId;
      if (!guestUserId || obligation.voidedAt) continue;
      const stay = await ctx.db.get(obligation.stayId);
      if (!stay || stay.status === "ended") continue;
      const localTomorrow = addCalendarDays(calendarDateInTimezone(new Date(now), stay.timezone), 1);
      if (obligation.dueDate !== localTomorrow) continue;
      const terms = stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
      if (!terms) continue;
      const membership = await ctx.db.query("memberships")
        .withIndex("by_stay_user", (query) => query.eq("stayId", obligation.stayId).eq("userId", guestUserId))
        .unique();
      if (!membership || membership.status !== "active") continue;

      const guestKey = `${obligation.stayId}:${obligation.guestUserId}`;
      let ledger = ledgersByGuest.get(guestKey);
      if (!ledger) {
        const [guestObligations, contributions] = await Promise.all([
          ctx.db.query("obligations")
            .withIndex("by_stay_and_guest", (query) => query.eq("stayId", obligation.stayId).eq("guestUserId", guestUserId))
            .take(1_000),
          ctx.db.query("contributions")
            .withIndex("by_stay_guest_and_date", (query) => query.eq("stayId", obligation.stayId).eq("guestUserId", guestUserId))
            .order("asc")
            .take(5_000),
        ]);
        ledger = calculateObligationLedger({
          obligations: guestObligations.map((item) => ({
            _id: item._id,
            periodStart: item.periodStart,
            periodEnd: item.periodEnd,
            dueDate: item.dueDate,
            baseAmountCents: item.baseAmountCents,
            type: item.type ?? "cadence",
            title: item.title,
            lateFeeWaived: Boolean(item.lateFeeWaivedAt),
            voided: Boolean(item.voidedAt),
          })),
          contributions: contributions
            .filter((entry) => entry.status === "confirmed" && entry.countsTowardBalance)
            .map((entry) => ({ amountCents: entry.amountCents, date: entry.date })),
          asOfDate: localTomorrow,
          terms,
        });
        ledgersByGuest.set(guestKey, ledger);
      }
      const ledgerItem = ledger.find((item) => item._id === obligation._id);
      if (!ledgerItem || ledgerItem.balanceCents <= 0) continue;
      candidates.push({
        userId: guestUserId,
          stayId: obligation.stayId,
          workflow: "payment-due-reminder",
          entityId: `obligation:${obligation._id}:${localTomorrow}`,
        data: {
          stayName: "Shared stay",
          amountDue: ledgerItem.balanceCents,
          periodLabel: obligation.title ?? `${obligation.periodStart} to ${obligation.periodEnd}`,
          dueDate: obligation.dueDate,
          balance: ledgerItem.balanceCents,
        },
      });
    }

    const chores = await ctx.db.query("chores").withIndex("by_due_date", (query) =>
      query.gte("dueDate", minDate).lte("dueDate", maxDate),
    ).take(1_000);
    for (const chore of chores) {
      if (chore.completedAt || chore.voidedAt) continue;
      const stay = await ctx.db.get(chore.stayId);
      if (!stay || stay.status === "ended") continue;
      const localToday = calendarDateInTimezone(new Date(now), stay.timezone);
      if (chore.dueDate !== localToday) continue;
      const members = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", chore.stayId)).take(20);
      const recipients = chore.assigneeUserId
        ? members.filter((member) => member.userId === chore.assigneeUserId && member.status === "active")
        : members.filter((member) => member.status === "active");
      for (const member of recipients) {
        candidates.push({
          userId: member.userId,
          stayId: chore.stayId,
          workflow: "chore-reminder",
        entityId: `chore:${chore._id}:${localToday}`,
          data: { choreTitle: chore.title, dueDate: chore.dueDate },
        });
      }
    }

    return candidates.slice(0, 500);
  },
});
