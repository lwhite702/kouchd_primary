import { v } from "convex/values";
import schema from "./schema";
import { assertPlanCapability, assertPlanCapacity } from "./lib/planCapacity";

import { mutation, query } from "./_generated/server";
import { requireFeature } from "./flags";
import { requireCurrentUser, requireHost, requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertCalendarDate, assertHouseInfoInput, assertPaymentOptionsInput, assertStayTerms, assertSubleaseInput, assertTimezone } from "./lib/validation";

import { generateReferralCode } from "../lib/referral";
import { SUGGESTED_CONTRIBUTION_TASKS } from "../lib/domain/rewards";
import { getCurrentGuestTerms } from "./lib/stayTerms";
import { internal } from "./_generated/api";
import { resolveMemberName } from "./lib/names";
import { accessCodesHiddenReason, redactStayForMember } from "./lib/houseInfoAccess";
import { assertSubleaseUnlocked, getSubleaseLockState } from "./lib/subleaseLock";
import { getOrCreateHouseholdAccount } from "./householdOwnership";
import { ANALYTICS_EVENTS } from "../lib/analytics/events";
import { FEATURE_FLAGS } from "../lib/flags/config";
import { trackServerEvent } from "./lib/posthog";

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
  cadence: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
  paymentDayOfWeek: v.optional(v.number()),
  paymentDayOfMonth: v.optional(v.number()),
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
    arrangement: v.optional(v.union(v.literal("home_stay"), v.literal("sublease"))),
    subleaseLayout: v.optional(v.union(v.literal("whole_place"), v.literal("private_room"))),
    roommateCount: v.optional(v.number()),
    roommateNames: v.optional(v.array(v.string())),
    landlordConsentAnswer: v.optional(
      v.union(
        v.literal("written_permission"),
        v.literal("not_required"),
        v.literal("not_confirmed"),
      ),
    ),
    subleaseBillPreset: v.optional(v.union(v.literal("whole_place"), v.literal("private_room"))),
    timezone: v.string(),
    nextCheckInDate: v.optional(v.string()),
    houseInfo: v.optional(v.object(houseInfoInput)),
    paymentOptions: v.optional(paymentOptionsInput),
    terms: v.object(termsInput),
    // Suggested reward activities the host kept in setup. Older clients omit it
    // and receive every suggestion, as before.
    rewardTaskIds: v.optional(v.array(v.string())),
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
    if (args.arrangement === "sublease") {
      await requireFeature(
        ctx,
        FEATURE_FLAGS.SUBLEASES,
        "Subleases are currently disabled by platform policy.",
      );
      assertSubleaseInput({
        arrangement: args.arrangement,
        subleaseLayout: args.subleaseLayout,
        roommateCount: args.roommateCount,
        roommateNames: args.roommateNames,
      });
      assertStayTerms(args.terms, { arrangement: "sublease" });
    } else {
      assertSubleaseInput({
        arrangement: args.arrangement,
        subleaseLayout: args.subleaseLayout,
        roommateCount: args.roommateCount,
        roommateNames: args.roommateNames,
      });
      assertStayTerms(args.terms, { arrangement: args.arrangement });
    }
    if (args.nextCheckInDate) assertCalendarDate(args.nextCheckInDate, "Next check-in date");
    if (args.houseInfo) assertHouseInfoInput(args.houseInfo);
    if (args.rewardTaskIds) {
      const knownTaskIds = new Set(SUGGESTED_CONTRIBUTION_TASKS.map((task) => task.id));
      if (
        args.rewardTaskIds.length > knownTaskIds.size ||
        args.rewardTaskIds.some((taskId) => !knownTaskIds.has(taskId))
      ) {
        throw new Error("Choose from the suggested reward activities");
      }
    }
    const paymentOptions = args.paymentOptions ?? [];
    assertPaymentOptionsInput(paymentOptions);
    const now = Date.now();
    const referralCode = generateReferralCode();
    let householdAccountId;
    if (args.arrangement === "sublease") {
      householdAccountId = await getOrCreateHouseholdAccount(ctx, user._id);
      await assertPlanCapability(ctx, user._id, "subleases", householdAccountId);
      await assertPlanCapacity(ctx, user._id, "stay", householdAccountId);
    } else {
      await assertPlanCapacity(ctx, user._id, "stay");
      householdAccountId = await getOrCreateHouseholdAccount(ctx, user._id);
    }
    const stayId = await ctx.db.insert("stays", {
      hostUserId: user._id,
      name,
      householdAccountId,
      creationRequestId,
      ...(args.arrangement ? { arrangement: args.arrangement } : {}),
      ...(args.arrangement === "sublease"
        ? {
            subleaseLayout: args.subleaseLayout,
            ...(args.subleaseLayout === "private_room"
              ? {
                  roommateCount: args.roommateCount,
                  ...(args.roommateNames
                    ? { roommateNames: args.roommateNames.map((n) => n.trim()) }
                    : {}),
                }
              : {}),
            ...(args.landlordConsentAnswer
              ? {
                  landlordConsent: {
                    answer: args.landlordConsentAnswer,
                    answeredAt: now,
                  },
                }
              : {}),
            subleaseBillPreset: args.subleaseBillPreset ?? args.subleaseLayout,
          }
        : {}),
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
    const termsId = await ctx.db.insert("terms", {
      stayId,
      version: 1,
      ...args.terms,
      ...(args.terms.cadence === "monthly" ? { paymentDayOfMonth: args.terms.paymentDayOfMonth } : {}),
      billingBasis: args.terms.billingBasis ?? "continuous",
      createdBy: user._id,
      createdAt: now,
    });
    await ctx.db.patch(stayId, { currentTermsId: termsId });
    await ctx.db.insert("termsAcceptances", { stayId, termsId, userId: user._id, acceptedAt: now, method: "host" });
    const membership = await ctx.db.query("memberships").withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", user._id)).unique();
    if (membership) await ctx.db.patch(membership._id, { acceptedTermsId: termsId });
    trackServerEvent(ctx, user, ANALYTICS_EVENTS.STAY_CREATED, { stayId, cadence: args.terms.cadence, rateCents: args.terms.rateCents }, stayId);

    // Seed default suggested contribution tasks if rewards are enabled
    if (args.terms.rewards?.enabled) {
      const selectedTaskIds = args.rewardTaskIds ? new Set(args.rewardTaskIds) : null;
      for (const task of SUGGESTED_CONTRIBUTION_TASKS) {
        if (selectedTaskIds && !selectedTaskIds.has(task.id)) continue;
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

export const recordLandlordConsent = mutation({
  args: {
    stayId: v.id("stays"),
    answer: v.union(
      v.literal("written_permission"),
      v.literal("not_required"),
      v.literal("not_confirmed"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { stayId, answer }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    await assertSubleaseUnlocked(ctx, stay, { viewerRole: "host" });
    if (stay.arrangement !== "sublease") {
      throw new Error("Landlord consent only applies to sublease stays");
    }
    const now = Date.now();
    await ctx.db.patch(stayId, {
      landlordConsent: {
        answer,
        answeredAt: now,
      },
      updatedAt: now,
    });
    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "stay",
      action: "landlord_consent_recorded",
      detail: `Landlord consent recorded: ${answer.replaceAll("_", " ")}`,
      entityId: stayId,
    });
    return null;
  },
});

export const dismissLandlordConsentWarning = mutation({
  args: { stayId: v.id("stays") },
  returns: v.null(),
  handler: async (ctx, { stayId }) => {
    await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    await assertSubleaseUnlocked(ctx, stay, { viewerRole: "host" });
    if (stay.landlordConsent) {
      const now = Date.now();
      await ctx.db.patch(stayId, {
        landlordConsent: {
          ...stay.landlordConsent,
          warningDismissedAt: now,
        },
        updatedAt: now,
      });
    }
    return null;
  },
});

export const updateAgreementAutoAccept = mutation({
  args: { stayId: v.id("stays"), enabled: v.boolean(), hours: v.number() },
  returns: v.null(),
  handler: async (ctx, { stayId, enabled, hours }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    await assertSubleaseUnlocked(ctx, stay, { viewerRole: "host" });
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
    await assertSubleaseUnlocked(ctx, stay, { viewerRole: "host" });
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
    await assertSubleaseUnlocked(ctx, stay, { viewerRole: "host" });
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

const stayDocument = v.object({ ...schema.tables.stays.validator.fields, _id: v.id("stays"), _creationTime: v.number() });
const memberDocument = v.object({ ...schema.tables.memberships.validator.fields, _id: v.id("memberships"), _creationTime: v.number() });
const termsDocument = v.object({ ...schema.tables.terms.validator.fields, _id: v.id("terms"), _creationTime: v.number() });
const offerDocument = v.object({ ...schema.tables.agreementOffers.validator.fields, _id: v.id("agreementOffers"), _creationTime: v.number() });
const subleaseLockValidator = v.object({
  locked: v.boolean(),
  billingRetryWarning: v.boolean(),
  reason: v.union(v.string(), v.null()),
});

export const listMine = query({
  args: {},
  returns: v.array(v.object({ stay: stayDocument, membership: memberDocument })),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const memberships = await ctx.db.query("memberships").withIndex("by_user", (query) => query.eq("userId", user._id)).take(50);
    const results = await Promise.all(memberships.filter(m => m.status === "active").map(async membership => {
      const stay = await ctx.db.get(membership.stayId);
      if (!stay) return null;
      const guestTerms =
        stay.arrangement === "sublease" && membership.role === "guest"
          ? await getCurrentGuestTerms(ctx, stay._id, membership.userId)
          : null;
      return {
        stay: redactStayForMember(stay, membership, {
          termsEndDate: guestTerms?.endDate,
        }),
        membership,
      };
    }));
    return results.filter((result): result is NonNullable<typeof result> => result !== null);
  },
});

export const getBundle = query({
  args: { stayId: v.id("stays") },
  returns: v.object({ stay: stayDocument, terms: v.union(termsDocument, v.null()), membership: memberDocument,
    members: v.array(v.object({ membership: memberDocument, person: v.object({
      id: v.id("users"), name: v.string(), imageUrl: v.optional(v.string()), email: v.optional(v.string()), phone: v.optional(v.string()),
    }), terms: v.optional(v.union(termsDocument, v.null())), agreementOffer: v.optional(v.union(offerDocument, v.null())) })),
    accessCodesHidden: v.union(v.literal("needs_acceptance"), v.literal("ended"), v.null()),
    subleaseLock: v.optional(subleaseLockValidator),
  }),
  handler: async (ctx, { stayId }) => {
    const { membership } = await requireMembership(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay) throw new Error("Stay not found");
    const terms = membership.role === "guest"
      ? await getCurrentGuestTerms(ctx, stayId, membership.userId)
      : stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    const subleaseLock = await getSubleaseLockState(ctx, stay);
    const memberships = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", stayId)).take(50);
    const membersWithMissing = await Promise.all(memberships.map(async item => {
      const person = await ctx.db.get(item.userId);
      if (person) {
        const guestTerms = membership.role === "host"
          ? item.role === "guest" ? await getCurrentGuestTerms(ctx, stayId, item.userId) : terms
          : null;
        const agreementOffer = membership.role === "host" && item.role === "guest"
          ? (await ctx.db.query("agreementOffers")
            .withIndex("by_stay_guest", (query) => query.eq("stayId", stayId).eq("guestUserId", item.userId))
            .order("desc").first())
          : null;
        const displayName = resolveMemberName({
          existingName: person.name,
          email: person.email,
          role: item.role,
        });
        return {
          membership: item,
          person: {
            id: person._id,
            name: item.preferredName ?? displayName,
            imageUrl: person.imageUrl,
            ...(membership.role === "host" && item.role === "guest" ? { email: person.email, phone: person.phone } : {}),
          },
          ...(membership.role === "host" ? { terms: guestTerms } : {}),
          ...(membership.role === "host" && item.role === "guest" ? { agreementOffer } : {}),
        };
      }
      return null;
    }));
    const members = membersWithMissing.filter((member): member is NonNullable<typeof member> => member !== null);

    return {
      stay: redactStayForMember(stay, membership, {
        termsEndDate: terms?.endDate,
      }),
      terms,
      membership,
      members,
      accessCodesHidden: accessCodesHiddenReason(stay, membership, {
        termsEndDate: terms?.endDate,
      }),
      subleaseLock: {
        locked: subleaseLock.locked,
        billingRetryWarning: subleaseLock.billingRetryWarning,
        reason: subleaseLock.reason,
      },
    };
  },
});

export const updateGuestPreferredName = mutation({
  args: { stayId: v.id("stays"), guestUserId: v.id("users"), preferredName: v.string() },
  returns: v.null(),
  handler: async (ctx, { stayId, guestUserId, preferredName }) => {
    const { user } = await requireHost(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    await assertSubleaseUnlocked(ctx, stay, { viewerRole: "host" });
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
    await assertSubleaseUnlocked(ctx, stay, {
      allowHostEnd: true,
      viewerRole: "host",
    });
    if (stay.status === "ended") return null;
    const now = Date.now();
    await ctx.db.patch(stayId, { status: "ended", endedAt: now, updatedAt: now });
    const detail =
      stay.arrangement === "sublease"
        ? "Sublease ended and record retained. Remember to change physical door codes and Wi-Fi passwords."
        : "Stay ended and record retained";
    await recordActivity(ctx, { stayId, actorUserId: user._id, kind: "stay", action: "ended", detail, entityId: stayId });
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
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot be edited");
    await assertSubleaseUnlocked(ctx, stay, { viewerRole: "host" });
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
