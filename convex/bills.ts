import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { isFeatureEnabled, requireFeature } from "./flags";
import { recordActivity } from "./lib/activity";
import { requireHost, requireMembership } from "./lib/auth";
import { resolveMemberName } from "./lib/names";
import { assertPlanCapability } from "./lib/planCapacity";
import { getAcceptedGuestTerms, getCurrentGuestTerms } from "./lib/stayTerms";
import { assertCalendarDate } from "./lib/validation";
import { calculateBillShares } from "../lib/domain/billSplitting";
import { FEATURE_FLAGS } from "../lib/flags/config";

const billCategoryValidator = v.union(
  v.literal("electricity"),
  v.literal("water"),
  v.literal("gas"),
  v.literal("internet"),
  v.literal("trash"),
  v.literal("other"),
);

const billSplitMethodValidator = v.union(
  v.literal("equal"),
  v.literal("percentage"),
  v.literal("fixed"),
);

const billShareOutputValidator = v.object({
  _id: v.id("billShares"),
  billId: v.id("bills"),
  stayId: v.id("stays"),
  guestUserId: v.id("users"),
  guestName: v.string(),
  input: v.optional(v.number()),
  prorationDays: v.optional(v.number()),
  amountCents: v.number(),
  obligationId: v.id("obligations"),
});

const billOutputValidator = v.object({
  _id: v.id("bills"),
  _creationTime: v.number(),
  stayId: v.id("stays"),
  createdBy: v.id("users"),
  title: v.string(),
  category: billCategoryValidator,
  serviceStart: v.string(),
  serviceEnd: v.string(),
  totalCents: v.number(),
  dueDate: v.string(),
  splitMethod: billSplitMethodValidator,
  includeHost: v.boolean(),
  prorateByStayDates: v.boolean(),
  createdAt: v.number(),
  voidedAt: v.optional(v.number()),
  voidedBy: v.optional(v.id("users")),
  shares: v.array(billShareOutputValidator),
});

export const create = mutation({
  args: {
    stayId: v.id("stays"),
    title: v.string(),
    category: billCategoryValidator,
    serviceStart: v.string(),
    serviceEnd: v.string(),
    totalCents: v.number(),
    dueDate: v.string(),
    splitMethod: billSplitMethodValidator,
    includeHost: v.boolean(),
    prorateByStayDates: v.boolean(),
    guests: v.array(
      v.object({
        guestUserId: v.id("users"),
        input: v.optional(v.number()),
      }),
    ),
  },
  returns: v.id("bills"),
  handler: async (ctx, args) => {
    await requireFeature(
      ctx,
      FEATURE_FLAGS.BILL_SPLITTING,
      "Bill splitting is currently disabled by platform policy.",
    );
    const { user } = await requireHost(ctx, args.stayId);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") {
      throw new Error("Ended stays cannot add bills");
    }

    await assertPlanCapability(
      ctx,
      stay.hostUserId,
      "billSplits",
      stay.householdAccountId,
    );

    const trimmedTitle = args.title.trim();
    if (!trimmedTitle || trimmedTitle.length > 120) {
      throw new Error("Bill title must be between 1 and 120 characters");
    }
    assertCalendarDate(args.serviceStart, "Service start date");
    assertCalendarDate(args.serviceEnd, "Service end date");
    assertCalendarDate(args.dueDate, "Due date");

    const resolvedGuests = await Promise.all(
      args.guests.map(async (guestInput) => {
        const membership = await ctx.db
          .query("memberships")
          .withIndex("by_stay_user", (q) =>
            q.eq("stayId", args.stayId).eq("userId", guestInput.guestUserId),
          )
          .unique();
        if (
          !membership ||
          membership.role !== "guest" ||
          membership.status !== "active"
        ) {
          throw new Error("Selected guest is not an active member of this stay");
        }
        const guestTerms =
          (await getAcceptedGuestTerms(
            ctx,
            args.stayId,
            guestInput.guestUserId,
          )) ??
          (await getCurrentGuestTerms(
            ctx,
            args.stayId,
            guestInput.guestUserId,
          ));
        if (!guestTerms) {
          throw new Error("Guest agreement terms were not found for this stay");
        }
        return {
          guestUserId: guestInput.guestUserId,
          joinedAt: membership.joinedAt,
          stayStartDate: guestTerms.startDate,
          stayEndDate: guestTerms.endDate,
          input: guestInput.input,
          termsId: guestTerms._id,
        };
      }),
    );

    const calculatedShares = calculateBillShares({
      totalCents: args.totalCents,
      serviceStart: args.serviceStart,
      serviceEnd: args.serviceEnd,
      splitMethod: args.splitMethod,
      includeHost: args.includeHost,
      prorateByStayDates: args.prorateByStayDates,
      guests: resolvedGuests,
    });

    if (calculatedShares.every((share) => share.amountCents <= 0)) {
      throw new Error("At least one guest share must be greater than $0.00");
    }

    const termsByGuest = new Map(
      resolvedGuests.map((g) => [g.guestUserId as string, g.termsId]),
    );

    const now = Date.now();
    const billId = await ctx.db.insert("bills", {
      stayId: args.stayId,
      createdBy: user._id,
      title: trimmedTitle,
      category: args.category,
      serviceStart: args.serviceStart,
      serviceEnd: args.serviceEnd,
      totalCents: args.totalCents,
      dueDate: args.dueDate,
      splitMethod: args.splitMethod,
      includeHost: args.includeHost,
      prorateByStayDates: args.prorateByStayDates,
      createdAt: now,
    });

    for (const share of calculatedShares) {
      if (share.amountCents <= 0) continue;
      const guestUserId = share.guestUserId as Id<"users">;
      const termsId = termsByGuest.get(share.guestUserId);
      const obligationId = await ctx.db.insert("obligations", {
        stayId: args.stayId,
        termsId,
        guestUserId,
        type: "adhoc",
        title: trimmedTitle,
        periodStart: args.serviceStart,
        periodEnd: args.serviceEnd,
        dueDate: args.dueDate,
        baseAmountCents: share.amountCents,
        createdAt: now,
      });

      await ctx.db.insert("billShares", {
        billId,
        stayId: args.stayId,
        guestUserId,
        ...(share.input !== undefined ? { input: share.input } : {}),
        ...(share.prorationDays !== undefined
          ? { prorationDays: share.prorationDays }
          : {}),
        amountCents: share.amountCents,
        obligationId,
      });

      await ctx.scheduler.runAfter(0, internal.knock.triggerWorkflow, {
        userId: guestUserId,
        stayId: args.stayId,
        workflow: "adhoc-fee-posted",
        entityId: `obligation:${obligationId}`,
        data: {
          hostName: user.name,
          feeTitle: trimmedTitle,
          amount: share.amountCents,
          dueDate: args.dueDate,
        },
      });
    }

    await recordActivity(ctx, {
      stayId: args.stayId,
      actorUserId: user._id,
      kind: "obligation",
      action: "bill_created",
      detail: `${trimmedTitle} bill split added`,
      entityId: billId,
    });

    return billId;
  },
});

export const voidBill = mutation({
  args: {
    billId: v.id("bills"),
  },
  returns: v.null(),
  handler: async (ctx, { billId }) => {
    await requireFeature(
      ctx,
      FEATURE_FLAGS.BILL_SPLITTING,
      "Bill splitting is currently disabled by platform policy.",
    );
    const bill = await ctx.db.get(billId);
    if (!bill) throw new Error("Bill not found");
    const { user } = await requireHost(ctx, bill.stayId);
    if (bill.voidedAt) return null;

    const now = Date.now();
    await ctx.db.patch(billId, {
      voidedAt: now,
      voidedBy: user._id,
    });

    const shares = await ctx.db
      .query("billShares")
      .withIndex("by_bill", (q) => q.eq("billId", billId))
      .take(100);

    for (const share of shares) {
      const obligation = await ctx.db.get(share.obligationId);
      if (obligation && !obligation.voidedAt) {
        await ctx.db.patch(obligation._id, {
          voidedAt: now,
          voidedBy: user._id,
        });
      }
    }

    await recordActivity(ctx, {
      stayId: bill.stayId,
      actorUserId: user._id,
      kind: "obligation",
      action: "bill_voided",
      detail: `${bill.title} bill voided; history retained`,
      entityId: billId,
    });

    return null;
  },
});

export const list = query({
  args: {
    stayId: v.id("stays"),
  },
  returns: v.array(billOutputValidator),
  handler: async (ctx, { stayId }) => {
    if (!(await isFeatureEnabled(ctx, FEATURE_FLAGS.BILL_SPLITTING))) {
      return [];
    }
    const { user, membership } = await requireMembership(ctx, stayId);
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_stay_created_at", (q) => q.eq("stayId", stayId))
      .order("desc")
      .take(100);

    if (bills.length === 0) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_stay", (q) => q.eq("stayId", stayId))
      .take(100);
    const membershipByUserId = new Map(
      memberships.map((m) => [m.userId, m]),
    );

    const userNameCache = new Map<Id<"users">, string>();
    const resolveGuestName = async (guestUserId: Id<"users">) => {
      const cached = userNameCache.get(guestUserId);
      if (cached) return cached;
      const guestMembership = membershipByUserId.get(guestUserId);
      const guestUser = await ctx.db.get(guestUserId);
      const fallback = resolveMemberName({
        existingName: guestUser?.name,
        email: guestUser?.email,
        role: "guest",
      });
      const resolved = guestMembership?.preferredName ?? fallback;
      userNameCache.set(guestUserId, resolved);
      return resolved;
    };

    const results = [];
    for (const bill of bills) {
      const rawShares = await ctx.db
        .query("billShares")
        .withIndex("by_bill", (q) => q.eq("billId", bill._id))
        .take(100);

      const visibleShares =
        membership.role === "host"
          ? rawShares
          : rawShares.filter((share) => share.guestUserId === user._id);

      if (membership.role === "guest" && visibleShares.length === 0) {
        continue;
      }

      const enrichedShares = await Promise.all(
        visibleShares.map(async (share) => ({
          _id: share._id,
          billId: share.billId,
          stayId: share.stayId,
          guestUserId: share.guestUserId,
          guestName: await resolveGuestName(share.guestUserId),
          ...(share.input !== undefined ? { input: share.input } : {}),
          ...(share.prorationDays !== undefined
            ? { prorationDays: share.prorationDays }
            : {}),
          amountCents: share.amountCents,
          obligationId: share.obligationId,
        })),
      );

      results.push({
        ...bill,
        shares: enrichedShares,
      });
    }

    return results;
  },
});
