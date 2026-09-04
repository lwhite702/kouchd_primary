import { v } from "convex/values";

import { calculateObligationLedger } from "../lib/domain/obligations";
import { mutation, query } from "./_generated/server";
import { requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertCalendarDate } from "./lib/validation";

const ledgerItem = v.object({
  _id: v.id("obligations"),
  periodStart: v.string(),
  periodEnd: v.string(),
  dueDate: v.string(),
  baseAmountCents: v.number(),
  earlyDiscountCents: v.number(),
  lateFeeCents: v.number(),
  effectiveChargeCents: v.number(),
  creditedCents: v.number(),
  balanceCents: v.number(),
  status: v.union(v.literal("upcoming"), v.literal("due"), v.literal("late"), v.literal("paid")),
  lateFeeWaived: v.boolean(),
});

export const list = query({
  args: { stayId: v.id("stays"), asOfDate: v.string() },
  returns: v.array(ledgerItem),
  handler: async (ctx, { stayId, asOfDate }) => {
    await requireMembership(ctx, stayId);
    assertCalendarDate(asOfDate, "Ledger date");
    const stay = await ctx.db.get(stayId);
    if (!stay || !stay.currentTermsId) return [];
    const terms = await ctx.db.get(stay.currentTermsId);
    if (!terms) return [];

    const [obligations, contributions] = await Promise.all([
      ctx.db.query("obligations").withIndex("by_terms", (query) => query.eq("termsId", terms._id)).take(731),
      ctx.db.query("contributions").withIndex("by_stay_date", (query) => query.eq("stayId", stayId)).order("asc").take(5_000),
    ]);
    const credits = contributions
      .filter((entry) => entry.status === "confirmed" && entry.countsTowardBalance)
      .map((entry) => ({ amountCents: entry.amountCents, date: entry.date }));
    const ledger = calculateObligationLedger({
      obligations: obligations.map((item) => ({
        _id: item._id,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        dueDate: item.dueDate,
        baseAmountCents: item.baseAmountCents,
        lateFeeWaived: Boolean(item.lateFeeWaivedAt),
      })),
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
      earlyDiscountCents: item.earlyDiscountCents,
      lateFeeCents: item.lateFeeCents,
      effectiveChargeCents: item.effectiveChargeCents,
      creditedCents: item.creditedCents,
      balanceCents: item.balanceCents,
      status: item.status,
      lateFeeWaived: Boolean(item.lateFeeWaived),
    }));
  },
});

export const waiveLateFee = mutation({
  args: { obligationId: v.id("obligations") },
  returns: v.null(),
  handler: async (ctx, { obligationId }) => {
    const obligation = await ctx.db.get(obligationId);
    if (!obligation) throw new Error("Obligation not found");
    const { user } = await requireHost(ctx, obligation.stayId);
    if (obligation.lateFeeWaivedAt) return null;

    await ctx.db.patch(obligationId, {
      lateFeeWaivedAt: Date.now(),
      lateFeeWaivedBy: user._id,
    });
    await recordActivity(ctx, {
      stayId: obligation.stayId,
      actorUserId: user._id,
      kind: "obligation",
      action: "late_fee_waived",
      detail: `Late fee waived for obligation due ${obligation.dueDate}`,
      entityId: obligationId,
    });
    return null;
  },
});
