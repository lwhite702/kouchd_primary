import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertStayTerms } from "./lib/validation";
import {
  acceptGuestAgreement,
  activateAcceptedStay,
  ensureGuestTerms,
  getCurrentGuestTerms,
  offerGuestAgreement,
} from "./lib/stayTerms";
import { calendarDateInTimezone } from "../lib/domain/dates";

const termsInput = {
  startDate: v.string(),
  endDate: v.string(),
  cadence: v.union(v.literal("daily"), v.literal("weekly")),
  paymentDayOfWeek: v.optional(v.number()),
  billingBasis: v.optional(
    v.union(v.literal("continuous"), v.literal("occupied_nights")),
  ),
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
      }),
    ),
  ),
  rewards: v.optional(
    v.object({
      enabled: v.boolean(),
      coinName: v.string(),
      centsPerPoint: v.number(),
      maxCreditPerPeriodCents: v.number(),
    }),
  ),
};

export const acceptCurrent = mutation({
  args: {
    stayId: v.id("stays"),
    initialCadence: v.optional(
      v.union(v.literal("daily"), v.literal("weekly")),
    ),
    initialPaymentDayOfWeek: v.optional(v.number()),
  },
  returns: v.union(v.literal("pending"), v.literal("active")),
  handler: async (ctx, { stayId, initialCadence, initialPaymentDayOfWeek }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || !stay.currentTermsId || stay.status === "ended")
      throw new Error("No active terms to accept");
    let terms =
      membership.role === "guest"
        ? await ensureGuestTerms(ctx, stayId, user._id, stay.hostUserId)
        : await ctx.db.get(stay.currentTermsId);
    if (!terms) throw new Error("No active terms to accept");
    if (
      membership.role === "guest" &&
      !membership.acceptedTermsId &&
      initialCadence
    ) {
      if (
        initialCadence === "weekly" &&
        (initialPaymentDayOfWeek === undefined ||
          !Number.isInteger(initialPaymentDayOfWeek) ||
          initialPaymentDayOfWeek < 0 ||
          initialPaymentDayOfWeek > 6)
      ) {
        throw new Error("Choose the weekday your weekly contribution is due");
      }
      const selectedRate =
        terms.cadence === initialCadence
          ? terms.rateCents
          : initialCadence === "daily"
            ? Math.round(terms.rateCents / 7)
            : terms.rateCents * 7;
      if (
        !Number.isSafeInteger(selectedRate) ||
        selectedRate < 0 ||
        selectedRate > 100_000_000 ||
        (terms.rateCents > 0 && selectedRate === 0)
      ) {
        throw new Error(
          "That payment schedule cannot be represented at this rate. Ask your host to adjust the agreement.",
        );
      }
      const selectedFee = initialCadence === "daily" ? 500 : 2_500;
      const lateFeeEnabled = terms.lateFeeEnabled ?? terms.lateFeeCents > 0;
      await ctx.db.patch(terms._id, {
        cadence: initialCadence,
        rateCents: selectedRate,
        ...(initialCadence === "weekly"
          ? { paymentDayOfWeek: initialPaymentDayOfWeek }
          : { paymentDayOfWeek: undefined }),
        ...(lateFeeEnabled
          ? { lateFeeEnabled: true, lateFeeCents: selectedFee }
          : {}),
      });
      terms = {
        ...terms,
        cadence: initialCadence,
        rateCents: selectedRate,
        paymentDayOfWeek:
          initialCadence === "weekly" ? initialPaymentDayOfWeek : undefined,
        ...(lateFeeEnabled
          ? { lateFeeEnabled: true, lateFeeCents: selectedFee }
          : {}),
      };
    }
    if (membership.role === "guest") {
      const active = await acceptGuestAgreement(ctx, {
        membership,
        terms,
        method: "guest",
      });
      return active ? "active" : "pending";
    }
    const termsId = terms._id;
    const existing = await ctx.db
      .query("termsAcceptances")
      .withIndex("by_terms_user", (q) =>
        q.eq("termsId", termsId).eq("userId", user._id),
      )
      .unique();
    if (!existing)
      await ctx.db.insert("termsAcceptances", {
        stayId,
        termsId,
        userId: user._id,
        acceptedAt: Date.now(),
        method: "host",
      });
    await ctx.db.patch(membership._id, { acceptedTermsId: termsId });
    await ctx.scheduler.runAfter(0, internal.knock.cancelAgreementPending, {
      stayId,
      userId: user._id,
      role: "host",
    });
    return (await activateAcceptedStay(ctx, stayId)) ? "active" : "pending";
  },
});

export const updateCurrent = mutation({
  args: { stayId: v.id("stays"), terms: v.object(termsInput) },
  returns: v.id("terms"),
  handler: async (ctx, { stayId, terms }) => {
    const { user, membership } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended")
      throw new Error("Ended stays cannot be edited");
    assertStayTerms(terms);
    const previous = stay.currentTermsId
      ? await ctx.db.get(stay.currentTermsId)
      : null;
    const now = Date.now();
    const termsId = await ctx.db.insert("terms", {
      stayId,
      version: (previous?.version ?? 0) + 1,
      ...terms,
      createdBy: user._id,
      createdAt: now,
    });
    await ctx.db.patch(stayId, {
      currentTermsId: termsId,
      status: "pending",
      updatedAt: now,
    });
    await ctx.db.insert("termsAcceptances", {
      stayId,
      termsId,
      userId: user._id,
      acceptedAt: now,
      method: "host",
    });
    await ctx.db.patch(membership._id, { acceptedTermsId: termsId });
    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "terms",
      action: "updated",
      detail: `Terms version ${(previous?.version ?? 0) + 1} created`,
      entityId: termsId,
    });
    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "terms",
      action: "accepted",
      detail: "Host accepted the updated agreement",
      entityId: termsId,
    });
    const guests = await ctx.db
      .query("memberships")
      .withIndex("by_stay", (query) => query.eq("stayId", stayId))
      .take(50);
    for (const guest of guests) {
      if (guest.role !== "guest" || guest.status !== "active") continue;
      const oldGuestTerms = await getCurrentGuestTerms(
        ctx,
        stayId,
        guest.userId,
      );
      // Carry intentional per-guest overrides forward; inherit fields that
      // still matched the preceding household defaults.
      const inherited = { ...terms };
      if (oldGuestTerms && previous) {
        for (const key of Object.keys(termsInput) as Array<
          keyof typeof terms
        >) {
          if (
            JSON.stringify(oldGuestTerms[key]) !== JSON.stringify(previous[key])
          ) {
            Object.assign(inherited, { [key]: oldGuestTerms[key] });
          }
        }
      }
      assertStayTerms(inherited);
      // Legacy weekly schedules ended six days after their start. Preserve that
      // due weekday when older clients and automatically accepted terms omit it.
      if (
        inherited.cadence === "weekly" &&
        inherited.paymentDayOfWeek === undefined
      ) {
        const previousStart =
          oldGuestTerms?.cadence === "weekly"
            ? oldGuestTerms.startDate
            : inherited.startDate;
        inherited.paymentDayOfWeek =
          (new Date(`${previousStart}T00:00:00.000Z`).getUTCDay() + 6) % 7;
      }
      if (
        inherited.cadence === "weekly" &&
        (inherited.paymentDayOfWeek === undefined ||
          !Number.isInteger(inherited.paymentDayOfWeek) ||
          inherited.paymentDayOfWeek < 0 ||
          inherited.paymentDayOfWeek > 6)
      ) {
        throw new Error("Choose a weekday for weekly guest contributions");
      }
      const guestTermsId = await ctx.db.insert("terms", {
        ...inherited,
        stayId,
        guestUserId: guest.userId,
        version: (oldGuestTerms?.version ?? 0) + 1,
        ...(guest.acceptedTermsId
          ? {
              effectiveFrom: calendarDateInTimezone(
                new Date(now),
                stay.timezone,
              ),
            }
          : {}),
        createdBy: user._id,
        createdAt: now,
      });
      await offerGuestAgreement(ctx, {
        stayId,
        termsId: guestTermsId,
        guestUserId: guest.userId,
        offeredBy: user._id,
      });
    }
    return termsId;
  },
});

export const updateGuest = mutation({
  args: {
    stayId: v.id("stays"),
    guestUserId: v.id("users"),
    terms: v.object(termsInput),
  },
  returns: v.id("terms"),
  handler: async (ctx, { stayId, guestUserId, terms }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended")
      throw new Error("Ended stays cannot be edited");
    const guestMembership = await ctx.db
      .query("memberships")
      .withIndex("by_stay_user", (query) =>
        query.eq("stayId", stayId).eq("userId", guestUserId),
      )
      .unique();
    if (
      !guestMembership ||
      guestMembership.role !== "guest" ||
      guestMembership.status !== "active"
    ) {
      throw new Error("Choose an active guest in this household");
    }
    if (
      terms.cadence === "weekly" &&
      (terms.paymentDayOfWeek === undefined ||
        !Number.isInteger(terms.paymentDayOfWeek) ||
        terms.paymentDayOfWeek < 0 ||
        terms.paymentDayOfWeek > 6)
    ) {
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
    await offerGuestAgreement(ctx, {
      stayId,
      termsId,
      guestUserId,
      offeredBy: user._id,
    });
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
    if (
      !offer ||
      offer.status !== "pending" ||
      offer.autoAcceptAt === undefined
    )
      return null;
    const stay = await ctx.db.get(offer.stayId);
    if (
      !stay ||
      stay.status === "ended" ||
      !(stay.agreementAutoAcceptEnabled ?? true)
    )
      return null;
    const now = Date.now();
    if (offer.autoAcceptAt > now) {
      await ctx.scheduler.runAfter(
        offer.autoAcceptAt - now,
        internal.terms.autoAcceptOffer,
        { offerId },
      );
      return null;
    }
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_stay_user", (query) =>
        query.eq("stayId", offer.stayId).eq("userId", offer.guestUserId),
      )
      .unique();
    if (
      !membership ||
      membership.role !== "guest" ||
      membership.status !== "active"
    )
      return null;
    const currentTerms = await getCurrentGuestTerms(
      ctx,
      offer.stayId,
      offer.guestUserId,
    );
    if (currentTerms?._id !== offer.termsId) {
      await ctx.db.patch(offerId, { status: "replaced" });
      return null;
    }
    await acceptGuestAgreement(ctx, {
      membership,
      terms: currentTerms,
      method: "system_auto",
    });
    return null;
  },
});
