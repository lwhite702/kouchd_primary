import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { recordActivity } from "./lib/activity";
import { requireMembership } from "./lib/auth";
import { assertSubleaseUnlocked } from "./lib/subleaseLock";
import { assertCalendarDate } from "./lib/validation";

const deductionItemValidator = v.object({
  id: v.string(),
  description: v.string(),
  amountCents: v.number(),
  disputed: v.optional(v.boolean()),
  disputeReason: v.optional(v.string()),
});

export const depositRecordValidator = v.object({
  _id: v.id("depositRecords"),
  _creationTime: v.number(),
  stayId: v.id("stays"),
  guestUserId: v.id("users"),
  amountCents: v.number(),
  holder: v.union(v.literal("host"), v.literal("landlord"), v.literal("third_party")),
  holderName: v.optional(v.string()),
  agreedReturnDate: v.string(),
  status: v.union(
    v.literal("recorded"),
    v.literal("refund_pending"),
    v.literal("returned"),
    v.literal("disputed"),
  ),
  deductions: v.optional(v.array(deductionItemValidator)),
  guestConfirmedAt: v.optional(v.string()),
  disputeNote: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const getByStay = query({
  args: {
    stayId: v.id("stays"),
    guestUserId: v.optional(v.id("users")),
  },
  returns: v.union(depositRecordValidator, v.null()),
  handler: async (ctx, { stayId, guestUserId }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const targetGuestId =
      membership.role === "guest"
        ? user._id
        : guestUserId ??
          (
            await ctx.db
              .query("memberships")
              .withIndex("by_stay", (q) => q.eq("stayId", stayId))
              .filter((q) => q.eq(q.field("role"), "guest"))
              .first()
          )?.userId;

    if (!targetGuestId) {
      return null;
    }

    const deposit = await ctx.db
      .query("depositRecords")
      .withIndex("by_stay_guest", (q) =>
        q.eq("stayId", stayId).eq("guestUserId", targetGuestId),
      )
      .first();

    return deposit ?? null;
  },
});

export const record = mutation({
  args: {
    stayId: v.id("stays"),
    guestUserId: v.id("users"),
    amountCents: v.number(),
    holder: v.union(v.literal("host"), v.literal("landlord"), v.literal("third_party")),
    holderName: v.optional(v.string()),
    agreedReturnDate: v.string(),
  },
  returns: v.id("depositRecords"),
  handler: async (
    ctx,
    { stayId, guestUserId, amountCents, holder, holderName, agreedReturnDate },
  ) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    if (membership.role !== "host") {
      throw new Error("Only hosts can record security deposit details");
    }

    const stay = await ctx.db.get(stayId);
    if (!stay) throw new Error("Stay not found");
    if (stay.status === "ended") {
      throw new Error("Ended stays cannot record deposit details");
    }
    await assertSubleaseUnlocked(ctx, stay, membership.role);

    if (amountCents < 0 || !Number.isInteger(amountCents)) {
      throw new Error("Deposit amount must be a positive integer or zero");
    }
    assertCalendarDate(agreedReturnDate);

    const now = Date.now();
    const existing = await ctx.db
      .query("depositRecords")
      .withIndex("by_stay_guest", (q) =>
        q.eq("stayId", stayId).eq("guestUserId", guestUserId),
      )
      .first();

    let depositId: Id<"depositRecords">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        amountCents,
        holder,
        holderName: holderName?.trim() ? holderName.trim() : undefined,
        agreedReturnDate,
        status: "recorded",
        updatedAt: now,
      });
      depositId = existing._id;
    } else {
      depositId = await ctx.db.insert("depositRecords", {
        stayId,
        guestUserId,
        amountCents,
        holder,
        holderName: holderName?.trim() ? holderName.trim() : undefined,
        agreedReturnDate,
        status: "recorded",
        createdAt: now,
        updatedAt: now,
      });
    }

    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "stay",
      action: "deposit_recorded",
      detail: `$${(amountCents / 100).toFixed(
        2,
      )} held by ${holder}. Agreed return by ${agreedReturnDate}.`,
    });

    return depositId;
  },
});

export const proposeDeductions = mutation({
  args: {
    depositId: v.id("depositRecords"),
    deductions: v.array(
      v.object({
        id: v.string(),
        description: v.string(),
        amountCents: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { depositId, deductions }) => {
    const deposit = await ctx.db.get(depositId);
    if (!deposit) throw new Error("Deposit record not found");

    const { user, membership } = await requireMembership(ctx, deposit.stayId);
    if (membership.role !== "host") {
      throw new Error("Only hosts can propose deposit deductions");
    }

    const stay = await ctx.db.get(deposit.stayId);
    if (!stay) throw new Error("Stay not found");
    await assertSubleaseUnlocked(ctx, stay, membership.role);

    let totalDeductionsCents = 0;
    const validatedDeductions = deductions.map((d) => {
      if (d.amountCents < 0 || !Number.isInteger(d.amountCents)) {
        throw new Error("Deduction amount must be a positive integer or zero");
      }
      totalDeductionsCents += d.amountCents;
      return {
        id: d.id,
        description: d.description.trim(),
        amountCents: d.amountCents,
      };
    });

    if (totalDeductionsCents > deposit.amountCents) {
      throw new Error("Total deductions cannot exceed total deposit amount");
    }

    const now = Date.now();
    await ctx.db.patch(deposit._id, {
      deductions: validatedDeductions,
      status: "refund_pending",
      updatedAt: now,
    });

    await recordActivity(ctx, {
      stayId: deposit.stayId,
      actorUserId: user._id,
      kind: "stay",
      action: "deposit_deductions_proposed",
      detail: `${validatedDeductions.length} deductions totaling $${(
        totalDeductionsCents / 100
      ).toFixed(2)}.`,
    });

    return null;
  },
});

export const respond = mutation({
  args: {
    depositId: v.id("depositRecords"),
    action: v.union(v.literal("confirm"), v.literal("dispute")),
    disputeNote: v.optional(v.string()),
    deductionDisputes: v.optional(
      v.array(
        v.object({
          deductionId: v.string(),
          disputeReason: v.string(),
        }),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { depositId, action, disputeNote, deductionDisputes }) => {
    const deposit = await ctx.db.get(depositId);
    if (!deposit) throw new Error("Deposit record not found");

    const { user, membership } = await requireMembership(ctx, deposit.stayId);
    if (membership.role !== "guest" || user._id !== deposit.guestUserId) {
      throw new Error("Only the sublease guest can respond to deposit deductions");
    }

    const stay = await ctx.db.get(deposit.stayId);
    if (!stay) throw new Error("Stay not found");
    await assertSubleaseUnlocked(ctx, stay, membership.role);

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    if (action === "confirm") {
      await ctx.db.patch(deposit._id, {
        status: "returned",
        guestConfirmedAt: nowIso,
        updatedAt: now,
      });
    } else {
      const disputeMap = new Map(
        (deductionDisputes ?? []).map((d) => [d.deductionId, d.disputeReason.trim()]),
      );

      const updatedDeductions = (deposit.deductions ?? []).map((d) => {
        const reason = disputeMap.get(d.id);
        if (reason) {
          return { ...d, disputed: true, disputeReason: reason };
        }
        return d;
      });

      await ctx.db.patch(deposit._id, {
        status: "disputed",
        disputeNote: disputeNote?.trim() ? disputeNote.trim() : undefined,
        deductions: updatedDeductions,
        updatedAt: now,
      });
    }

    await recordActivity(ctx, {
      stayId: deposit.stayId,
      actorUserId: user._id,
      kind: "stay",
      action: action === "confirm" ? "deposit_confirmed" : "deposit_disputed",
      detail:
        action === "confirm"
          ? "Deposit return confirmed by guest."
          : `Deposit deductions disputed by guest.${disputeNote?.trim() ? ` Note: ${disputeNote.trim()}` : ""}`,
    });

    return null;
  },
});
