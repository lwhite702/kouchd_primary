import { v } from "convex/values";

import { addCalendarDays, calendarDateInTimezone, stayDays } from "../lib/domain/dates";
import { mutation, query } from "./_generated/server";
import { requireHost, resolveFinancialGuest } from "./lib/auth";
import { assertCalendarDate } from "./lib/validation";
import { getAcceptedGuestTerms } from "./lib/stayTerms";

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
    recordedAt: v.number(),
  })),
  handler: async (ctx, { stayId, guestUserId }) => {
    const access = await resolveFinancialGuest(ctx, stayId, guestUserId);
    if (!access.guestUserId) return [];
    return ctx.db.query("occupiedNights")
      .withIndex("by_stay_guest_night", (q) => q.eq("stayId", stayId).eq("guestUserId", access.guestUserId))
      .order("desc")
      .take(100);
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
    const terms = await getAcceptedGuestTerms(ctx, stayId, guestUserId);
    if (!terms || membership.acceptedTermsId !== terms._id) throw new Error("The guest must accept their current agreement first");
    if (terms.billingBasis !== "occupied_nights") throw new Error("This guest agreement bills every day in the stay, not only recorded nights");
    const effectiveStart = terms.effectiveFrom && terms.effectiveFrom > terms.startDate ? terms.effectiveFrom : terms.startDate;
    if (nightDate < effectiveStart || nightDate > terms.endDate) throw new Error("The overnight date must fall within this guest's accepted agreement");
    const existingNight = await ctx.db.query("occupiedNights")
      .withIndex("by_stay_guest_night", (q) => q.eq("stayId", stayId).eq("guestUserId", guestUserId).eq("nightDate", nightDate))
      .unique();
    if (existingNight) throw new Error("That overnight has already been recorded");

    let amountCents = terms.rateCents;
    let dueDate = nightDate;
    if (terms.cadence === "weekly") {
      const firstPaymentDate = addCalendarDays(effectiveStart, 6);
      const legacyPaymentDay = new Date(`${firstPaymentDate}T00:00:00.000Z`).getUTCDay();
      const scheduledDueDate = paymentDateForNight(nightDate, "weekly", terms.paymentDayOfWeek ?? legacyPaymentDay);
      dueDate = scheduledDueDate > terms.endDate ? terms.endDate : scheduledDueDate;
      const billingPeriodStart = addCalendarDays(scheduledDueDate, -6) < effectiveStart ? effectiveStart : addCalendarDays(scheduledDueDate, -6);
      const dayIndex = stayDays(billingPeriodStart, nightDate) - 1;
      amountCents = Math.round(((dayIndex + 1) * terms.rateCents) / 7) - Math.round((dayIndex * terms.rateCents) / 7);
    }

    const periodObligations = await ctx.db.query("obligations")
      .withIndex("by_terms_and_guest", (q) => q.eq("termsId", terms._id).eq("guestUserId", guestUserId))
      .take(1_000);
    const existingCharge = periodObligations.find((item) => !item.voidedAt && item.type === "occupancy" && item.dueDate === dueDate);
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
