import { v } from "convex/values";

import { addCalendarDays, calendarDateInTimezone, stayDays } from "../lib/domain/dates";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireHost, resolveFinancialGuest } from "./lib/auth";
import { assertCalendarDate } from "./lib/validation";
import { getAcceptedGuestTermsForDate } from "./lib/stayTerms";
import { listActiveGuestObligations } from "./lib/obligations";
import { recordActivity } from "./lib/activity";

function paymentDateForNight(nightDate: string, cadence: "daily" | "weekly", paymentDayOfWeek?: number) {
  if (cadence === "daily") return nightDate;
  const weekday = paymentDayOfWeek ?? new Date(`${nightDate}T00:00:00.000Z`).getUTCDay();
  const currentDay = new Date(`${nightDate}T00:00:00.000Z`).getUTCDay();
  return addCalendarDays(nightDate, (weekday - currentDay + 7) % 7);
}

export const list = query({
  args: { stayId: v.id("stays"), guestUserId: v.optional(v.id("users")) },
  returns: v.array(v.object({
    _id: v.id("occupiedNights"),
    nightDate: v.string(),
    amountCents: v.number(),
    cadence: v.union(v.literal("daily"), v.literal("weekly")),
    recordedAt: v.number(),
    voidedAt: v.optional(v.number()),
  })),
  handler: async (ctx, { stayId, guestUserId }) => {
    const access = await resolveFinancialGuest(ctx, stayId, guestUserId);
    if (!access.guestUserId) return [];
    const nights = await ctx.db.query("occupiedNights")
      .withIndex("by_stay_guest_night", (q) => q.eq("stayId", stayId).eq("guestUserId", access.guestUserId))
      .order("desc")
      .take(100);
    return Promise.all(nights.map(async (night) => {
      const terms = await ctx.db.get(night.termsId);
      return {
        _id: night._id,
        nightDate: night.nightDate,
        amountCents: night.amountCents,
        cadence: terms?.cadence ?? "daily" as const,
        recordedAt: night.recordedAt,
        voidedAt: night.voidedAt,
      };
    }));
  },
});

export const recordOvernight = mutation({
  args: { stayId: v.id("stays"), guestUserId: v.id("users"), nightDate: v.string() },
  returns: v.id("occupiedNights"),
  handler: async (ctx, { stayId, guestUserId, nightDate }) => {
    const { user } = await requireHost(ctx, stayId);
    await resolveFinancialGuest(ctx, stayId, guestUserId);
    assertCalendarDate(nightDate, "Overnight date");
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("This stay has ended");
    if (nightDate > calendarDateInTimezone(new Date(), stay.timezone)) throw new Error("Record an overnight after it has happened");
    const membership = await ctx.db.query("memberships")
      .withIndex("by_stay_user", (q) => q.eq("stayId", stayId).eq("userId", guestUserId))
      .unique();
    if (!membership || membership.status !== "active" || membership.role !== "guest") throw new Error("Choose an active guest in this household");
    const terms = await getAcceptedGuestTermsForDate(ctx, stayId, guestUserId, nightDate);
    if (!terms) throw new Error("No accepted guest agreement covers this overnight date");
    if (terms.billingBasis !== "occupied_nights") throw new Error("This guest agreement bills every day in the stay, not only recorded nights");
    const effectiveStart = terms.effectiveFrom && terms.effectiveFrom > terms.startDate ? terms.effectiveFrom : terms.startDate;
    if (nightDate < effectiveStart || nightDate > terms.endDate) throw new Error("The overnight date must fall within this guest's accepted agreement");
    const existingNights = await ctx.db.query("occupiedNights")
      .withIndex("by_stay_guest_night", (q) => q.eq("stayId", stayId).eq("guestUserId", guestUserId).eq("nightDate", nightDate))
      .take(20);
    if (existingNights.some((night) => !night.voidedAt)) throw new Error("That overnight has already been recorded");

    let amountCents = terms.rateCents;
    let dueDate = nightDate;
    const recordedOn = calendarDateInTimezone(new Date(), stay.timezone);
    if (terms.cadence === "weekly") {
      const firstPaymentDate = addCalendarDays(effectiveStart, 6);
      const legacyPaymentDay = new Date(`${firstPaymentDate}T00:00:00.000Z`).getUTCDay();
      const scheduledDueDate = paymentDateForNight(nightDate, "weekly", terms.paymentDayOfWeek ?? legacyPaymentDay);
      dueDate = scheduledDueDate > terms.endDate ? terms.endDate : scheduledDueDate;
      const billingPeriodStart = addCalendarDays(scheduledDueDate, -6) < effectiveStart ? effectiveStart : addCalendarDays(scheduledDueDate, -6);
      const dayIndex = stayDays(billingPeriodStart, nightDate) - 1;
      amountCents = Math.round(((dayIndex + 1) * terms.rateCents) / 7) - Math.round((dayIndex * terms.rateCents) / 7);
    }
    if (dueDate < recordedOn) dueDate = recordedOn;

    const periodObligations = await listActiveGuestObligations(ctx, stayId, guestUserId);
    const existingCharge = periodObligations.find((item) => !item.voidedAt && item.type === "occupancy" && item.termsId === terms._id && item.dueDate === dueDate);
    const now = Date.now();
    const obligationId = existingCharge
      ? existingCharge._id
      : await ctx.db.insert("obligations", {
        stayId,
        termsId: terms._id,
        guestUserId,
        type: "occupancy",
        title: `Occupied nights due ${dueDate}`,
        periodStart: nightDate,
        periodEnd: nightDate,
        dueDate,
        baseAmountCents: amountCents,
        createdAt: now,
      });
    if (existingCharge) {
      await ctx.db.patch(existingCharge._id, {
        periodStart: nightDate < existingCharge.periodStart ? nightDate : existingCharge.periodStart,
        periodEnd: nightDate > existingCharge.periodEnd ? nightDate : existingCharge.periodEnd,
        baseAmountCents: existingCharge.baseAmountCents + amountCents,
      });
    }
    const occupiedNightId = await ctx.db.insert("occupiedNights", {
      stayId,
      guestUserId,
      nightDate,
      termsId: terms._id,
      obligationId,
      amountCents,
      recordedBy: user._id,
      recordedAt: now,
    });
    return occupiedNightId;
  },
});

export const voidOvernight = mutation({
  args: { occupiedNightId: v.id("occupiedNights") },
  returns: v.null(),
  handler: async (ctx, { occupiedNightId }) => {
    const night = await ctx.db.get(occupiedNightId);
    if (!night) throw new Error("Overnight record not found");
    const { user } = await requireHost(ctx, night.stayId);
    const stay = await ctx.db.get(night.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays are read-only");
    if (night.voidedAt) return null;
    const obligation = await ctx.db.get(night.obligationId);
    if (!obligation || obligation.voidedAt) throw new Error("The linked overnight charge is no longer active");
    const linkedNights: Doc<"occupiedNights">[] = [];
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone) {
      const page = await ctx.db.query("occupiedNights")
        .withIndex("by_obligation", (q) => q.eq("obligationId", obligation._id))
        .paginate({ cursor, numItems: 200 });
      linkedNights.push(...page.page);
      cursor = page.continueCursor;
      isDone = page.isDone;
    }
    const now = Date.now();
    await ctx.db.patch(occupiedNightId, { voidedAt: now, voidedBy: user._id });
    const remainingNights = linkedNights.filter((item) => item._id !== occupiedNightId && !item.voidedAt);
    const remainingAmountCents = remainingNights.reduce((total, item) => total + item.amountCents, 0);
    if (remainingNights.length === 0 || remainingAmountCents === 0) {
      await ctx.db.patch(obligation._id, { voidedAt: now, voidedBy: user._id });
    } else {
      const dates = remainingNights.map((item) => item.nightDate).sort();
      await ctx.db.patch(obligation._id, {
        periodStart: dates[0],
        periodEnd: dates[dates.length - 1],
        baseAmountCents: remainingAmountCents,
      });
    }
    await recordActivity(ctx, {
      stayId: night.stayId,
      actorUserId: user._id,
      guestUserId: night.guestUserId,
      kind: "obligation",
      action: "occupancy_record_voided",
      detail: `Overnight record for ${night.nightDate} was corrected`,
      entityId: occupiedNightId,
    });
    return null;
  },
});
