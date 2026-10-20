import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertCalendarDate, assertHouseInfoInput, assertPaymentOptionsInput, assertStayTerms, assertTimezone } from "./lib/validation";

import { generateReferralCode } from "../lib/referral";
import { SUGGESTED_CONTRIBUTION_TASKS } from "../lib/domain/rewards";
import { getCurrentGuestTerms } from "./lib/stayTerms";
import { internal } from "./_generated/api";
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
  provider: v.union(
    v.literal("venmo"),
    v.literal("cashapp"),
    v.literal("chime"),
    v.literal("zelle"),
    v.literal("cash"),
    v.literal("paypal"),
    v.literal("applepay"),
  ),
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
    creationRequestId: v.optional(v.string()),
    timezone: v.string(),
    nextCheckInDate: v.optional(v.string()),
    houseInfo: v.optional(v.object(houseInfoInput)),
    paymentOptions: v.optional(paymentOptionsInput),
    terms: v.object(termsInput),
  },
  returns: v.id("stays"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const creationRequestId = args.creationRequestId?.trim();
    if (args.creationRequestId !== undefined && (!creationRequestId || creationRequestId.length > 100)) {
      throw new Error("Stay creation request ID must be between 1 and 100 characters");
    }
    if (creationRequestId) {
      const existing = await ctx.db.query("stays")
        .withIndex("by_host_and_creation_request", (query) =>
          query.eq("hostUserId", user._id).eq("creationRequestId", creationRequestId),
        )
        .first();
      if (existing) return existing._id;
    }
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
      creationRequestId,
      status: "pending",
      timezone: args.timezone,
      agreementAutoAcceptEnabled: true,
      agreementAutoAcceptHours: 24,
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
    await ctx.db.insert("termsAcceptances", { stayId, termsId, userId: user._id, acceptedAt: now, method: "host" });
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

    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "terms", action: "created", detail: "Agreement version 1 created", entityId: termsId });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "terms", action: "accepted", detail: "Host accepted the initial agreement", entityId: termsId });
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "stay", action: "created", detail: "Stay created", entityId: stayId });
    return stayId;
  },
});

export const updateAgreementAutoAccept = mutation({
  args: { stayId: v.id("stays"), enabled: v.boolean(), hours: v.number() },
  returns: v.null(),
  handler: async (ctx, { stayId, enabled, hours }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    if (!Number.isInteger(hours) || hours < 1 || hours > 720) throw new Error("Choose between 1 and 720 hours");
    const now = Date.now();
    await ctx.db.patch(stayId, { agreementAutoAcceptEnabled: enabled, agreementAutoAcceptHours: hours, updatedAt: now });
    const pending = await ctx.db.query("agreementOffers").withIndex("by_stay_status", (query) => query.eq("stayId", stayId).eq("status", "pending")).take(500);
    for (const offer of pending) {
      if (!enabled) {
        await ctx.db.patch(offer._id, { autoAcceptAt: undefined });
      } else {
        const autoAcceptAt = now + hours * 60 * 60 * 1000;
        await ctx.db.patch(offer._id, { autoAcceptAt });
        await ctx.scheduler.runAfter(autoAcceptAt - now, internal.terms.autoAcceptOffer, { offerId: offer._id });
      }
    }
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "terms", action: "auto_accept_settings_updated", detail: enabled ? `Automatic acceptance enabled after ${hours} hours; pending agreement timers restarted` : "Automatic acceptance disabled for pending agreements", entityId: stayId });
    return null;
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
        const agreementOffer = membership.role === "host" && item.role === "guest"
          ? (await ctx.db.query("agreementOffers")
            .withIndex("by_stay_guest", (query) => query.eq("stayId", stayId).eq("guestUserId", item.userId))
            .take(100)).sort((left, right) => right.offeredAt - left.offeredAt)[0] ?? null
          : null;
        const displayName = resolveMemberName({
          existingName: person.name,
          email: person.email,
          role: item.role,
        });
        members.push({
          membership: item,
          person: {
            id: person._id,
            name: item.preferredName ?? displayName,
            imageUrl: person.imageUrl,
            ...(membership.role === "host" && item.role === "guest" ? { email: person.email, phone: person.phone } : {}),
          },
          ...(membership.role === "host" ? { terms: guestTerms } : {}),
          ...(membership.role === "host" && item.role === "guest" ? { agreementOffer } : {}),
        });
      }
    }
    return { stay, terms, membership, members };
  },
});

export const updateGuestPreferredName = mutation({
  args: { stayId: v.id("stays"), guestUserId: v.id("users"), preferredName: v.string() },
  returns: v.null(),
  handler: async (ctx, { stayId, guestUserId, preferredName }) => {
    const { user } = await requireHost(ctx, stayId);
    const name = preferredName.trim();
    if (!name || name.length > 80) throw new Error("Preferred name must be between 1 and 80 characters");
    const membership = await ctx.db.query("memberships")
      .withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", guestUserId))
      .unique();
    if (!membership || membership.role !== "guest" || membership.status !== "active") {
      throw new Error("Choose an active guest in this household");
    }
    await ctx.db.patch(membership._id, { preferredName: name });
    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      guestUserId,
      kind: "stay",
      action: "preferred_name_updated",
      detail: "Guest preferred name updated",
      entityId: guestUserId,
    });
    return null;
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
