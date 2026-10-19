import { v } from "convex/values";

import { calculateObligationLedger } from "../lib/domain/obligations";
import { addCalendarDays, calendarDateInTimezone, stayDays } from "../lib/domain/dates";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { getCurrentGuestTerms } from "./lib/stayTerms";
import { listActiveGuestObligations } from "./lib/obligations";

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export type PaymentReminderStage =
  | "upcoming"
  | "due_today"
  | "grace_overdue"
  | "grace_final"
  | "late_fee_assessed"
  | "late_fee_warning"
  | "critical_delinquency";

export function buildPaymentReminderPayload({
  stay,
  hostUser,
  guestUser,
  obligation,
  ledgerItem,
  stage,
  dueDate,
  graceEnd,
  daysPastDue,
  lateFeeCents,
  terms,
}: {
  stay: Doc<"stays">;
  hostUser: Doc<"users"> | null;
  guestUser: Doc<"users"> | null;
  obligation: Doc<"obligations">;
  ledgerItem: ReturnType<typeof calculateObligationLedger>[number];
  stage: PaymentReminderStage;
  dueDate: string;
  graceEnd: string;
  daysPastDue: number;
  lateFeeCents: number;
  terms: Doc<"terms">;
}) {
  const stayName = stay.houseInfo?.streetAddress ? `Stay at ${stay.houseInfo.streetAddress}` : "Shared stay";
  const hostName = hostUser?.name ?? "Your host";
  const guestName = guestUser?.name ?? "Guest";
  const baseTitle = obligation.title ?? `${obligation.periodStart} to ${obligation.periodEnd}`;
  const formattedBalance = formatCents(ledgerItem.balanceCents);
  const formattedFee = formatCents(lateFeeCents);
  const formattedTotalFees = formatCents(ledgerItem.lateFeeCents);

  let periodLabel = baseTitle;
  let urgencyLevel: "normal" | "moderate" | "urgent" | "critical" = "normal";
  let stageTitle = "";
  let warningMessage = "";
  let consequences = "";
  let actionRequired = "";

  switch (stage) {
    case "upcoming":
      periodLabel = baseTitle;
      urgencyLevel = "normal";
      stageTitle = "Upcoming stay contribution due tomorrow";
      warningMessage = `Your scheduled contribution of ${formattedBalance} for ${stayName} is due tomorrow (${dueDate}).`;
      consequences = "Logging contributions on time keeps household records clear and locks in any applicable early payment discount.";
      actionRequired = `Please submit or record your contribution of ${formattedBalance} before ${dueDate}.`;
      break;

    case "due_today":
      periodLabel = `${baseTitle} [DUE TODAY]`;
      urgencyLevel = "moderate";
      stageTitle = "Stay contribution due today";
      warningMessage = `Your scheduled contribution of ${formattedBalance} for ${stayName} is due today (${dueDate}).`;
      consequences = `Contributions not recorded by today enter the ${terms.graceDays}-day grace period (ending ${graceEnd}) before a late fee of ${formattedFee} is added.`;
      actionRequired = `Submit or record your contribution of ${formattedBalance} today to stay on schedule.`;
      break;

    case "grace_overdue":
      periodLabel = `${baseTitle} [PAST DUE — GRACE PERIOD]`;
      urgencyLevel = "urgent";
      stageTitle = "Friendly reminder: Stay contribution past due";
      warningMessage = `Your stay contribution of ${formattedBalance} was due on ${dueDate} and is now ${daysPastDue} day${daysPastDue === 1 ? "" : "s"} overdue.`;
      consequences = `Important details:\n• Late Fees: If unpaid by ${graceEnd}, a recurring late fee of ${formattedFee} will be charged immediately and will compound weekly.\n• Discount Forfeiture: Early payment discounts are cancelled.\n• Flexible options: If you need more time, you can request an overdue plan with ${hostName}.`;
      actionRequired = `Submit your contribution of ${formattedBalance} or propose a recovery plan before your grace period expires on ${graceEnd}.`;
      break;

    case "grace_final":
      periodLabel = `${baseTitle} [FINAL GRACE NOTICE — LATE FEE IMMINENT]`;
      urgencyLevel = "urgent";
      stageTitle = "Final day of grace period for stay contribution";
      warningMessage = `TODAY IS THE FINAL DAY of your grace period for ${baseTitle}. Outstanding balance: ${formattedBalance}.`;
      consequences = `Scheduled updates taking effect tomorrow morning:\n• Late Fee: A ${formattedFee} late fee will be added to your ledger tomorrow morning and will compound weekly.\n• Host Update: A reminder will be shared with host ${hostName} to keep both sides aligned.\n• Overdue Recovery: You can request a flexible payment plan to pause further fees.`;
      actionRequired = `Submit ${formattedBalance} today or request a recovery plan with ${hostName}.`;
      break;

    case "late_fee_assessed":
      periodLabel = `${baseTitle} [NOTICE: LATE FEE ASSESSED]`;
      urgencyLevel = "urgent";
      stageTitle = "Notice: Late fee assessed on overdue balance";
      warningMessage = `A late fee of ${formattedFee} has been charged to your ledger (Total late fees: ${formattedTotalFees}). Outstanding balance is now ${formattedBalance}.`;
      consequences = `Ledger Status:\n• Compounding Fees: An additional ${formattedFee} will compound every 7 days until cleared in full.\n• Household Alignment: Keeping host ${hostName} updated helps ensure shared expectations remain clear.\n• Overdue Plan: You can propose a host-reviewed recovery schedule at any time to adjust contributions.`;
      actionRequired = `Submit your contribution of ${formattedBalance} or request a host-reviewed recovery plan.`;
      break;

    case "late_fee_warning":
      periodLabel = `${baseTitle} [NOTICE: LATE FEE OCCURRENCE SOON]`;
      urgencyLevel = "urgent";
      stageTitle = "Notice: Additional late fee in 3 days";
      warningMessage = `Your balance of ${formattedBalance} is ${daysPastDue} days overdue. An additional ${formattedFee} will compound within 3 days.`;
      consequences = `Ledger Updates:\n• Accruing Fees: Late fees compound weekly (${formattedTotalFees} assessed to date).\n• Host Coordination: Host ${hostName} can review overdue balances and help coordinate adjustments.\n• Recovery Request: Propose a catch-up plan to resolve past-due amounts comfortably.`;
      actionRequired = `Review your balance of ${formattedBalance} or request an overdue plan today.`;
      break;

    case "critical_delinquency":
      periodLabel = `${baseTitle} [ATTENTION NEEDED: OVERDUE BALANCE]`;
      urgencyLevel = "critical";
      stageTitle = "Attention needed: Extended overdue stay balance";
      warningMessage = `Notice: Your stay balance of ${formattedBalance} is ${daysPastDue} days overdue and remains open (${formattedTotalFees} in late fees).`;
      consequences = `Important Notice:\n• Host Review: Host ${hostName} has been asked to check in directly to discuss your stay arrangement.\n• Household Standing: Open balances affect your shared household ledger.\n• Support Available: Propose a host-reviewed recovery plan right away to set up a sustainable catch-up schedule.`;
      actionRequired = `Reach out to ${hostName} or submit an overdue recovery plan to resolve your balance of ${formattedBalance}.`;
      break;
  }

  return {
    stayName,
    hostName,
    guestName,
    amountDue: ledgerItem.balanceCents,
    balance: ledgerItem.balanceCents,
    baseAmountCents: obligation.baseAmountCents,
    lateFeeCents: ledgerItem.lateFeeCents,
    lateFeeOccurrences: ledgerItem.lateFeeOccurrences,
    periodLabel,
    dueDate,
    graceEndDate: graceEnd,
    daysOverdue: Math.max(0, daysPastDue),
    urgencyLevel,
    stage,
    stageTitle,
    warningMessage,
    consequences,
    actionRequired,
    detail: `${stageTitle}: ${warningMessage}`,
    action: `payment_reminder_${stage}`,
  };
}

export const getRecipient = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), v.object({
    id: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notifyEmail: v.boolean(),
    notifySms: v.boolean(),
    role: v.optional(v.string()),
    stayStatus: v.optional(v.string()),
    stayId: v.optional(v.string()),
  })),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (query) => query.eq("userId", userId))
      .collect();
    const activeMembership = memberships.find((item) => item.status === "active") ?? memberships[0];
    let role: "host" | "guest" | undefined = undefined;
    let stayStatus: "active" | "pending" | "ended" | undefined = undefined;
    let stayId: string | undefined = undefined;
    if (activeMembership) {
      role = activeMembership.role;
      stayId = activeMembership.stayId;
      const stay = await ctx.db.get(activeMembership.stayId);
      if (stay) {
        stayStatus = stay.status;
      }
    }
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      notifyEmail: user.notifyEmail ?? true,
      notifySms: user.notifySms ?? false,
      role,
      stayStatus,
      stayId,
    };
  },
});

export const REMINDER_WORKFLOWS = new Set([
  "payment-due-reminder",
  "agreement-pending",
  "chore-reminder",
  "check-in-reminder",
]);

export function extractNotificationCalendarDate(
  notification: Doc<"notifications">,
  timezone: string,
  referenceNow?: number,
): string | null {
  const entityId = notification.entityId ?? "";

  if (entityId.startsWith("agreement-pending:")) {
    const match = entityId.match(/:(\d{4}-\d{2}-\d{2})(?::|$)/);
    if (match) return match[1];
  }

  if (entityId.startsWith("chore:")) {
    const match = entityId.match(/:(\d{4}-\d{2}-\d{2})$/);
    if (match) return match[1];
  }

  if (entityId.startsWith("check-in:")) {
    const match = entityId.match(/:(\d{4}-\d{2}-\d{2})$/);
    if (match) return addCalendarDays(match[1], -1);
  }

  if (entityId.startsWith("obligation:")) {
    const dueSoonMatch = entityId.match(/:due-soon:(\d{4}-\d{2}-\d{2})$/);
    if (dueSoonMatch) return addCalendarDays(dueSoonMatch[1], -1);

    const dueTodayMatch = entityId.match(/:due-today:(\d{4}-\d{2}-\d{2})$/);
    if (dueTodayMatch) return dueTodayMatch[1];

    const trailingDateMatch = entityId.match(/:(\d{4}-\d{2}-\d{2})$/);
    if (trailingDateMatch) return trailingDateMatch[1];
  }

  if (referenceNow === undefined || Math.abs(notification.sentAt - referenceNow) <= 36 * 60 * 60 * 1000) {
    return calendarDateInTimezone(new Date(notification.sentAt), timezone);
  }

  return null;
}

export async function hasUserReceivedReminderOnDate(
  ctx: QueryCtx,
  userId: Id<"users">,
  localDate: string,
  timezone: string,
  referenceNow: number,
  cache?: Map<string, Doc<"notifications">[]>,
): Promise<boolean> {
  const key = userId.toString();
  let userNotifications = cache?.get(key);
  if (!userNotifications) {
    userNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (query) => query.eq("userId", userId))
      .collect();
    cache?.set(key, userNotifications);
  }
  return userNotifications.some((n) => {
    if (!REMINDER_WORKFLOWS.has(n.workflow)) return false;
    return extractNotificationCalendarDate(n, timezone, referenceNow) === localDate;
  });
}

export const wasSent = internalQuery({
  args: {
    userId: v.id("users"),
    workflow: v.string(),
    entityId: v.optional(v.string()),
    stayId: v.optional(v.id("stays")),
    now: v.optional(v.number()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user_workflow_and_entity", (query) => query.eq("userId", args.userId).eq("workflow", args.workflow).eq("entityId", args.entityId))
      .take(1);
    if (existing.length > 0) return true;

    if (REMINDER_WORKFLOWS.has(args.workflow)) {
      const stay = args.stayId ? await ctx.db.get(args.stayId) : null;
      const timezone = stay?.timezone ?? "UTC";
      const now = args.now ?? Date.now();
      const localToday = calendarDateInTimezone(new Date(now), timezone);
      return await hasUserReceivedReminderOnDate(ctx, args.userId, localToday, timezone, now);
    }

    return false;
  },
});

export const recordSent = internalMutation({
  args: {
    userId: v.id("users"),
    stayId: v.optional(v.id("stays")),
    workflow: v.string(),
    entityId: v.optional(v.string()),
    detail: v.optional(v.string()),
    action: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user_workflow_and_entity", (query) => query.eq("userId", args.userId).eq("workflow", args.workflow).eq("entityId", args.entityId))
      .take(1);
    if (existing.length === 0) {
      const sentTime = args.sentAt ?? Date.now();
      await ctx.db.insert("notifications", {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        sentAt: sentTime,
      });
      if (args.stayId && args.detail) {
        await ctx.db.insert("activity", {
          stayId: args.stayId,
          actorUserId: args.userId,
          guestUserId: args.userId,
          kind: "notification",
          action: args.action ?? "payment_reminder",
          detail: args.detail,
          entityId: args.entityId,
          createdAt: sentTime,
        });
      }
    }
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
    const scheduledUsersToday = new Set<string>();
    const userNotificationsCache = new Map<string, Doc<"notifications">[]>();

    const utcToday = calendarDateInTimezone(new Date(now), "UTC");
    const minDate = addCalendarDays(utcToday, -1);
    const maxDate = addCalendarDays(utcToday, 2);

    // =========================================================================
    // 1. PAYMENT DUE REMINDERS (Priority 1: Most Urgent, 1 per user)
    // =========================================================================
    const obligationMinDate = addCalendarDays(utcToday, -180);
    const obligationMaxDate = addCalendarDays(utcToday, 2);
    const obligations = await ctx.db.query("obligations").withIndex("by_due_date", (query) =>
      query.gte("dueDate", obligationMinDate).lte("dueDate", obligationMaxDate),
    ).order("desc").take(1_000);

    const PAYMENT_STAGE_RANK: Record<PaymentReminderStage, number> = {
      upcoming: 1,
      due_today: 2,
      grace_overdue: 3,
      grace_final: 4,
      late_fee_warning: 5,
      late_fee_assessed: 6,
      critical_delinquency: 7,
    };

    const ledgersByGuest = new Map<string, ReturnType<typeof calculateObligationLedger>>();
    const termsById = new Map<string, Doc<"terms"> | null>();
    const currentTermsByGuest = new Map<string, Doc<"terms"> | null>();
    const bestPaymentCandidateByUser = new Map<string, {
      candidate: {
        userId: Id<"users">;
        stayId: Id<"stays">;
        workflow: string;
        entityId: string;
        data: Record<string, unknown>;
      };
      stageRank: number;
      daysPastDue: number;
      dueDate: string;
    }>();

    for (const obligation of obligations) {
      const guestUserId = obligation.guestUserId;
      if (!guestUserId || obligation.voidedAt) continue;
      const stay = await ctx.db.get(obligation.stayId);
      if (!stay || stay.status === "ended") continue;
      const localToday = calendarDateInTimezone(new Date(now), stay.timezone);
      const localTomorrow = addCalendarDays(localToday, 1);
      if (obligation.dueDate > localTomorrow) continue;

      const userKey = guestUserId.toString();
      if (await hasUserReceivedReminderOnDate(ctx, guestUserId, localToday, stay.timezone, now, userNotificationsCache)) {
        scheduledUsersToday.add(userKey);
        continue;
      }

      const guestKey = `${obligation.stayId}:${guestUserId}`;
      let terms = currentTermsByGuest.get(guestKey);
      if (terms === undefined && !currentTermsByGuest.has(guestKey)) {
        terms = await getCurrentGuestTerms(ctx, obligation.stayId, guestUserId);
        currentTermsByGuest.set(guestKey, terms);
      }
      if (!terms) continue;
      const membership = await ctx.db.query("memberships")
        .withIndex("by_stay_user", (query) => query.eq("stayId", obligation.stayId).eq("userId", guestUserId))
        .unique();
      if (!membership || membership.status !== "active") continue;

      let ledger = ledgersByGuest.get(guestKey);
      if (!ledger) {
        const [guestObligations, contributions] = await Promise.all([
          listActiveGuestObligations(ctx, obligation.stayId, guestUserId),
          ctx.db.query("contributions")
            .withIndex("by_stay_guest_and_date", (query) => query.eq("stayId", obligation.stayId).eq("guestUserId", guestUserId))
            .order("asc")
            .take(5_000),
        ]);
        const ledgerObligations = await Promise.all(guestObligations.map(async (item) => {
          let obligationTerms = terms;
          if (item.termsId) {
            const termsKey = item.termsId.toString();
            if (!termsById.has(termsKey)) termsById.set(termsKey, await ctx.db.get(item.termsId));
            obligationTerms = termsById.get(termsKey) ?? terms;
          }
          return {
            _id: item._id,
            periodStart: item.periodStart,
            periodEnd: item.periodEnd,
            dueDate: item.dueDate,
            baseAmountCents: item.baseAmountCents,
            type: item.type ?? "cadence",
            title: item.title,
            lateFeeWaived: Boolean(item.lateFeeWaivedAt),
            voided: Boolean(item.voidedAt),
            terms: obligationTerms,
          };
        }));
        ledger = calculateObligationLedger({
          obligations: ledgerObligations,
          contributions: contributions
            .filter((entry) => entry.status === "confirmed" && entry.countsTowardBalance)
            .map((entry) => ({ amountCents: entry.amountCents, date: entry.date })),
          asOfDate: obligation.dueDate > localToday ? obligation.dueDate : localToday,
          terms,
        });
        ledgersByGuest.set(guestKey, ledger);
      }
      const ledgerItem = ledger.find((item) => item._id === obligation._id);
      if (!ledgerItem || ledgerItem.balanceCents <= 0) continue;

      let obligationTerms = terms;
      if (obligation.termsId) {
        const termsKey = obligation.termsId.toString();
        if (!termsById.has(termsKey)) termsById.set(termsKey, await ctx.db.get(obligation.termsId));
        obligationTerms = termsById.get(termsKey) ?? terms;
      }
      const graceDays = obligationTerms.graceDays ?? 0;
      const lateFeeCents = (obligationTerms.lateFeeEnabled ?? true) ? (obligationTerms.lateFeeCents ?? 0) : 0;
      const graceEnd = addCalendarDays(obligation.dueDate, graceDays);

      let stage: PaymentReminderStage;
      let entityId: string;
      let daysPastDue = 0;

      if (obligation.dueDate === localTomorrow) {
        stage = "upcoming";
        entityId = `obligation:${obligation._id}:due-soon:${obligation.dueDate}`;
      } else if (obligation.dueDate === localToday) {
        stage = "due_today";
        entityId = `obligation:${obligation._id}:due-today:${obligation.dueDate}`;
      } else if (localToday <= graceEnd) {
        daysPastDue = Math.max(1, stayDays(obligation.dueDate, localToday) - 1);
        if (localToday === graceEnd && graceDays > 0) {
          stage = "grace_final";
          entityId = `obligation:${obligation._id}:grace-final`;
        } else {
          stage = "grace_overdue";
          entityId = `obligation:${obligation._id}:grace-overdue`;
        }
      } else {
        daysPastDue = stayDays(obligation.dueDate, localToday) - 1;
        const daysPastGrace = Math.max(1, stayDays(graceEnd, localToday) - 1);
        const compoundingCycle = Math.max(1, Math.floor((daysPastGrace - 1) / 7) + 1);
        const daysIntoCycle = (daysPastGrace - 1) % 7;

        if (compoundingCycle >= 3) {
          stage = "critical_delinquency";
          entityId = daysIntoCycle < 3
            ? `obligation:${obligation._id}:critical-cycle-${compoundingCycle}-assessed`
            : `obligation:${obligation._id}:critical-cycle-${compoundingCycle}-urgent`;
        } else {
          if (daysIntoCycle < 3) {
            stage = "late_fee_assessed";
            entityId = `obligation:${obligation._id}:late-cycle-${compoundingCycle}-assessed`;
          } else {
            stage = "late_fee_warning";
            entityId = `obligation:${obligation._id}:late-cycle-${compoundingCycle}-urgent`;
          }
        }
      }

      const alreadySent = await ctx.db
        .query("notifications")
        .withIndex("by_user_workflow_and_entity", (query) =>
          query.eq("userId", guestUserId).eq("workflow", "payment-due-reminder").eq("entityId", entityId),
        )
        .first();
      if (alreadySent) continue;

      const hostUser = stay.hostUserId ? await ctx.db.get(stay.hostUserId) : null;
      const guestUser = await ctx.db.get(guestUserId);

      const reminderData = buildPaymentReminderPayload({
        stay,
        hostUser,
        guestUser,
        obligation,
        ledgerItem,
        stage,
        dueDate: obligation.dueDate,
        graceEnd,
        daysPastDue,
        lateFeeCents,
        terms: obligationTerms,
      });

      const candidate = {
        userId: guestUserId,
        stayId: obligation.stayId,
        workflow: "payment-due-reminder",
        entityId,
        data: reminderData,
      };

      const stageRank = PAYMENT_STAGE_RANK[stage];
      const existing = bestPaymentCandidateByUser.get(userKey);
      if (!existing) {
        bestPaymentCandidateByUser.set(userKey, { candidate, stageRank, daysPastDue, dueDate: obligation.dueDate });
      } else {
        if (
          stageRank > existing.stageRank ||
          (stageRank === existing.stageRank && daysPastDue > existing.daysPastDue) ||
          (stageRank === existing.stageRank && daysPastDue === existing.daysPastDue && obligation.dueDate < existing.dueDate)
        ) {
          bestPaymentCandidateByUser.set(userKey, { candidate, stageRank, daysPastDue, dueDate: obligation.dueDate });
        }
      }
    }

    for (const [userKey, best] of bestPaymentCandidateByUser) {
      candidates.push(best.candidate);
      scheduledUsersToday.add(userKey);
    }

    // =========================================================================
    // 2. CHORE REMINDERS (Priority 2: Consolidated to at most 1 per user)
    // =========================================================================
    const chores = await ctx.db.query("chores").withIndex("by_due_date", (query) =>
      query.gte("dueDate", minDate).lte("dueDate", maxDate),
    ).take(1_000);

    const choresByUser = new Map<string, Array<{
      chore: Doc<"chores">;
      userId: Id<"users">;
      stayId: Id<"stays">;
      localToday: string;
    }>>();

    for (const chore of chores) {
      if (chore.completedAt || chore.voidedAt) continue;
      const stay = await ctx.db.get(chore.stayId);
      if (!stay || stay.status === "ended") continue;
      const localToday = calendarDateInTimezone(new Date(now), stay.timezone);
      if (chore.dueDate !== localToday) continue;
      const members = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", chore.stayId)).take(20);
      const recipients = chore.assigneeUserId
        ? members.filter((member) => member.userId === chore.assigneeUserId && member.status === "active")
        : members.filter((member) => member.status === "active" && (chore.assignee === "shared" || member.role === chore.assignee));

      for (const member of recipients) {
        const userKey = member.userId.toString();
        if (scheduledUsersToday.has(userKey)) continue;
        if (await hasUserReceivedReminderOnDate(ctx, member.userId, localToday, stay.timezone, now, userNotificationsCache)) {
          scheduledUsersToday.add(userKey);
          continue;
        }

        const entityId = `chore:${chore._id}:${localToday}`;
        const alreadySent = await ctx.db.query("notifications")
          .withIndex("by_user_workflow_and_entity", (query) => query.eq("userId", member.userId).eq("workflow", "chore-reminder").eq("entityId", entityId))
          .first();
        if (alreadySent) continue;

        let list = choresByUser.get(userKey);
        if (!list) {
          list = [];
          choresByUser.set(userKey, list);
        }
        list.push({ chore, userId: member.userId, stayId: chore.stayId, localToday });
      }
    }

    for (const [userKey, choreItems] of choresByUser) {
      if (choreItems.length === 0 || scheduledUsersToday.has(userKey)) continue;
      const first = choreItems[0];
      const choreTitle = choreItems.length === 1
        ? first.chore.title
        : `${first.chore.title} and ${choreItems.length - 1} more chore${choreItems.length - 1 === 1 ? "" : "s"}`;

      candidates.push({
        userId: first.userId,
        stayId: first.stayId,
        workflow: "chore-reminder",
        entityId: `chore:${first.chore._id}:${first.localToday}`,
        data: {
          choreTitle,
          dueDate: first.chore.dueDate,
          choreCount: choreItems.length,
          additionalChoresCount: choreItems.length - 1,
        },
      });
      scheduledUsersToday.add(userKey);
    }

    // =========================================================================
    // 3. CHECK-IN REMINDERS (Priority 3: Upcoming stay check-in tomorrow)
    // =========================================================================
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
        const userKey = member.userId.toString();
        if (scheduledUsersToday.has(userKey)) continue;
        if (await hasUserReceivedReminderOnDate(ctx, member.userId, localToday, stay.timezone, now, userNotificationsCache)) {
          scheduledUsersToday.add(userKey);
          continue;
        }

        const entityId = `check-in:${stay._id}:${localTomorrow}`;
        const alreadySent = await ctx.db
          .query("notifications")
          .withIndex("by_user_workflow_and_entity", (query) =>
            query.eq("userId", member.userId).eq("workflow", "check-in-reminder").eq("entityId", entityId),
          )
          .first();
        if (alreadySent) continue;

        candidates.push({
          userId: member.userId,
          stayId: stay._id,
          workflow: "check-in-reminder",
          entityId,
          data: {
            stayName: stay.houseInfo?.streetAddress ? `Stay at ${stay.houseInfo.streetAddress}` : stay.name ?? "Shared stay",
            hostName: hostUser?.name ?? "Your host",
            checkInDate: localTomorrow,
          },
        });
        scheduledUsersToday.add(userKey);
      }
    }

    return candidates.slice(0, 500);
  },
});

export const getStayById = internalQuery({
  args: { stayId: v.id("stays") },
  returns: v.union(v.null(), v.object({
    _id: v.id("stays"),
    hostUserId: v.id("users"),
    name: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("ended")),
    timezone: v.string(),
    currentTermsId: v.optional(v.id("terms")),
  })),
  handler: async (ctx, { stayId }) => {
    const stay = await ctx.db.get(stayId);
    if (!stay) return null;
    return {
      _id: stay._id,
      hostUserId: stay.hostUserId,
      name: stay.name,
      status: stay.status,
      timezone: stay.timezone,
      currentTermsId: stay.currentTermsId,
    };
  },
});

export function buildTermsUrl(stayId: string, origin?: string): string {
  const base = (origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kouchd.com").replace(/\/+$/, "");
  return `${base}/?stayId=${encodeURIComponent(stayId)}#stay`;
}

export function buildAgreementPendingPayload({
  recipientRole,
  stay,
  hostUser,
  guestUser,
  terms,
  termsUrl,
}: {
  recipientRole: "host" | "guest";
  stay: Doc<"stays">;
  hostUser: Doc<"users"> | null;
  guestUser: Doc<"users"> | null;
  terms: Doc<"terms">;
  termsUrl: string;
}) {
  const stayName = stay.houseInfo?.streetAddress ? `Stay at ${stay.houseInfo.streetAddress}` : stay.name ?? "Shared stay";
  const hostName = hostUser?.name ?? "Host";
  const guestName = guestUser?.name ?? "Guest";
  const formattedRate = formatCents(terms.rateCents);
  const detail = recipientRole === "host"
    ? `Agreement pending review by guest ${guestName} (${formattedRate} / ${terms.cadence})`
    : `Your stay agreement with ${hostName} is pending acceptance (${formattedRate} / ${terms.cadence})`;

  return {
    recipientRole,
    stayName,
    stayId: stay._id,
    hostName,
    guestName,
    termsUrl,
    rate: formattedRate,
    rateCents: terms.rateCents,
    cadence: terms.cadence,
    version: terms.version,
    detail,
    action: "agreement_pending",
  };
}

async function collectAgreementPendingCandidatesForStays(
  ctx: QueryCtx,
  stays: Doc<"stays">[],
  now: number,
  determinedSlot: "am" | "pm",
) {
  const candidates: Array<{
    userId: Id<"users">;
    stayId: Id<"stays">;
    workflow: string;
    entityId: string;
    cancellationKey: string;
    expectedTermsId?: Id<"terms">;
    recipientRole?: "host" | "guest";
    guestUserId?: Id<"users">;
    data: Record<string, unknown>;
  }> = [];
  const scheduledUsersToday = new Set<string>();
  const userNotificationsCache = new Map<string, Doc<"notifications">[]>();

  for (const stay of stays) {
    if (stay.status === "ended" || !stay.currentTermsId) continue;
    const localDate = calendarDateInTimezone(new Date(now), stay.timezone);
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_stay", (query) => query.eq("stayId", stay._id))
      .take(50);
    const activeMembers = members.filter((m) => m.status === "active");
    const hostMembership = activeMembers.find((m) => m.role === "host");
    const guestMemberships = activeMembers.filter((m) => m.role === "guest");
    const hostUser = stay.hostUserId ? await ctx.db.get(stay.hostUserId) : null;
    const defaultTerms = await ctx.db.get(stay.currentTermsId);
    if (!defaultTerms) continue;

    const termsUrl = buildTermsUrl(stay._id);
    const unsignedGuestsForStay: Array<{
      guestMembership: Doc<"memberships">;
      guestUser: Doc<"users"> | null;
      termsToUse: Doc<"terms">;
    }> = [];

    // Check each guest
    for (const guestMembership of guestMemberships) {
      const guestUser = await ctx.db.get(guestMembership.userId);
      const guestTerms = await getCurrentGuestTerms(ctx, stay._id, guestMembership.userId);
      const termsToUse = guestTerms ?? defaultTerms;

      const isGuestUnsigned = !guestMembership.acceptedTermsId || guestMembership.acceptedTermsId !== termsToUse._id;
      if (isGuestUnsigned) {
        unsignedGuestsForStay.push({ guestMembership, guestUser, termsToUse });

        const guestUserKey = guestMembership.userId.toString();
        if (!scheduledUsersToday.has(guestUserKey)) {
          const alreadyReceived = await hasUserReceivedReminderOnDate(
            ctx,
            guestMembership.userId,
            localDate,
            stay.timezone,
            now,
            userNotificationsCache,
          );
          if (!alreadyReceived) {
            const guestEntityId = `agreement-pending:${stay._id}:${guestMembership.userId}:${localDate}:${determinedSlot}`;
            const guestCancellationKey = `agreement-pending:${stay._id}:${guestMembership.userId}`;

            const guestAlreadySent = await ctx.db
              .query("notifications")
              .withIndex("by_user_workflow_and_entity", (query) =>
                query.eq("userId", guestMembership.userId).eq("workflow", "agreement-pending").eq("entityId", guestEntityId),
              )
              .first();

            if (!guestAlreadySent) {
              candidates.push({
                userId: guestMembership.userId,
                stayId: stay._id,
                workflow: "agreement-pending",
                entityId: guestEntityId,
                cancellationKey: guestCancellationKey,
                expectedTermsId: termsToUse._id,
                recipientRole: "guest",
                guestUserId: guestMembership.userId,
                data: buildAgreementPendingPayload({
                  recipientRole: "guest",
                  stay,
                  hostUser,
                  guestUser,
                  terms: termsToUse,
                  termsUrl,
                }),
              });
              scheduledUsersToday.add(guestUserKey);
            }
          }
        }
      }
    }

    // Consolidated host agreement reminder: at most 1 per host/stay per day
    if (hostMembership && stay.hostUserId) {
      const hostUserKey = stay.hostUserId.toString();
      if (!scheduledUsersToday.has(hostUserKey)) {
        const hostAlreadyReceived = await hasUserReceivedReminderOnDate(
          ctx,
          stay.hostUserId,
          localDate,
          stay.timezone,
          now,
          userNotificationsCache,
        );
        if (!hostAlreadyReceived) {
          if (unsignedGuestsForStay.length > 0) {
            if (unsignedGuestsForStay.length === 1) {
              const single = unsignedGuestsForStay[0];
              const hostEntityId = `agreement-pending:${stay._id}:${stay.hostUserId}:${single.guestMembership.userId}:${localDate}:${determinedSlot}`;
              const hostCancellationKey = `agreement-pending:${stay._id}:${stay.hostUserId}:${single.guestMembership.userId}`;

              const hostAlreadySent = await ctx.db
                .query("notifications")
                .withIndex("by_user_workflow_and_entity", (query) =>
                  query.eq("userId", stay.hostUserId).eq("workflow", "agreement-pending").eq("entityId", hostEntityId),
                )
                .first();

              if (!hostAlreadySent) {
                candidates.push({
                  userId: stay.hostUserId,
                  stayId: stay._id,
                  workflow: "agreement-pending",
                  entityId: hostEntityId,
                  cancellationKey: hostCancellationKey,
                  expectedTermsId: single.termsToUse._id,
                  recipientRole: "host",
                  guestUserId: single.guestMembership.userId,
                  data: buildAgreementPendingPayload({
                    recipientRole: "host",
                    stay,
                    hostUser,
                    guestUser: single.guestUser,
                    terms: single.termsToUse,
                    termsUrl,
                  }),
                });
                scheduledUsersToday.add(hostUserKey);
              }
            } else {
              // Multiple unsigned guests: consolidate into at most 1 reminder
              const primary = unsignedGuestsForStay[0];
              const guestNames = unsignedGuestsForStay.map((g) =>
                g.guestUser?.name && g.guestUser.name !== "Kouchd member" ? g.guestUser.name : "Guest",
              );
              const hostEntityId = `agreement-pending:${stay._id}:${stay.hostUserId}:consolidated:${localDate}:${determinedSlot}`;
              const hostCancellationKey = `agreement-pending:${stay._id}:${stay.hostUserId}`;

              const hostAlreadySent = await ctx.db
                .query("notifications")
                .withIndex("by_user_workflow_and_entity", (query) =>
                  query.eq("userId", stay.hostUserId).eq("workflow", "agreement-pending").eq("entityId", hostEntityId),
                )
                .first();

              if (!hostAlreadySent) {
                const formattedRate = formatCents(primary.termsToUse.rateCents);
                const detail = `Agreement pending review by ${unsignedGuestsForStay.length} guests (${guestNames.join(", ")}) (${formattedRate} / ${primary.termsToUse.cadence})`;
                candidates.push({
                  userId: stay.hostUserId,
                  stayId: stay._id,
                  workflow: "agreement-pending",
                  entityId: hostEntityId,
                  cancellationKey: hostCancellationKey,
                  expectedTermsId: primary.termsToUse._id,
                  recipientRole: "host",
                  guestUserId: primary.guestMembership.userId,
                  data: {
                    ...buildAgreementPendingPayload({
                      recipientRole: "host",
                      stay,
                      hostUser,
                      guestUser: primary.guestUser,
                      terms: primary.termsToUse,
                      termsUrl,
                    }),
                    guestName: guestNames.join(", "),
                    unsignedGuestCount: unsignedGuestsForStay.length,
                    detail,
                  },
                });
                scheduledUsersToday.add(hostUserKey);
              }
            }
          } else if (!hostMembership.acceptedTermsId || hostMembership.acceptedTermsId !== stay.currentTermsId) {
            // Host themself has not accepted currentTermsId
            const hostSelfEntityId = `agreement-pending:${stay._id}:${stay.hostUserId}:${localDate}:${determinedSlot}`;
            const hostSelfCancellationKey = `agreement-pending:${stay._id}:${stay.hostUserId}`;

            const hostSelfAlreadySent = await ctx.db
              .query("notifications")
              .withIndex("by_user_workflow_and_entity", (query) =>
                query.eq("userId", stay.hostUserId).eq("workflow", "agreement-pending").eq("entityId", hostSelfEntityId),
              )
              .first();

            if (!hostSelfAlreadySent) {
              candidates.push({
                userId: stay.hostUserId,
                stayId: stay._id,
                workflow: "agreement-pending",
                entityId: hostSelfEntityId,
                cancellationKey: hostSelfCancellationKey,
                expectedTermsId: defaultTerms._id,
                recipientRole: "host",
                data: buildAgreementPendingPayload({
                  recipientRole: "host",
                  stay,
                  hostUser,
                  guestUser: null,
                  terms: defaultTerms,
                  termsUrl,
                }),
              });
              scheduledUsersToday.add(hostUserKey);
            }
          }
        }
      }
    }
  }

  return candidates;
}

export const agreementPendingCandidates = internalQuery({
  args: { now: v.number(), slot: v.optional(v.union(v.literal("am"), v.literal("pm"))) },
  returns: v.array(v.object({
    userId: v.id("users"),
    stayId: v.id("stays"),
    workflow: v.string(),
    entityId: v.string(),
    cancellationKey: v.string(),
    data: v.any(),
    expectedTermsId: v.optional(v.id("terms")),
    recipientRole: v.optional(v.union(v.literal("host"), v.literal("guest"))),
    guestUserId: v.optional(v.id("users")),
  })),
  handler: async (ctx, { now, slot }) => {
    const determinedSlot = slot ?? (new Date(now).getUTCHours() < 16 ? "am" : "pm");
    const [pendingStays, activeStays] = await Promise.all([
      ctx.db.query("stays").withIndex("by_status", (query) => query.eq("status", "pending")).collect(),
      ctx.db.query("stays").withIndex("by_status", (query) => query.eq("status", "active")).collect(),
    ]);
    const stays = [...pendingStays, ...activeStays];
    return collectAgreementPendingCandidatesForStays(ctx, stays, now, determinedSlot);
  },
});

export const agreementPendingCandidatesPage = internalQuery({
  args: {
    now: v.number(),
    slot: v.optional(v.union(v.literal("am"), v.literal("pm"))),
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.optional(v.number()),
  },
  returns: v.object({
    candidates: v.array(v.object({
      userId: v.id("users"),
      stayId: v.id("stays"),
      workflow: v.string(),
      entityId: v.string(),
      cancellationKey: v.string(),
      data: v.any(),
      expectedTermsId: v.optional(v.id("terms")),
      recipientRole: v.optional(v.union(v.literal("host"), v.literal("guest"))),
      guestUserId: v.optional(v.id("users")),
    })),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { now, slot, cursor, pageSize = 100 }) => {
    const determinedSlot = slot ?? (new Date(now).getUTCHours() < 16 ? "am" : "pm");
    let stage: "pending" | "active" = "pending";
    let innerCursor: string | null = null;
    if (cursor) {
      try {
        const parsed = JSON.parse(cursor);
        if (parsed.stage === "pending" || parsed.stage === "active") {
          stage = parsed.stage;
          innerCursor = parsed.innerCursor ?? null;
        }
      } catch {
        // Fallback if cursor format is unrecognized
      }
    }

    if (stage === "pending") {
      const paginated = await ctx.db
        .query("stays")
        .withIndex("by_status", (query) => query.eq("status", "pending"))
        .paginate({ numItems: pageSize, cursor: innerCursor });

      const candidates = await collectAgreementPendingCandidatesForStays(ctx, paginated.page, now, determinedSlot);

      if (paginated.isDone) {
        return {
          candidates,
          continueCursor: JSON.stringify({ stage: "active", innerCursor: null }),
          isDone: false,
        };
      }

      return {
        candidates,
        continueCursor: JSON.stringify({ stage: "pending", innerCursor: paginated.continueCursor }),
        isDone: false,
      };
    } else {
      const paginated = await ctx.db
        .query("stays")
        .withIndex("by_status", (query) => query.eq("status", "active"))
        .paginate({ numItems: pageSize, cursor: innerCursor });

      const candidates = await collectAgreementPendingCandidatesForStays(ctx, paginated.page, now, determinedSlot);

      return {
        candidates,
        continueCursor: paginated.isDone ? null : JSON.stringify({ stage: "active", innerCursor: paginated.continueCursor }),
        isDone: paginated.isDone,
      };
    }
  },
});

export const checkAgreementPendingEligibility = internalQuery({
  args: {
    stayId: v.id("stays"),
    userId: v.id("users"),
    expectedTermsId: v.id("terms"),
    recipientRole: v.union(v.literal("host"), v.literal("guest")),
    guestUserId: v.optional(v.id("users")),
    workflow: v.string(),
    entityId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const duplicate = await ctx.db
      .query("notifications")
      .withIndex("by_user_workflow_and_entity", (query) =>
        query.eq("userId", args.userId).eq("workflow", args.workflow).eq("entityId", args.entityId),
      )
      .first();
    if (duplicate) return false;

    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") return false;

    // Daily cap: check if user already received any reminder today
    const now = Date.now();
    const entityDateMatch = args.entityId.match(/:(\d{4}-\d{2}-\d{2})(?::|$)/);
    const targetDate = entityDateMatch ? entityDateMatch[1] : calendarDateInTimezone(new Date(now), stay.timezone);
    if (await hasUserReceivedReminderOnDate(ctx, args.userId, targetDate, stay.timezone, now)) {
      return false;
    }

    if (args.recipientRole === "guest") {
      const guestMembership = await ctx.db
        .query("memberships")
        .withIndex("by_stay_user", (query) => query.eq("stayId", args.stayId).eq("userId", args.userId))
        .first();
      if (!guestMembership || guestMembership.status !== "active") return false;

      const currentTerms = await getCurrentGuestTerms(ctx, args.stayId, args.userId);
      const termsToUse = currentTerms ?? (stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null);
      if (!termsToUse) return false;

      if (guestMembership.acceptedTermsId && (guestMembership.acceptedTermsId === termsToUse._id || guestMembership.acceptedTermsId === args.expectedTermsId)) {
        return false;
      }
      return true;
    } else {
      const hostMembership = await ctx.db
        .query("memberships")
        .withIndex("by_stay_user", (query) => query.eq("stayId", args.stayId).eq("userId", args.userId))
        .first();
      if (!hostMembership || hostMembership.status !== "active") return false;

      if (args.entityId.includes(":consolidated:")) {
        const members = await ctx.db
          .query("memberships")
          .withIndex("by_stay", (query) => query.eq("stayId", args.stayId))
          .collect();
        const activeGuests = members.filter((m) => m.status === "active" && m.role === "guest");
        let hasAnyUnsigned = false;
        for (const guest of activeGuests) {
          const guestTerms = await getCurrentGuestTerms(ctx, args.stayId, guest.userId);
          const termsToUse = guestTerms ?? (stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null);
          if (termsToUse && (!guest.acceptedTermsId || guest.acceptedTermsId !== termsToUse._id)) {
            hasAnyUnsigned = true;
            break;
          }
        }
        return hasAnyUnsigned;
      }

      if (args.guestUserId) {
        const guestMembership = await ctx.db
          .query("memberships")
          .withIndex("by_stay_user", (query) => query.eq("stayId", args.stayId).eq("userId", args.guestUserId!))
          .first();
        if (!guestMembership || guestMembership.status !== "active") return false;

        const currentTerms = await getCurrentGuestTerms(ctx, args.stayId, args.guestUserId);
        const termsToUse = currentTerms ?? (stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null);
        if (!termsToUse) return false;

        if (guestMembership.acceptedTermsId && (guestMembership.acceptedTermsId === termsToUse._id || guestMembership.acceptedTermsId === args.expectedTermsId)) {
          return false;
        }
        return true;
      } else {
        if (hostMembership.acceptedTermsId && (hostMembership.acceptedTermsId === stay.currentTermsId || hostMembership.acceptedTermsId === args.expectedTermsId)) {
          return false;
        }
        return true;
      }
    }
  },
});
