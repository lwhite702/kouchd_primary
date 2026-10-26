import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { ensureObligationsForTerms } from "./obligations";
import { recordActivity } from "./activity";
import { addCalendarDays, calendarDateInTimezone, stayDays } from "../../lib/domain/dates";
import { buildObligationPeriods } from "../../lib/domain/obligations";

type DbCtx = QueryCtx | MutationCtx;

export async function getCurrentGuestTerms(ctx: DbCtx, stayId: Id<"stays">, guestUserId: Id<"users">) {
  const guestTerms = await ctx.db
    .query("terms")
    .withIndex("by_stay_and_guest", (query) => query.eq("stayId", stayId).eq("guestUserId", guestUserId))
    .order("desc")
    .first();
  if (guestTerms) return guestTerms;

  const stay = await ctx.db.get(stayId);
  return stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
}

export async function getAcceptedGuestTerms(ctx: DbCtx, stayId: Id<"stays">, guestUserId: Id<"users">) {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", guestUserId))
    .unique();
  if (membership?.acceptedTermsId) {
    const acceptedTerms = await ctx.db.get(membership.acceptedTermsId);
    if (acceptedTerms) return acceptedTerms;
  }

  const stay = await ctx.db.get(stayId);
  return stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
}

export async function getAcceptedGuestTermsForDate(
  ctx: DbCtx,
  stayId: Id<"stays">,
  guestUserId: Id<"users">,
  date: string,
) {
  const termsRows: Doc<"terms">[] = await ctx.db.query("terms")
    .withIndex("by_stay_and_guest", (query) => query.eq("stayId", stayId).eq("guestUserId", guestUserId))
    .order("desc")
    .take(500);
  const possible = termsRows.filter((terms) => {
    const effectiveFrom = terms.effectiveFrom ?? terms.startDate;
    return effectiveFrom <= date && terms.startDate <= date && terms.endDate >= date;
  });
  const accepted = await Promise.all(possible.map(async (terms) => {
    const acceptance = await ctx.db.query("termsAcceptances")
      .withIndex("by_terms_user", (query) => query.eq("termsId", terms._id).eq("userId", guestUserId))
      .unique();
    return acceptance ? { terms, acceptedAt: acceptance.acceptedAt } : null;
  }));
  return accepted
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => (right.terms.effectiveFrom ?? right.terms.startDate).localeCompare(left.terms.effectiveFrom ?? left.terms.startDate)
      || right.terms.version - left.terms.version
      || right.acceptedAt - left.acceptedAt)[0]?.terms ?? null;
}

export async function ensureGuestTerms(
  ctx: MutationCtx,
  stayId: Id<"stays">,
  guestUserId: Id<"users">,
  createdBy: Id<"users">,
) {
  const existing = await ctx.db
    .query("terms")
    .withIndex("by_stay_and_guest", (query) => query.eq("stayId", stayId).eq("guestUserId", guestUserId))
    .order("desc")
    .first();
  if (existing) return existing;

  const stay = await ctx.db.get(stayId);
  const defaults = stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
  if (!stay || !defaults) throw new Error("Household terms are not available");

  const defaultsFields = {
    stayId: defaults.stayId,
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    cadence: defaults.cadence,
    ...(defaults.paymentDayOfWeek !== undefined ? { paymentDayOfWeek: defaults.paymentDayOfWeek } : {}),
    billingBasis: defaults.billingBasis ?? "continuous",
    rateCents: defaults.rateCents,
    earlyDiscountPercentage: defaults.earlyDiscountPercentage,
    earlyDiscountDays: defaults.earlyDiscountDays,
    lateFeeCents: defaults.lateFeeCents,
    graceDays: defaults.graceDays,
    houseNotes: defaults.houseNotes,
    ...(defaults.earlyDiscountEnabled !== undefined ? { earlyDiscountEnabled: defaults.earlyDiscountEnabled } : {}),
    ...(defaults.lateFeeEnabled !== undefined ? { lateFeeEnabled: defaults.lateFeeEnabled } : {}),
    ...(defaults.houseRules !== undefined ? { houseRules: defaults.houseRules } : {}),
    ...(defaults.rewards !== undefined ? { rewards: defaults.rewards } : {}),
  };
  const termsId = await ctx.db.insert("terms", {
    ...defaultsFields,
    guestUserId,
    version: defaults.version,
    createdBy,
    createdAt: Date.now(),
  });
  const terms = await ctx.db.get(termsId);
  if (!terms) throw new Error("Could not create guest agreement");
  return terms;
}

export async function offerGuestAgreement(
  ctx: MutationCtx,
  args: { stayId: Id<"stays">; termsId: Id<"terms">; guestUserId: Id<"users">; offeredBy: Id<"users"> },
) {
  const { stayId, termsId, guestUserId, offeredBy } = args;
  const stay = await ctx.db.get(stayId);
  const membership = await ctx.db.query("memberships")
    .withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", guestUserId))
    .unique();
  if (!stay || !membership || membership.role !== "guest" || membership.status !== "active") return null;
  if (membership.acceptedTermsId === termsId) return null;

  const existingOffers = await ctx.db.query("agreementOffers")
    .withIndex("by_stay_guest_status", q => q.eq("stayId", stayId).eq("guestUserId", guestUserId).eq("status", "pending"))
    .take(500);
  for (const offer of existingOffers) {
    if (offer.status === "pending") {
      await ctx.db.patch(offer._id, { status: "replaced" });
      await recordActivity(ctx, { stayId, actorUserId: offeredBy, guestUserId, kind: "terms", action: "agreement_replaced", detail: "Pending guest agreement replaced by a newer version", entityId: offer.termsId });
    }
  }

  const offeredAt = Date.now();
  const enabled = stay.agreementAutoAcceptEnabled ?? true;
  const hours = stay.agreementAutoAcceptHours ?? 24;
  const autoAcceptAt = enabled ? offeredAt + hours * 60 * 60 * 1000 : undefined;
  const offerId = await ctx.db.insert("agreementOffers", {
    stayId, termsId, guestUserId, offeredBy, offeredAt, autoAcceptAt, status: "pending",
  });
  await recordActivity(ctx, {
    stayId,
    actorUserId: offeredBy,
    guestUserId,
    kind: "terms",
    action: "agreement_offered",
    detail: autoAcceptAt
      ? `Agreement version offered; system auto-accept scheduled after ${hours} hours`
      : "Agreement version offered; automatic acceptance is disabled",
    entityId: termsId,
  });
  if (autoAcceptAt) {
    await ctx.scheduler.runAfter(Math.max(0, autoAcceptAt - Date.now()), internal.terms.autoAcceptOffer, { offerId });
  }
  return offerId;
}

/** Shared transaction for manual and scheduled guest acceptance. */
export async function acceptGuestAgreement(
  ctx: MutationCtx,
  args: { membership: Doc<"memberships">; terms: Doc<"terms">; method: "guest" | "system_auto" },
) {
  const { membership, terms, method } = args;
  const stayId = membership.stayId;
  const guestUserId = membership.userId;
  const actorUserId = method === "guest" ? guestUserId : undefined;
  const actorType = method === "system_auto" ? "system" as const : "user" as const;
  const stay = await ctx.db.get(stayId);
  if (!stay || stay.status === "ended" || membership.role !== "guest" || membership.status !== "active" || terms.stayId !== stayId) {
    throw new Error("No active guest agreement to accept");
  }
  const now = Date.now();
  const alreadyAccepted = membership.acceptedTermsId === terms._id;
  if (!alreadyAccepted) {
    const existing = await ctx.db.query("termsAcceptances")
      .withIndex("by_terms_user", q => q.eq("termsId", terms._id).eq("userId", guestUserId)).unique();
    // A retry must never rewrite the original acceptance method or timestamp.
    if (!existing) await ctx.db.insert("termsAcceptances", {
      stayId, termsId: terms._id, userId: guestUserId, acceptedAt: now, method,
      ...(method === "system_auto" ? { systemAutoApprovedAt: now } : {}),
    });
    if (membership.acceptedTermsId && terms.effectiveFrom) {
      const effectiveBoundary = calendarDateInTimezone(new Date(now), stay.timezone);
      await ctx.db.patch(terms._id, { effectiveFrom: effectiveBoundary });
      // Snapshot the index before changing indexed fields; replacements cannot
      // enter this scan or shift a subsequent page.
      const guests = await ctx.db.query("memberships")
        .withIndex("by_stay_role_status", q => q.eq("stayId", stayId).eq("role", "guest").eq("status", "active")).take(2);
      const scoped = await ctx.db.query("obligations")
        .withIndex("by_stay_guest_and_voided", q => q.eq("stayId", stayId).eq("guestUserId", guestUserId).eq("voidedAt", undefined))
        .take(4097);
      const legacy = guests.length === 1 ? await ctx.db.query("obligations")
        .withIndex("by_stay_guest_and_voided", q => q.eq("stayId", stayId).eq("guestUserId", undefined).eq("voidedAt", undefined)).take(4097) : [];
      const previous = [...scoped, ...legacy];
      if (previous.length > 4096) throw new Error("This schedule history needs review before replacing the agreement. Existing records have been retained.");
      for (const obligation of previous) {
        if (obligation.termsId === terms._id || obligation.type === "adhoc" || obligation.type === "occupancy" || obligation.periodEnd < effectiveBoundary) continue;
        if (obligation.periodStart < effectiveBoundary) {
          const periodEnd = addCalendarDays(effectiveBoundary, -1);
          const source = obligation.termsId ? await ctx.db.get(obligation.termsId) : null;
          const amount = source
            ? buildObligationPeriods({ ...source, startDate: obligation.periodStart, endDate: periodEnd })[0]?.baseAmountCents ?? 0
            : Math.round(obligation.baseAmountCents * stayDays(obligation.periodStart, periodEnd) / stayDays(obligation.periodStart, obligation.periodEnd));
          if (amount > 0) await ctx.db.insert("obligations", {
            stayId, termsId: obligation.termsId, guestUserId, type: "cadence",
            periodStart: obligation.periodStart, periodEnd, dueDate: obligation.dueDate,
            baseAmountCents: amount, lateFeeWaivedAt: obligation.lateFeeWaivedAt,
            lateFeeWaivedBy: obligation.lateFeeWaivedBy, createdAt: now,
          });
        }
        await ctx.db.patch(obligation._id, { voidedAt: now, voidedBy: actorUserId, voidedSource: actorType });
      }
    }
    await ctx.db.patch(membership._id, { acceptedTermsId: terms._id });
    await ensureObligationsForTerms(ctx, stayId, terms._id, guestUserId, actorUserId);
    await recordActivity(ctx, { stayId, actorUserId, actorType, guestUserId, kind: "terms",
      action: method === "system_auto" ? "auto_accepted" : "accepted",
      detail: method === "system_auto" ? "System auto-approved the guest agreement after the configured delay" : "Guest accepted agreement",
      entityId: terms._id,
    });
  }
  const offers = await ctx.db.query("agreementOffers")
    .withIndex("by_terms_guest", q => q.eq("termsId", terms._id).eq("guestUserId", guestUserId)).take(100);
  for (const offer of offers) if (offer.status === "pending") await ctx.db.patch(offer._id, {
    status: method === "system_auto" && !alreadyAccepted ? "auto_accepted" : "accepted",
    acceptedAt: now,
    ...(method === "system_auto" && !alreadyAccepted ? { systemAutoApprovedAt: now } : { acceptedBy: guestUserId }),
  });
  await ctx.scheduler.runAfter(0, internal.knock.cancelAgreementPending, { stayId, userId: guestUserId, role: "guest" });
  return activateAcceptedStay(ctx, stayId);
}

export async function activateAcceptedStay(ctx: MutationCtx, stayId: Id<"stays">) {
  const stay = await ctx.db.get(stayId);
  if (!stay || stay.status === "ended") return false;
  const members = (await ctx.db.query("memberships").withIndex("by_stay", q => q.eq("stayId", stayId)).take(50))
    .filter(m => m.status === "active");
  const accepted = await Promise.all(members.map(async member => {
    const terms = member.role === "guest" ? await getCurrentGuestTerms(ctx, stayId, member.userId)
      : stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    return Boolean(terms && member.acceptedTermsId === terms._id);
  }));
  const allAccepted = members.length >= 2 && accepted.every(Boolean);
  if (allAccepted && stay.status !== "active") await ctx.db.patch(stayId, { status: "active", updatedAt: Date.now() });
  return allAccepted;
}
