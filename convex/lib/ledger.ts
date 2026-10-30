import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { resolveFinancialGuest } from "./auth";
import { assertCalendarDate } from "./validation";
import { getCurrentGuestTerms } from "./stayTerms";
import { listActiveGuestObligations } from "./obligations";
import { calculateObligationLedger } from "../../lib/domain/obligations";

export async function buildFinancialRecord(
  ctx: QueryCtx,
  {
    stayId,
    asOfDate,
    guestUserId: requestedGuestUserId,
  }: {
    stayId: Id<"stays">;
    asOfDate: string;
    guestUserId?: Id<"users">;
  },
) {
  const access = await resolveFinancialGuest(ctx, stayId, requestedGuestUserId, { allowFormerGuest: true });
  assertCalendarDate(asOfDate, "Ledger date");
  if (!access.guestUserId) return { ledger: [], contributions: [] };
  const stay = await ctx.db.get(stayId);
  if (!stay || !stay.currentTermsId) return { ledger: [], contributions: [] };
  const terms = await getCurrentGuestTerms(ctx, stayId, access.guestUserId);
  if (!terms) return { ledger: [], contributions: [] };

  const [scopedObligations, scopedContributions] = await Promise.all([
    listActiveGuestObligations(ctx, stayId, access.guestUserId),
    ctx.db
      .query("contributions")
      .withIndex("by_stay_guest_and_date", (query) =>
        query.eq("stayId", stayId).eq("guestUserId", access.guestUserId),
      )
      .order("asc")
      .take(5_001),
  ]);
  const [legacyObligations, legacyContributions] = access.includeLegacyUnscoped
    ? await Promise.all([
        listActiveGuestObligations(ctx, stayId, undefined),
        ctx.db
          .query("contributions")
          .withIndex("by_stay_guest_and_date", (query) =>
            query.eq("stayId", stayId).eq("guestUserId", undefined),
          )
          .order("asc")
          .take(5_001),
      ])
    : [[], []];
  if (
    scopedContributions.length > 5_000 ||
    legacyContributions.length > 5_000
  ) {
    throw new Error(
      "This ledger needs a history review before its balance can be shown. Your records are retained.",
    );
  }
  const obligations = [...scopedObligations, ...legacyObligations];
  const contributions = [...scopedContributions, ...legacyContributions];
  const credits = contributions
    .filter(
      (entry) => entry.status === "confirmed" && entry.countsTowardBalance,
    )
    .map((entry) => ({ amountCents: entry.amountCents, date: entry.date }));
  const termsById = new Map<string, Promise<Doc<"terms"> | null>>();
  const ledgerObligations = await Promise.all(
    obligations.map(async (item) => {
      let obligationTerms = terms;
      if (item.termsId) {
        const termsKey = item.termsId.toString();
        let termsPromise = termsById.get(termsKey);
        if (!termsPromise) {
          termsPromise = ctx.db.get(item.termsId);
          termsById.set(termsKey, termsPromise);
        }
        obligationTerms = (await termsPromise) ?? terms;
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
    }),
  );
  const ledger = calculateObligationLedger({
    obligations: ledgerObligations,
    contributions: credits,
    asOfDate,
    terms,
  });

  const items = ledger.map((item) => ({
    _id: item._id as (typeof obligations)[number]["_id"],
    periodStart: item.periodStart,
    periodEnd: item.periodEnd,
    dueDate: item.dueDate,
    baseAmountCents: item.baseAmountCents,
    type: item.type ?? "cadence",
    title: item.title,
    earlyDiscountCents: item.earlyDiscountCents,
    lateFeeCents: item.lateFeeCents,
    lateFeeOccurrences: item.lateFeeOccurrences,
    effectiveChargeCents: item.effectiveChargeCents,
    creditedCents: item.creditedCents,
    balanceCents: item.balanceCents,
    status: item.status,
    lateFeeWaived: Boolean(item.lateFeeWaived),
  }));
  return {
    ledger: items,
    contributions: contributions.filter((entry) => entry.date <= asOfDate),
  };
}
