import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { ensureObligationsForTerms } from "./lib/obligations";
import { assertStayTerms } from "./lib/validation";
import { acceptGuestTermsAutomatically, ensureGuestTerms, getCurrentGuestTerms, offerGuestAgreement } from "./lib/stayTerms";
import { addCalendarDays, calendarDateInTimezone, stayDays } from "../lib/domain/dates";
import { buildObligationPeriods } from "../lib/domain/obligations";

const termsInput = {
  startDate: v.string(),
  endDate: v.string(),
  cadence: v.union(v.literal("daily"), v.literal("weekly")),
  paymentDayOfWeek: v.optional(v.number()),
  billingBasis: v.optional(v.union(v.literal("continuous"), v.literal("occupied_nights"))),
  rateCents: v.number(),
  earlyDiscountEnabled: v.boolean(),
  earlyDiscountPercentage: v.number(),
  earlyDiscountDays: v.number(),
  lateFeeEnabled: v.boolean(),
  lateFeeCents: v.number(),
  graceDays: v.number(),
  houseNotes: v.string(),
  houseRules: v.optional(
    v.array(
      v.object({
        id: v.string(),
        category: v.string(),
        title: v.string(),
        description: v.string(),
        required: v.boolean(),
      })
    )
  ),
  rewards: v.optional(
    v.object({
      enabled: v.boolean(),
      coinName: v.string(),
      centsPerPoint: v.number(),
      maxCreditPerPeriodCents: v.number(),
    })
  ),
};

export const acceptCurrent = mutation({
  args: {
    stayId: v.id("stays"),
    initialCadence: v.optional(v.union(v.literal("daily"), v.literal("weekly"))),
    initialPaymentDayOfWeek: v.optional(v.number()),
  },
  returns: v.union(v.literal("pending"), v.literal("active")),
  handler: async (ctx, { stayId, initialCadence, initialPaymentDayOfWeek }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || !stay.currentTermsId || stay.status === "ended") throw new Error("No active terms to accept");
    let terms = membership.role === "guest"
      ? await ensureGuestTerms(ctx, stayId, user._id, stay.hostUserId)
      : await ctx.db.get(stay.currentTermsId);
    if (!terms) throw new Error("No active terms to accept");
    if (membership.role === "guest" && !membership.acceptedTermsId && initialCadence) {
      if (initialCadence === "weekly" && (initialPaymentDayOfWeek === undefined || !Number.isInteger(initialPaymentDayOfWeek) || initialPaymentDayOfWeek < 0 || initialPaymentDayOfWeek > 6)) {
        throw new Error("Choose the weekday your weekly contribution is due");
      }
      const selectedRate = terms.cadence === initialCadence
        ? terms.rateCents
        : initialCadence === "daily"
          ? Math.round(terms.rateCents / 7)
          : terms.rateCents * 7;
      if (!Number.isSafeInteger(selectedRate) || selectedRate < 0 || selectedRate > 100_000_000 || (terms.rateCents > 0 && selectedRate === 0)) {
        throw new Error("That payment schedule cannot be represented at this rate. Ask your host to adjust the agreement.");
      }
      const selectedFee = initialCadence === "daily" ? 500 : 2_500;
      const lateFeeEnabled = terms.lateFeeEnabled ?? terms.lateFeeCents > 0;
      await ctx.db.patch(terms._id, {
        cadence: initialCadence,
        rateCents: selectedRate,
        ...(initialCadence === "weekly" ? { paymentDayOfWeek: initialPaymentDayOfWeek } : { paymentDayOfWeek: undefined }),
        ...(lateFeeEnabled ? { lateFeeEnabled: true, lateFeeCents: selectedFee } : {}),
      });
      terms = { ...terms, cadence: initialCadence, rateCents: selectedRate, paymentDayOfWeek: initialCadence === "weekly" ? initialPaymentDayOfWeek : undefined, ...(lateFeeEnabled ? { lateFeeEnabled: true, lateFeeCents: selectedFee } : {}) };
    }
    const termsId = terms._id;
    if (membership.acceptedTermsId === termsId) {
      return stay.status === "active" ? "active" : "pending";
    }
    const existing = await ctx.db.query("termsAcceptances").withIndex("by_terms_user", (query) => query.eq("termsId", termsId).eq("userId", user._id)).unique();
    const acceptedAt = Date.now();
    if (!existing) await ctx.db.insert("termsAcceptances", { stayId, termsId, userId: user._id, acceptedAt, method: membership.role === "guest" ? "guest" : "host" });
    const pendingOffers = await ctx.db.query("agreementOffers").withIndex("by_terms_guest", (query) => query.eq("termsId", termsId).eq("guestUserId", user._id)).take(10);
    for (const offer of pendingOffers) if (offer.status === "pending") await ctx.db.patch(offer._id, { status: "accepted", acceptedAt, acceptedBy: user._id });
    if (membership.acceptedTermsId !== termsId) await ctx.db.patch(membership._id, { acceptedTermsId: termsId });
    if (membership.role === "guest") {
      if (terms.effectiveFrom && membership.acceptedTermsId !== termsId) {
        const effectiveBoundary = calendarDateInTimezone(new Date(), stay.timezone);
        if (terms.effectiveFrom !== effectiveBoundary) {
          await ctx.db.patch(termsId, { effectiveFrom: effectiveBoundary });
        }
        const previousObligations: Doc<"obligations">[] = [];
        let cursor: string | null = null;
        let isDone = false;
        while (!isDone) {
          const page = await ctx.db
            .query("obligations")
            .withIndex("by_stay_guest_and_voided", (query) => query
              .eq("stayId", stayId)
              .eq("guestUserId", user._id)
              .eq("voidedAt", undefined))
            .paginate({ cursor, numItems: 500 });
          previousObligations.push(...page.page);
          cursor = page.continueCursor;
          isDone = page.isDone;
        }
        for (const obligation of previousObligations) {
          if (obligation.termsId === termsId || obligation.voidedAt || obligation.type === "adhoc" || obligation.type === "occupancy" || obligation.periodEnd < effectiveBoundary) continue;

          if (obligation.periodStart < effectiveBoundary) {
            const preservedPeriodEnd = addCalendarDays(effectiveBoundary, -1);
            const sourceTerms = obligation.termsId
              ? await ctx.db.get(obligation.termsId)
              : stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
            const preservedDays = stayDays(obligation.periodStart, preservedPeriodEnd);
            const fullPeriodDays = stayDays(obligation.periodStart, obligation.periodEnd);
            const preservedAmount = sourceTerms
              ? buildObligationPeriods({
                ...sourceTerms,
                startDate: obligation.periodStart,
                endDate: preservedPeriodEnd,
              })[0]?.baseAmountCents ?? 0
              : Math.round((obligation.baseAmountCents * preservedDays) / fullPeriodDays);

            if (preservedDays > 0 && preservedAmount > 0) {
              await ctx.db.insert("obligations", {
                stayId,
                termsId: obligation.termsId ?? sourceTerms?._id,
                guestUserId: user._id,
                type: "cadence",
                periodStart: obligation.periodStart,
                periodEnd: preservedPeriodEnd,
                dueDate: obligation.dueDate,
                baseAmountCents: preservedAmount,
                lateFeeWaivedAt: obligation.lateFeeWaivedAt,
                lateFeeWaivedBy: obligation.lateFeeWaivedBy,
                createdAt: Date.now(),
              });
            }
          }

          await ctx.db.patch(obligation._id, { voidedAt: Date.now(), voidedBy: user._id });
        }
      }
      await ensureObligationsForTerms(ctx, stayId, termsId, user._id, user._id);
    }
    const memberships = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stayId)).take(50);
    const activeMemberships = memberships.filter((member) => member.status === "active");
    let allAccepted = activeMemberships.length >= 2;
    for (const member of activeMemberships) {
      if (member.userId === user._id) continue;
      const memberTerms = member.role === "guest"
        ? await getCurrentGuestTerms(ctx, stayId, member.userId)
        : stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
      if (!memberTerms || member.acceptedTermsId !== memberTerms._id) allAccepted = false;
    }
    if (allAccepted) {
      if (stay.status !== "active") await ctx.db.patch(stayId, { status: "active", updatedAt: Date.now() });
    }
    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "terms",
      action: "accepted",
      detail: membership.role === "guest" ? "Guest accepted agreement" : "Host accepted agreement",
      entityId: termsId,
    });
    return stay.status === "active" || allAccepted ? "active" : "pending";
  },
});

export const updateCurrent = mutation({
  args: { stayId: v.id("stays"), terms: v.object(termsInput) },
  returns: v.id("terms"),
  handler: async (ctx, { stayId, terms }) => {
    const { user, membership } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    assertStayTerms(terms);
    const previous = stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    const now = Date.now();
    const termsId = await ctx.db.insert("terms", { stayId, version: (previous?.version ?? 0) + 1, ...terms, createdBy: user._id, createdAt: now });
    await ctx.db.patch(stayId, { currentTermsId: termsId, status: "pending", updatedAt: now });
    await ctx.db.insert("termsAcceptances", { stayId, termsId, userId: user._id, acceptedAt: now, method: "host" });
    await ctx.db.patch(membership._id, { acceptedTermsId: termsId });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "terms", action: "updated", detail: `Terms version ${(previous?.version ?? 0) + 1} created`, entityId: termsId });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "terms", action: "accepted", detail: "Host accepted the updated agreement", entityId: termsId });
    const guests = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stayId)).take(50);
    for (const guest of guests) {
      if (guest.role !== "guest" || guest.status !== "active") continue;
      const guestTerms = await getCurrentGuestTerms(ctx, stayId, guest.userId);
      if (guestTerms?._id === termsId) await offerGuestAgreement(ctx, { stayId, termsId, guestUserId: guest.userId, offeredBy: user._id });
    }
    return termsId;
  },
});

export const updateGuest = mutation({
  args: { stayId: v.id("stays"), guestUserId: v.id("users"), terms: v.object(termsInput) },
  returns: v.id("terms"),
  handler: async (ctx, { stayId, guestUserId, terms }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    const guestMembership = await ctx.db
      .query("memberships")
      .withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", guestUserId))
      .unique();
    if (!guestMembership || guestMembership.role !== "guest" || guestMembership.status !== "active") {
      throw new Error("Choose an active guest in this household");
    }
    if (terms.cadence === "weekly" && (terms.paymentDayOfWeek === undefined || !Number.isInteger(terms.paymentDayOfWeek) || terms.paymentDayOfWeek < 0 || terms.paymentDayOfWeek > 6)) {
      throw new Error("Choose a weekday for weekly guest contributions");
    }
    assertStayTerms(terms);
    const previous = await ensureGuestTerms(ctx, stayId, guestUserId, user._id);
    const now = Date.now();
    const effectiveFrom = guestMembership.acceptedTermsId
      ? calendarDateInTimezone(new Date(now), stay.timezone)
      : undefined;
    const termsId = await ctx.db.insert("terms", {
      stayId,
      guestUserId,
      version: previous.version + 1,
      ...(effectiveFrom ? { effectiveFrom } : {}),
      ...terms,
      billingBasis: terms.billingBasis ?? previous.billingBasis ?? "continuous",
      createdBy: user._id,
      createdAt: now,
    });
    await offerGuestAgreement(ctx, { stayId, termsId, guestUserId, offeredBy: user._id });
    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      guestUserId,
      kind: "terms",
      action: "guest_terms_updated",
      detail: `Guest agreement updated to version ${previous.version + 1}`,
      entityId: termsId,
    });
    return termsId;
  },
});

export const autoAcceptOffer = internalMutation({
  args: { offerId: v.id("agreementOffers") },
  returns: v.null(),
  handler: async (ctx, { offerId }) => {
    const offer = await ctx.db.get(offerId);
    if (!offer || offer.status !== "pending" || offer.autoAcceptAt === undefined) return null;
    const stay = await ctx.db.get(offer.stayId);
    if (!stay || stay.status === "ended" || !(stay.agreementAutoAcceptEnabled ?? true)) return null;
    const now = Date.now();
    if (offer.autoAcceptAt > now) {
      await ctx.scheduler.runAfter(offer.autoAcceptAt - now, internal.terms.autoAcceptOffer, { offerId });
      return null;
    }
    const membership = await ctx.db.query("memberships")
      .withIndex("by_stay_user", (query) => query.eq("stayId", offer.stayId).eq("userId", offer.guestUserId))
      .unique();
    if (!membership || membership.role !== "guest" || membership.status !== "active") return null;
    const currentTerms = await getCurrentGuestTerms(ctx, offer.stayId, offer.guestUserId);
    if (currentTerms?._id !== offer.termsId) {
      await ctx.db.patch(offerId, { status: "replaced" });
      return null;
    }
    if (membership.acceptedTermsId === offer.termsId) {
      await ctx.db.patch(offerId, { status: "accepted", acceptedAt: now, acceptedBy: offer.guestUserId });
      return null;
    }
    await acceptGuestTermsAutomatically(ctx, { stayId: offer.stayId, guestUserId: offer.guestUserId, actorUserId: offer.offeredBy, membership, terms: currentTerms });
    await ctx.db.patch(offerId, { status: "auto_accepted", acceptedAt: now, systemAutoApprovedAt: now });
    return null;
  },
});
