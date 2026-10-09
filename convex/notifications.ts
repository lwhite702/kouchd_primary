import { v } from "convex/values";

import { calculateObligationLedger } from "../lib/domain/obligations";
import { addCalendarDays, calendarDateInTimezone, stayDays } from "../lib/domain/dates";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
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
      consequences = "On-time settlement maintains your transparent household standing and locks in any applicable early payment discount.";
      actionRequired = `Please submit ${formattedBalance} before ${dueDate}.`;
      break;

    case "due_today":
      periodLabel = `${baseTitle} [DUE TODAY]`;
      urgencyLevel = "moderate";
      stageTitle = "Stay contribution due today";
      warningMessage = `Your scheduled contribution of ${formattedBalance} for ${stayName} is due today (${dueDate}).`;
      consequences = `Unpaid contributions enter the grace period after today. A late fee of ${formattedFee} will compound weekly if not resolved within ${terms.graceDays} days (by ${graceEnd}).`;
      actionRequired = `Submit payment of ${formattedBalance} today to avoid entering delinquent grace status.`;
      break;

    case "grace_overdue":
      periodLabel = `${baseTitle} [PAST DUE — GRACE PERIOD]`;
      urgencyLevel = "urgent";
      stageTitle = "ACTION REQUIRED: Stay contribution past due";
      warningMessage = `Your stay contribution of ${formattedBalance} was due on ${dueDate} and is now ${daysPastDue} day${daysPastDue === 1 ? "" : "s"} overdue.`;
      consequences = `POTENTIAL CONSEQUENCES:\n• Late Fees: If unpaid by ${graceEnd}, a recurring late fee of ${formattedFee} will be charged immediately and will compound weekly.\n• Discount Forfeiture: Early payment discounts are cancelled.\n• Delinquency Record: Non-payment will be recorded against your stay profile.`;
      actionRequired = `Submit ${formattedBalance} immediately before your grace period expires on ${graceEnd}.`;
      break;

    case "grace_final":
      periodLabel = `${baseTitle} [FINAL GRACE NOTICE — LATE FEE IMMINENT]`;
      urgencyLevel = "urgent";
      stageTitle = "FINAL GRACE NOTICE: Late fee assessed tomorrow";
      warningMessage = `TODAY IS THE FINAL DAY of your grace period for ${baseTitle}. Outstanding balance: ${formattedBalance}.`;
      consequences = `CONSEQUENCES TAKING EFFECT TOMORROW:\n• Financial Penalty: A ${formattedFee} late fee will be added to your ledger tomorrow morning and will compound weekly.\n• Host Escalation: Immediate delinquency notification delivered to host ${hostName}.\n• Stay Default: Initiates stay agreement non-compliance review.`;
      actionRequired = `Submit ${formattedBalance} today to prevent late fees and agreement default.`;
      break;

    case "late_fee_assessed":
      periodLabel = `${baseTitle} [URGENT: LATE FEE ASSESSED]`;
      urgencyLevel = "urgent";
      stageTitle = "URGENT NOTICE: Late fee assessed on overdue balance";
      warningMessage = `A late fee of ${formattedFee} has been charged to your ledger (Total late fees: ${formattedTotalFees}). Outstanding balance is now ${formattedBalance}.`;
      consequences = `ACTIVE CONSEQUENCES & PENALTIES:\n• Compounding Penalties: An additional ${formattedFee} will compound every 7 days until cleared in full.\n• Delinquency Record: Formal non-payment status flagged on your profile.\n• Risk of Stay Termination: Persistent non-payment puts your stay agreement at risk of cancellation.`;
      actionRequired = `Remit the full balance of ${formattedBalance} immediately to stop compounding late fees.`;
      break;

    case "late_fee_warning":
      periodLabel = `${baseTitle} [URGENT: LATE FEE COMPOUNDING SOON]`;
      urgencyLevel = "urgent";
      stageTitle = "URGENT: Compounding late fee in 3 days";
      warningMessage = `Your balance of ${formattedBalance} is ${daysPastDue} days overdue. An additional ${formattedFee} will compound within 3 days.`;
      consequences = `ACTIVE CONSEQUENCES:\n• Accruing Fees: Late fees compound weekly (${formattedTotalFees} assessed to date).\n• Host Alert: Host ${hostName} has been alerted to ongoing non-payment.\n• Impending Stay Cancellation: Host may begin formal stay termination proceedings upon continued default.`;
      actionRequired = `Clear your balance of ${formattedBalance} now to prevent next compounding fee.`;
      break;

    case "critical_delinquency":
      periodLabel = `${baseTitle} [CRITICAL NOTICE: STAY TERMINATION RISK]`;
      urgencyLevel = "critical";
      stageTitle = "CRITICAL NOTICE: Severe stay delinquency — Termination risk";
      warningMessage = `FINAL DEMAND: Your stay balance of ${formattedBalance} is ${daysPastDue} days delinquent and remains unpaid despite repeated notices (${formattedTotalFees} in late fees).`;
      consequences = `CRITICAL CONSEQUENCES IN EFFECT:\n• Immediate Stay Termination: Host ${hostName} may terminate your stay agreement and require immediate departure.\n• Household Access Revocation: Access codes, door codes, and wifi privileges may be revoked.\n• Profile Flag: Permanent default recorded on your Kouchd record.\n• Debt Recovery: Delinquent balance of ${formattedBalance} referred for recovery.`;
      actionRequired = `Remit ${formattedBalance} immediately or contact ${hostName} right now to resolve this delinquency.`;
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
  args: {
    userId: v.id("users"),
    stayId: v.optional(v.id("stays")),
    workflow: v.string(),
    entityId: v.optional(v.string()),
    detail: v.optional(v.string()),
    action: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user_workflow_and_entity", (query) => query.eq("userId", args.userId).eq("workflow", args.workflow).eq("entityId", args.entityId))
      .take(1);
    if (existing.length === 0) {
      await ctx.db.insert("notifications", {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        sentAt: Date.now(),
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
          createdAt: Date.now(),
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

    const obligationMinDate = addCalendarDays(utcToday, -180);
    const obligationMaxDate = addCalendarDays(utcToday, 2);
    const obligations = await ctx.db.query("obligations").withIndex("by_due_date", (query) =>
      query.gte("dueDate", obligationMinDate).lte("dueDate", obligationMaxDate),
    ).order("desc").take(1_000);
    const ledgersByGuest = new Map<string, ReturnType<typeof calculateObligationLedger>>();
    const termsById = new Map<string, Doc<"terms"> | null>();
    const currentTermsByGuest = new Map<string, Doc<"terms"> | null>();
    for (const obligation of obligations) {
      const guestUserId = obligation.guestUserId;
      if (!guestUserId || obligation.voidedAt) continue;
      const stay = await ctx.db.get(obligation.stayId);
      if (!stay || stay.status === "ended") continue;
      const localToday = calendarDateInTimezone(new Date(now), stay.timezone);
      const localTomorrow = addCalendarDays(localToday, 1);
      if (obligation.dueDate > localTomorrow) continue;
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

      candidates.push({
        userId: guestUserId,
        stayId: obligation.stayId,
        workflow: "payment-due-reminder",
        entityId,
        data: reminderData,
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

export const agreementPendingCandidates = internalQuery({
  args: { now: v.number(), slot: v.optional(v.union(v.literal("am"), v.literal("pm"))) },
  returns: v.array(v.object({
    userId: v.id("users"),
    stayId: v.id("stays"),
    workflow: v.string(),
    entityId: v.string(),
    cancellationKey: v.string(),
    data: v.any(),
  })),
  handler: async (ctx, { now, slot }) => {
    const determinedSlot = slot ?? (new Date(now).getUTCHours() < 16 ? "am" : "pm");
    const candidates: Array<{
      userId: Id<"users">;
      stayId: Id<"stays">;
      workflow: string;
      entityId: string;
      cancellationKey: string;
      data: Record<string, unknown>;
    }> = [];

    // Query pending stays
    const stays = await ctx.db
      .query("stays")
      .withIndex("by_status", (query) => query.eq("status", "pending"))
      .take(200);

    for (const stay of stays) {
      if (!stay.currentTermsId) continue;
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

      // Check each guest
      for (const guestMembership of guestMemberships) {
        const guestUser = await ctx.db.get(guestMembership.userId);
        const guestTerms = await getCurrentGuestTerms(ctx, stay._id, guestMembership.userId);
        const termsToUse = guestTerms ?? defaultTerms;

        const isGuestUnsigned = !guestMembership.acceptedTermsId || guestMembership.acceptedTermsId !== termsToUse._id;
        if (isGuestUnsigned) {
          // Candidate for guest
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
              data: buildAgreementPendingPayload({
                recipientRole: "guest",
                stay,
                hostUser,
                guestUser,
                terms: termsToUse,
                termsUrl,
              }),
            });
          }

          // Candidate for host (alerting host about this unsigned guest)
          if (hostMembership && stay.hostUserId) {
            const hostEntityId = `agreement-pending:${stay._id}:${stay.hostUserId}:${guestMembership.userId}:${localDate}:${determinedSlot}`;
            const hostCancellationKey = `agreement-pending:${stay._id}:${stay.hostUserId}:${guestMembership.userId}`;

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
                data: buildAgreementPendingPayload({
                  recipientRole: "host",
                  stay,
                  hostUser,
                  guestUser,
                  terms: termsToUse,
                  termsUrl,
                }),
              });
            }
          }
        }
      }

      // If host themself has not accepted currentTermsId
      if (hostMembership && stay.hostUserId && (!hostMembership.acceptedTermsId || hostMembership.acceptedTermsId !== stay.currentTermsId)) {
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
            data: buildAgreementPendingPayload({
              recipientRole: "host",
              stay,
              hostUser,
              guestUser: null,
              terms: defaultTerms,
              termsUrl,
            }),
          });
        }
      }
    }

    return candidates.slice(0, 500);
  },
});
