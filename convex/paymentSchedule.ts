import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { calculateObligationLedger, buildObligationPeriods } from "../lib/domain/obligations";
import { addCalendarDays, calendarDateInTimezone } from "../lib/domain/dates";
import { requireHost, requireMembership } from "./lib/auth";
import { ensureObligationsForTerms, listActiveGuestObligations } from "./lib/obligations";
import { recordActivity } from "./lib/activity";
import { getAcceptedGuestTerms, getCurrentGuestTerms } from "./lib/stayTerms";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

async function assertNoOutstandingDueBalance(
  ctx: Parameters<typeof getAcceptedGuestTerms>[0],
  stayId: Id<"stays">,
  guestUserId: Id<"users">,
  today: string,
) {
  const stay = await ctx.db.get(stayId);
  const terms = await getAcceptedGuestTerms(ctx, stayId, guestUserId);
  if (!stay || !terms) throw new Error("Accept your current agreement before changing payment timing");
  const memberships = await ctx.db.query("memberships").withIndex("by_stay", (q) => q.eq("stayId", stayId)).take(21);
  const activeGuests = memberships.filter((item) => item.status === "active" && item.role === "guest");
  const includeLegacy = activeGuests.length === 1 && activeGuests[0]?.userId === guestUserId;
  const [scopedObligations, scopedContributions] = await Promise.all([
    listActiveGuestObligations(ctx, stayId, guestUserId),
    ctx.db.query("contributions").withIndex("by_stay_guest_and_date", (q) => q.eq("stayId", stayId).eq("guestUserId", guestUserId)).order("asc").take(5_000),
  ]);
  const [legacyObligations, legacyContributions] = includeLegacy
    ? await Promise.all([
      listActiveGuestObligations(ctx, stayId, undefined),
      ctx.db.query("contributions").withIndex("by_stay_guest_and_date", (q) => q.eq("stayId", stayId).eq("guestUserId", undefined)).order("asc").take(5_000),
    ])
    : [[], []];
  const obligations = [...scopedObligations, ...legacyObligations];
  const contributions = [...scopedContributions, ...legacyContributions];
  const ledgerTerms = new Map<string, Doc<"terms"> | null>();
  const ledgerObligations = await Promise.all(obligations.map(async (item) => {
    let itemTerms: Doc<"terms"> | null = terms;
    if (item.termsId) {
      const key = item.termsId.toString();
      if (!ledgerTerms.has(key)) ledgerTerms.set(key, await ctx.db.get(item.termsId));
      itemTerms = ledgerTerms.get(key) ?? terms;
    }
    return {
      _id: item._id,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      dueDate: item.dueDate,
      baseAmountCents: item.baseAmountCents,
      type: item.type ?? "cadence" as const,
      title: item.title,
      lateFeeWaived: Boolean(item.lateFeeWaivedAt),
      voided: Boolean(item.voidedAt),
      terms: itemTerms,
    };
  }));
  const ledger = calculateObligationLedger({
    obligations: ledgerObligations,
    contributions: contributions.filter((item) => item.status === "confirmed" && item.countsTowardBalance).map((item) => ({ amountCents: item.amountCents, date: item.date })),
    asOfDate: today,
    terms,
  });
  if (ledger.some((item) => item.dueDate <= today && item.balanceCents > 0)) {
    throw new Error("Bring your due balance to $0 before changing payment timing");
  }
  return { stay, terms, includeLegacy };
}

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.object({
    _id: v.id("paymentScheduleRequests"),
    guestUserId: v.id("users"),
    guestName: v.string(),
    requestedCadence: v.union(v.literal("daily"), v.literal("weekly")),
    requestedPaymentDayOfWeek: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })),
  handler: async (ctx, { stayId }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const requests = membership.role === "host"
      ? await ctx.db.query("paymentScheduleRequests").withIndex("by_stay_status", (q) => q.eq("stayId", stayId).eq("status", "pending")).order("desc").take(50)
      : await ctx.db.query("paymentScheduleRequests").withIndex("by_guest_status", (q) => q.eq("guestUserId", user._id).eq("status", "pending")).order("desc").take(50);
    const forStay = requests.filter((request) => request.stayId === stayId);
    return Promise.all(forStay.map(async (request) => {
      const guest = await ctx.db.get(request.guestUserId);
      return {
        _id: request._id,
        guestUserId: request.guestUserId,
        guestName: guest?.name ?? "Guest",
        requestedCadence: request.requestedCadence,
        requestedPaymentDayOfWeek: request.requestedPaymentDayOfWeek,
        status: request.status,
        requestedAt: request.requestedAt,
        reviewedAt: request.reviewedAt,
      };
    }));
  },
});

export const requestChange = mutation({
  args: {
    stayId: v.id("stays"),
    cadence: v.union(v.literal("daily"), v.literal("weekly")),
    paymentDayOfWeek: v.optional(v.number()),
  },
  returns: v.id("paymentScheduleRequests"),
  handler: async (ctx, { stayId, cadence, paymentDayOfWeek }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    if (membership.role !== "guest") throw new Error("Only guests can request a payment schedule change");
    if (cadence === "weekly" && (paymentDayOfWeek === undefined || !Number.isInteger(paymentDayOfWeek) || paymentDayOfWeek < 0 || paymentDayOfWeek > 6)) {
      throw new Error("Choose a weekday for weekly contributions");
    }
    if (cadence === "daily" && paymentDayOfWeek !== undefined) throw new Error("Daily contributions do not use a weekly payment day");
    const now = Date.now();
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("This stay has ended");
    const currentTerms = await getCurrentGuestTerms(ctx, stayId, user._id);
    if (!currentTerms || membership.acceptedTermsId !== currentTerms._id) throw new Error("Review and accept your current agreement before requesting a schedule change");
    const { terms } = await assertNoOutstandingDueBalance(ctx, stayId, user._id, calendarDateInTimezone(new Date(now), stay.timezone));
    if (terms.cadence === cadence && (cadence !== "weekly" || terms.paymentDayOfWeek === paymentDayOfWeek)) {
      throw new Error("Choose a payment schedule different from your current one");
    }
    const pending = await ctx.db.query("paymentScheduleRequests").withIndex("by_stay_status", (q) => q.eq("stayId", stayId).eq("status", "pending")).take(50);
    if (pending.some((request) => request.guestUserId === user._id)) throw new Error("You already have a payment schedule request awaiting review");
    const recent = await ctx.db.query("paymentScheduleRequests").withIndex("by_guest_status", (q) => q.eq("guestUserId", user._id).eq("status", "approved")).order("desc").take(50);
    if (recent.some((request) => request.stayId === stayId && request.reviewedAt && now - request.reviewedAt < COOLDOWN_MS)) {
      throw new Error("Payment schedule changes are limited to once every 14 days");
    }
    const _id = await ctx.db.insert("paymentScheduleRequests", {
      stayId,
      guestUserId: user._id,
      sourceTermsId: currentTerms._id,
      requestedCadence: cadence,
      ...(cadence === "weekly" ? { requestedPaymentDayOfWeek: paymentDayOfWeek } : {}),
      status: "pending",
      requestedAt: now,
    });
    await recordActivity(ctx, { stayId, actorUserId: user._id, guestUserId: user._id, kind: "terms", action: "payment_schedule_requested", detail: `Requested ${cadence}${cadence === "weekly" ? ` payments due ${days[paymentDayOfWeek!]}` : " payments"}`, entityId: _id });
    return _id;
  },
});

export const reviewRequest = mutation({
  args: { requestId: v.id("paymentScheduleRequests"), decision: v.union(v.literal("approve"), v.literal("reject")) },
  returns: v.null(),
  handler: async (ctx, { requestId, decision }) => {
    const request = await ctx.db.get(requestId);
    if (!request || request.status !== "pending") throw new Error("This payment schedule request is no longer pending");
    const { user } = await requireHost(ctx, request.stayId);
    const now = Date.now();
    const stay = await ctx.db.get(request.stayId);
    if (!stay) throw new Error("This stay no longer exists");
    if (decision === "reject") {
      await ctx.db.patch(requestId, { status: "rejected", reviewedAt: now, reviewedBy: user._id });
      await recordActivity(ctx, { stayId: request.stayId, actorUserId: user._id, guestUserId: request.guestUserId, kind: "terms", action: "payment_schedule_rejected", detail: "Payment schedule change request declined", entityId: requestId });
      return null;
    }
    if (stay.status === "ended") throw new Error("This stay has ended; decline the pending request to clear it");
    const timezone = stay.timezone;
    const effectiveFrom = calendarDateInTimezone(new Date(now), timezone);
    const { terms: previous, includeLegacy } = await assertNoOutstandingDueBalance(ctx, request.stayId, request.guestUserId, effectiveFrom);
    const recent = await ctx.db.query("paymentScheduleRequests").withIndex("by_guest_status", (q) => q.eq("guestUserId", request.guestUserId).eq("status", "approved")).order("desc").take(50);
    if (recent.some((item) => item.stayId === request.stayId && item.reviewedAt && now - item.reviewedAt < COOLDOWN_MS)) {
      throw new Error("Payment schedule changes are limited to once every 14 days");
    }
    const membership = await ctx.db.query("memberships").withIndex("by_stay_user", (q) => q.eq("stayId", request.stayId).eq("userId", request.guestUserId)).unique();
    if (!membership || membership.role !== "guest" || membership.status !== "active") throw new Error("Guest is no longer an active household member");
    const currentTerms = await getCurrentGuestTerms(ctx, request.stayId, request.guestUserId);
    if (!currentTerms || membership.acceptedTermsId !== currentTerms._id) throw new Error("The guest must accept their latest agreement before this schedule change can be approved");
    if (!request.sourceTermsId || request.sourceTermsId !== currentTerms._id) {
      throw new Error("The guest agreement changed after this request. Decline it and ask the guest to submit a new request.");
    }
    const cadence = request.requestedCadence;
    const rateCents = previous.cadence === cadence
      ? previous.rateCents
      : cadence === "daily"
        ? Math.round(previous.rateCents / 7)
        : previous.rateCents * 7;
    if (!Number.isSafeInteger(rateCents) || rateCents < 0 || rateCents > 100_000_000 || (previous.rateCents > 0 && rateCents === 0)) {
      throw new Error("That payment schedule cannot be represented at this rate. Ask your host to adjust the agreement.");
    }
    const lateFeeCents = cadence === "daily" ? 500 : 2_500;
    const lateFeeEnabled = previous.lateFeeEnabled ?? previous.lateFeeCents > 0;
    const nextTermsId = await ctx.db.insert("terms", {
      stayId: request.stayId,
      guestUserId: request.guestUserId,
      version: previous.version + 1,
      effectiveFrom,
      startDate: previous.startDate,
      endDate: previous.endDate,
      cadence,
      ...(cadence === "weekly" ? { paymentDayOfWeek: request.requestedPaymentDayOfWeek } : {}),
      billingBasis: previous.billingBasis ?? "continuous",
      rateCents,
      earlyDiscountEnabled: previous.earlyDiscountEnabled,
      earlyDiscountPercentage: previous.earlyDiscountPercentage,
      earlyDiscountDays: previous.earlyDiscountDays,
      lateFeeEnabled,
      lateFeeCents: lateFeeEnabled ? lateFeeCents : previous.lateFeeCents,
      graceDays: previous.graceDays,
      houseNotes: previous.houseNotes,
      ...(previous.houseRules !== undefined ? { houseRules: previous.houseRules } : {}),
      ...(previous.rewards !== undefined ? { rewards: previous.rewards } : {}),
      createdBy: user._id,
      createdAt: now,
    });
    const [scopedObligations, legacyObligations] = await Promise.all([
      listActiveGuestObligations(ctx, request.stayId, request.guestUserId),
      includeLegacy
        ? listActiveGuestObligations(ctx, request.stayId, undefined)
        : Promise.resolve([]),
    ]);
    const oldObligations = [...scopedObligations, ...legacyObligations];
    const priorTerms = new Map<string, Doc<"terms"> | null>();
    for (const obligation of oldObligations) {
      if (obligation.voidedAt || obligation.type === "adhoc" || obligation.type === "occupancy" || obligation.periodEnd < effectiveFrom) continue;
      if (obligation.periodStart < effectiveFrom) {
        const oldTerms = obligation.termsId
          ? (priorTerms.get(obligation.termsId.toString()) ?? await ctx.db.get(obligation.termsId))
          : previous;
        if (obligation.termsId && !priorTerms.has(obligation.termsId.toString())) priorTerms.set(obligation.termsId.toString(), oldTerms);
        const preservedEnd = addCalendarDays(effectiveFrom, -1);
        const preservedAmount = oldTerms
          ? buildObligationPeriods({ ...oldTerms, startDate: obligation.periodStart, endDate: preservedEnd })[0]?.baseAmountCents ?? 0
          : 0;
        if (preservedAmount > 0) await ctx.db.insert("obligations", {
          stayId: request.stayId,
          termsId: obligation.termsId ?? previous._id,
          guestUserId: request.guestUserId,
          type: "cadence",
          periodStart: obligation.periodStart,
          periodEnd: preservedEnd,
          dueDate: obligation.dueDate,
          baseAmountCents: preservedAmount,
          createdAt: now,
        });
      }
      await ctx.db.patch(obligation._id, { voidedAt: now, voidedBy: user._id });
    }
    await ctx.db.insert("termsAcceptances", { stayId: request.stayId, termsId: nextTermsId, userId: request.guestUserId, acceptedAt: now, method: "guest" });
    await ctx.db.patch(membership._id, { acceptedTermsId: nextTermsId });
    await ensureObligationsForTerms(ctx, request.stayId, nextTermsId, request.guestUserId, user._id);
    await ctx.db.patch(requestId, { status: "approved", reviewedAt: now, reviewedBy: user._id, appliedTermsId: nextTermsId });
    await recordActivity(ctx, { stayId: request.stayId, actorUserId: user._id, guestUserId: request.guestUserId, kind: "terms", action: "payment_schedule_approved", detail: `Payment schedule changed to ${cadence}${cadence === "weekly" ? ` with ${days[request.requestedPaymentDayOfWeek!]}` : ""}; charges prorated from ${effectiveFrom}`, entityId: nextTermsId });
    return null;
  },
});
