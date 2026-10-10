import { v } from "convex/values";

import { calculateObligationLedger } from "../lib/domain/obligations";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireHost, resolveFinancialGuest } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { listActiveGuestObligations } from "./lib/obligations";
import { assertAdhocChargeInput, assertCalendarDate } from "./lib/validation";
import { getAcceptedGuestTerms, getCurrentGuestTerms } from "./lib/stayTerms";

const ledgerItem = v.object({
  _id: v.id("obligations"),
  periodStart: v.string(),
  periodEnd: v.string(),
  dueDate: v.string(),
  baseAmountCents: v.number(),
  type: v.union(v.literal("cadence"), v.literal("adhoc"), v.literal("occupancy")),
  title: v.optional(v.string()),
  earlyDiscountCents: v.number(),
  lateFeeCents: v.number(),
  lateFeeOccurrences: v.number(),
  effectiveChargeCents: v.number(),
  creditedCents: v.number(),
  balanceCents: v.number(),
  status: v.union(v.literal("upcoming"), v.literal("due"), v.literal("late"), v.literal("paid")),
  lateFeeWaived: v.boolean(),
});

export const list = query({
  args: { stayId: v.id("stays"), asOfDate: v.string(), guestUserId: v.optional(v.id("users")) },
  returns: v.array(ledgerItem),
  handler: async (ctx, { stayId, asOfDate, guestUserId: requestedGuestUserId }) => {
    const access = await resolveFinancialGuest(ctx, stayId, requestedGuestUserId);
    assertCalendarDate(asOfDate, "Ledger date");
    if (!access.guestUserId) return [];
    const stay = await ctx.db.get(stayId);
    if (!stay || !stay.currentTermsId) return [];
    const terms = await getCurrentGuestTerms(ctx, stayId, access.guestUserId);
    if (!terms) return [];

    const [scopedObligations, scopedContributions] = await Promise.all([
      listActiveGuestObligations(ctx, stayId, access.guestUserId),
      ctx.db.query("contributions").withIndex("by_stay_guest_and_date", (query) => query.eq("stayId", stayId).eq("guestUserId", access.guestUserId)).order("asc").take(5_000),
    ]);
    const [legacyObligations, legacyContributions] = access.includeLegacyUnscoped
      ? await Promise.all([
        listActiveGuestObligations(ctx, stayId, undefined),
        ctx.db.query("contributions").withIndex("by_stay_guest_and_date", (query) => query.eq("stayId", stayId).eq("guestUserId", undefined)).order("asc").take(5_000),
      ])
      : [[], []];
    const obligations = [...scopedObligations, ...legacyObligations];
    const contributions = [...scopedContributions, ...legacyContributions];
    const credits = contributions
      .filter((entry) => entry.status === "confirmed" && entry.countsTowardBalance)
      .map((entry) => ({ amountCents: entry.amountCents, date: entry.date }));
    const termsById = new Map<string, Promise<Doc<"terms"> | null>>();
    const ledgerObligations = await Promise.all(obligations.map(async (item) => {
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
    }));
    const ledger = calculateObligationLedger({
      obligations: ledgerObligations,
      contributions: credits,
      asOfDate,
      terms,
    });

    return ledger.map((item) => ({
      _id: item._id as typeof obligations[number]["_id"],
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
  },
});

export const createAdhocCharge = mutation({
  args: {
    stayId: v.id("stays"),
    guestUserId: v.id("users"),
    title: v.string(),
    amountCents: v.number(),
    effectiveDate: v.string(),
    dueDate: v.string(),
  },
  returns: v.id("obligations"),
  handler: async (ctx, args) => {
    const { user } = await requireHost(ctx, args.stayId);
    await resolveFinancialGuest(ctx, args.stayId, args.guestUserId);
    assertAdhocChargeInput(args.title, args.amountCents, args.effectiveDate, args.dueDate);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot add charges");
    const terms = await getAcceptedGuestTerms(ctx, args.stayId, args.guestUserId);
    const obligationId = await ctx.db.insert("obligations", {
      stayId: args.stayId,
      termsId: terms?._id ?? stay.currentTermsId,
      guestUserId: args.guestUserId,
      type: "adhoc",
      title: args.title.trim(),
      periodStart: args.effectiveDate,
      periodEnd: args.effectiveDate,
      dueDate: args.dueDate,
      baseAmountCents: args.amountCents,
      createdAt: Date.now(),
    });
    await recordActivity(ctx, {
      stayId: args.stayId,
      actorUserId: user._id,
      guestUserId: args.guestUserId,
      kind: "obligation",
      action: "adhoc_charge_created",
      detail: `${args.title.trim()} charge added`,
      entityId: obligationId,
    });
    await ctx.scheduler.runAfter(0, internal.knock.triggerWorkflow, {
      userId: args.guestUserId,
      stayId: args.stayId,
      workflow: "adhoc-fee-posted",
      entityId: `obligation:${obligationId}`,
      data: {
        hostName: user.name,
        feeTitle: args.title.trim(),
        amount: args.amountCents,
        dueDate: args.dueDate,
      },
    });
    return obligationId;
  },
});

export const voidAdhocCharge = mutation({
  args: { obligationId: v.id("obligations") },
  returns: v.null(),
  handler: async (ctx, { obligationId }) => {
    const obligation = await ctx.db.get(obligationId);
    if (!obligation) throw new Error("Obligation not found");
    const { user } = await requireHost(ctx, obligation.stayId);
    if ((obligation.type ?? "cadence") !== "adhoc") throw new Error("Only ad-hoc charges can be voided");
    if (obligation.voidedAt) return null;
    await ctx.db.patch(obligationId, { voidedAt: Date.now(), voidedBy: user._id });
    await recordActivity(ctx, {
      stayId: obligation.stayId,
      actorUserId: user._id,
      guestUserId: obligation.guestUserId,
      kind: "obligation",
      action: "adhoc_charge_voided",
      detail: `${obligation.title ?? "Ad-hoc"} charge voided; history retained`,
      entityId: obligationId,
    });
    return null;
  },
});

export const waiveLateFee = mutation({
  args: { obligationId: v.id("obligations") },
  returns: v.null(),
  handler: async (ctx, { obligationId }) => {
    const obligation = await ctx.db.get(obligationId);
    if (!obligation) throw new Error("Obligation not found");
    if (obligation.voidedAt) throw new Error("Voided obligations cannot be changed");
    const { user } = await requireHost(ctx, obligation.stayId);
    if (obligation.lateFeeWaivedAt) return null;

    await ctx.db.patch(obligationId, {
      lateFeeWaivedAt: Date.now(),
      lateFeeWaivedBy: user._id,
    });
    await recordActivity(ctx, {
      stayId: obligation.stayId,
      actorUserId: user._id,
      guestUserId: obligation.guestUserId,
      kind: "obligation",
      action: "late_fee_waived",
      detail: `Late fee waived for obligation due ${obligation.dueDate}`,
      entityId: obligationId,
    });
    return null;
  },
});
