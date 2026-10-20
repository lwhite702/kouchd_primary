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
    .withIndex("by_stay_guest", (query) => query.eq("stayId", stayId).eq("guestUserId", guestUserId))
    .take(100);
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

export async function acceptGuestTermsAutomatically(
  ctx: MutationCtx,
  args: { stayId: Id<"stays">; guestUserId: Id<"users">; actorUserId: Id<"users">; membership: Doc<"memberships">; terms: Doc<"terms"> },
) {
  const { stayId, guestUserId, actorUserId, membership, terms } = args;
  const stay = await ctx.db.get(stayId);
  if (!stay || stay.status === "ended") throw new Error("No active terms to accept");
  if (membership.role !== "guest" || membership.status !== "active" || membership.userId !== guestUserId || membership.stayId !== stayId) {
    throw new Error("Choose an active guest in this household");
  }
  if (membership.acceptedTermsId === terms._id) return;
  const now = Date.now();
  const existing = await ctx.db.query("termsAcceptances")
    .withIndex("by_terms_user", (query) => query.eq("termsId", terms._id).eq("userId", guestUserId))
    .unique();
  if (!existing) {
    await ctx.db.insert("termsAcceptances", { stayId, termsId: terms._id, userId: guestUserId, acceptedAt: now, method: "system_auto", systemAutoApprovedAt: now });
  } else if (existing.method !== "system_auto" || existing.systemAutoApprovedAt === undefined) {
    await ctx.db.patch(existing._id, { method: "system_auto", systemAutoApprovedAt: now });
  }
  if (membership.acceptedTermsId && terms.effectiveFrom) {
    const effectiveBoundary = calendarDateInTimezone(new Date(now), stay.timezone);
    if (terms.effectiveFrom !== effectiveBoundary) await ctx.db.patch(terms._id, { effectiveFrom: effectiveBoundary });
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone) {
      const page = await ctx.db.query("obligations")
        .withIndex("by_stay_guest_and_voided", (query) => query.eq("stayId", stayId).eq("guestUserId", guestUserId).eq("voidedAt", undefined))
        .paginate({ cursor, numItems: 500 });
      for (const obligation of page.page) {
        if (obligation.termsId === terms._id || obligation.voidedAt || obligation.type === "adhoc" || obligation.type === "occupancy" || obligation.periodEnd < effectiveBoundary) continue;
        if (obligation.periodStart < effectiveBoundary) {
          const preservedPeriodEnd = addCalendarDays(effectiveBoundary, -1);
          const sourceTerms = obligation.termsId ? await ctx.db.get(obligation.termsId) : stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
          const preservedDays = stayDays(obligation.periodStart, preservedPeriodEnd);
          const fullPeriodDays = stayDays(obligation.periodStart, obligation.periodEnd);
          const preservedAmount = sourceTerms
            ? buildObligationPeriods({ ...sourceTerms, startDate: obligation.periodStart, endDate: preservedPeriodEnd })[0]?.baseAmountCents ?? 0
            : Math.round((obligation.baseAmountCents * preservedDays) / fullPeriodDays);
          if (preservedDays > 0 && preservedAmount > 0) {
            await ctx.db.insert("obligations", {
              stayId,
              termsId: obligation.termsId ?? sourceTerms?._id,
              guestUserId,
              type: "cadence",
              periodStart: obligation.periodStart,
              periodEnd: preservedPeriodEnd,
              dueDate: obligation.dueDate,
              baseAmountCents: preservedAmount,
              lateFeeWaivedAt: obligation.lateFeeWaivedAt,
              lateFeeWaivedBy: obligation.lateFeeWaivedBy,
              createdAt: now,
            });
          }
        }
        await ctx.db.patch(obligation._id, { voidedAt: now, voidedBy: actorUserId });
      }
      cursor = page.continueCursor;
      isDone = page.isDone;
    }
  }
  await ctx.db.patch(membership._id, { acceptedTermsId: terms._id });
  await ensureObligationsForTerms(ctx, stayId, terms._id, guestUserId, actorUserId);

  const memberships = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stayId)).take(50);
  let allAccepted = Boolean(stay && memberships.filter((item) => item.status === "active").length >= 2);
  for (const item of memberships) {
    if (item.status !== "active") continue;
    const itemTerms = item.role === "guest"
      ? await getCurrentGuestTerms(ctx, stayId, item.userId)
      : stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    const acceptedTermsId = item._id === membership._id ? terms._id : item.acceptedTermsId;
    if (!itemTerms || acceptedTermsId !== itemTerms._id) allAccepted = false;
  }
  if (stay && allAccepted && stay.status !== "active") await ctx.db.patch(stayId, { status: "active", updatedAt: now });
  await recordActivity(ctx, { stayId, actorUserId, guestUserId, kind: "terms", action: "auto_accepted", detail: "System auto-approved the guest agreement after the configured delay", entityId: terms._id });
}
