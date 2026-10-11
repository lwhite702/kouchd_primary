import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertCalendarDate, assertHouseInfoInput, assertPaymentOptionsInput, assertStayTerms, assertTimezone } from "./lib/validation";

import { generateReferralCode } from "../lib/referral";
import { SUGGESTED_CONTRIBUTION_TASKS } from "../lib/domain/rewards";
import { getCurrentGuestTerms } from "./lib/stayTerms";
import { resolveMemberName } from "./lib/names";
import { getOrCreateHouseholdAccount } from "./householdOwnership";

const houseInfoInput = {
  wifiNetwork: v.optional(v.string()),
  wifiPassword: v.optional(v.string()),
  streetAddress: v.optional(v.string()),
  unit: v.optional(v.string()),
  cityStateZip: v.optional(v.string()),
  doorCode: v.optional(v.string()),
  parkingNotes: v.optional(v.string()),
  trashDay: v.optional(v.string()),
  emergencyContact: v.optional(v.string()),
  otherNotes: v.optional(v.string()),
};

const paymentOptionsInput = v.array(v.object({
  provider: v.union(v.literal("paypal"), v.literal("cashapp"), v.literal("zelle"), v.literal("applepay")),
  detail: v.string(),
}));

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

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    timezone: v.string(),
    nextCheckInDate: v.optional(v.string()),
    houseInfo: v.optional(v.object(houseInfoInput)),
    paymentOptions: v.optional(paymentOptionsInput),
    terms: v.object(termsInput),
  },
  returns: v.id("stays"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const name = args.name?.trim();
    if (name !== undefined && (name.length < 2 || name.length > 80)) throw new Error("Stay name must be 2–80 characters");
    assertTimezone(args.timezone);
    assertStayTerms(args.terms);
    if (args.nextCheckInDate) assertCalendarDate(args.nextCheckInDate, "Next check-in date");
    if (args.houseInfo) assertHouseInfoInput(args.houseInfo);
    const paymentOptions = args.paymentOptions ?? [];
    assertPaymentOptionsInput(paymentOptions);
    const now = Date.now();
    const referralCode = generateReferralCode();
    const householdAccountId = await getOrCreateHouseholdAccount(ctx, user._id);
    const stayId = await ctx.db.insert("stays", {
      hostUserId: user._id,
      name,
      householdAccountId,
      status: "pending",
      timezone: args.timezone,
      referralCode,
      nextCheckInDate: args.nextCheckInDate,
      houseInfo: args.houseInfo,
      paymentOptions,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("memberships", { stayId, userId: user._id, role: "host", status: "active", joinedAt: now });
    const termsId = await ctx.db.insert("terms", { stayId, version: 1, ...args.terms, billingBasis: args.terms.billingBasis ?? "continuous", createdBy: user._id, createdAt: now });
    await ctx.db.patch(stayId, { currentTermsId: termsId });
    await ctx.db.insert("termsAcceptances", { stayId, termsId, userId: user._id, acceptedAt: now });
    const membership = await ctx.db.query("memberships").withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", user._id)).unique();
    if (membership) await ctx.db.patch(membership._id, { acceptedTermsId: termsId });

    // Seed default suggested contribution tasks if rewards are enabled
    if (args.terms.rewards?.enabled) {
      for (const task of SUGGESTED_CONTRIBUTION_TASKS) {
        await ctx.db.insert("contributionRules", {
          stayId,
          title: task.title,
          category: task.category,
          pointsAwarded: task.defaultPoints,
          description: task.description,
          isActive: true,
          createdAt: now,
        });
      }
    }

    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "stay", action: "created", detail: "Stay and first terms version created", entityId: stayId });
    return stayId;
  },
});

export const updateName = mutation({
  args: { stayId: v.id("stays"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { stayId, name }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) throw new Error("Stay name must be 2–80 characters");
    await ctx.db.patch(stayId, { name: trimmed, updatedAt: Date.now() });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "stay", action: "renamed", detail: "Stay name updated", entityId: stayId });
    return null;
  },
});

export const updatePaymentOptions = mutation({
  args: { stayId: v.id("stays"), paymentOptions: paymentOptionsInput },
  returns: v.null(),
  handler: async (ctx, { stayId, paymentOptions }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    assertPaymentOptionsInput(paymentOptions);
    await ctx.db.patch(stayId, { paymentOptions, updatedAt: Date.now() });
    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "stay",
      action: "payment_options_updated",
      detail: "External payment options updated",
      entityId: stayId,
    });
    return null;
  },
});

export const listMine = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const memberships = await ctx.db.query("memberships").withIndex("by_user", (query) => query.eq("userId", user._id)).take(50);
    const results = [];
    for (const membership of memberships) {
      if (membership.status !== "active") continue;
      const stay = await ctx.db.get(membership.stayId);
      if (stay) results.push({ stay, membership });
    }
    return results;
  },
});

export const getBundle = query({
  args: { stayId: v.id("stays") },
  returns: v.any(),
  handler: async (ctx, { stayId }) => {
    const { membership } = await requireMembership(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay) throw new Error("Stay not found");
    const terms = membership.role === "guest"
      ? await getCurrentGuestTerms(ctx, stayId, membership.userId)
      : stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    const memberships = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stayId)).take(50);
    const members = [];
    for (const item of memberships) {
      const person = await ctx.db.get(item.userId);
      if (person) {
        const guestTerms = membership.role === "host"
          ? item.role === "guest" ? await getCurrentGuestTerms(ctx, stayId, item.userId) : terms
          : null;
        const displayName = resolveMemberName({
          existingName: person.name,
          email: person.email,
          role: item.role,
        });
        members.push({
          membership: item,
          person: { id: person._id, name: displayName, imageUrl: person.imageUrl },
          ...(membership.role === "host" ? { terms: guestTerms } : {}),
        });
      }
    }
    return { stay, terms, membership, members };
  },
});

export const end = mutation({
  args: { stayId: v.id("stays") },
  returns: v.null(),
  handler: async (ctx, { stayId }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay) throw new Error("Stay not found");
    if (stay.status === "ended") return null;
    const now = Date.now();
    await ctx.db.patch(stayId, { status: "ended", endedAt: now, updatedAt: now });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "stay", action: "ended", detail: "Stay ended and record retained", entityId: stayId });
    return null;
  },
});

export const updateHouseInfo = mutation({
  args: {
    stayId: v.id("stays"),
    houseInfo: v.object(houseInfoInput),
  },
  returns: v.null(),
  handler: async (ctx, { stayId, houseInfo }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay) throw new Error("Stay not found");
    assertHouseInfoInput(houseInfo);
    const now = Date.now();
    await ctx.db.patch(stayId, {
      houseInfo,
      updatedAt: now,
    });
    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "stay",
      action: "house_info_updated",
      detail: "Household logistics & WiFi updated",
      entityId: stayId,
    });
    return null;
  },
});
