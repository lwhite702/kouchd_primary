import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireHost } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertReferralCode } from "./lib/validation";
import { generateReferralCode, normalizeReferralCode } from "../lib/referral";
import { ensureGuestTerms, offerGuestAgreement } from "./lib/stayTerms";
import { scheduleSubscriptionLimitShadow } from "./subscriptionShadow";

export const preview = query({
  args: { referralCode: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      assertReferralCode(args.referralCode);
    } catch (reason) {
      return { valid: false, error: reason instanceof Error ? reason.message : "Invalid code" };
    }

    const normalized = normalizeReferralCode(args.referralCode);
    const stay = await ctx.db
      .query("stays")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", normalized))
      .first();

    if (!stay || stay.status === "ended") {
      return { valid: false, error: "This household referral code was not found or the stay has ended." };
    }

    const host = await ctx.db.get(stay.hostUserId);
    const terms = stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;

    return {
      valid: true,
      stayId: stay._id,
      hostName: host?.name ?? "Household Host",
      hostImage: host?.imageUrl,
      status: stay.status,
      timezone: stay.timezone,
      startDate: terms?.startDate,
      endDate: terms?.endDate,
      cadence: terms?.cadence,
      rateCents: terms?.rateCents,
      houseNotes: terms?.houseNotes,
      houseRules: terms?.houseRules,
      rewards: terms?.rewards,
    };
  },
});

export const joinWithCode = mutation({
  args: { referralCode: v.string() },
  returns: v.object({
    stayId: v.id("stays"),
    alreadyMember: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertReferralCode(args.referralCode);
    const normalized = normalizeReferralCode(args.referralCode);

    const stay = await ctx.db
      .query("stays")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", normalized))
      .first();

    if (!stay || stay.status === "ended") {
      throw new Error("Invalid or expired household referral code");
    }

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_stay_user", (q) => q.eq("stayId", stay._id).eq("userId", user._id))
      .unique();

    if (existingMembership) {
      if (existingMembership.status === "active") {
        return { stayId: stay._id, alreadyMember: true };
      }
      // Re-activate if left
      await ctx.db.patch(existingMembership._id, { status: "active", joinedAt: Date.now() });
      const guestTerms = await ensureGuestTerms(ctx, stay._id, user._id, stay.hostUserId);
      await offerGuestAgreement(ctx, { stayId: stay._id, termsId: guestTerms._id, guestUserId: user._id, offeredBy: stay.hostUserId });
      if (stay.status === "active") {
        await scheduleSubscriptionLimitShadow(ctx, stay._id, "guest_rejoined", "active_guest_memberships");
      }
      await recordActivity(ctx, {
        stayId: stay._id,
        actorUserId: user._id,
        kind: "stay",
        action: "rejoined_household",
        detail: `${user.name} rejoined the household`,
        entityId: stay._id,
      });
      return { stayId: stay._id, alreadyMember: false };
    }

    const members = await ctx.db
      .query("memberships")
      .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
      .take(21);

    const activeCount = members.filter((m) => m.status === "active").length;
    if (activeCount >= 20) {
      throw new Error("This household has reached its member limit of 20");
    }

    const now = Date.now();
    await ctx.db.insert("memberships", {
      stayId: stay._id,
      userId: user._id,
      role: "guest",
      status: "active",
      joinedAt: now,
    });
    const guestTerms = await ensureGuestTerms(ctx, stay._id, user._id, stay.hostUserId);
    await offerGuestAgreement(ctx, { stayId: stay._id, termsId: guestTerms._id, guestUserId: user._id, offeredBy: stay.hostUserId });
    if (stay.status === "active") {
      await scheduleSubscriptionLimitShadow(ctx, stay._id, "guest_joined", "active_guest_memberships");
    }

    await recordActivity(ctx, {
      stayId: stay._id,
      actorUserId: user._id,
      kind: "stay",
      action: "joined_via_referral",
      detail: `${user.name} joined the household with a referral code`,
      entityId: stay._id,
    });

    return { stayId: stay._id, alreadyMember: false };
  },
});

export const regenerateCode = mutation({
  args: { stayId: v.id("stays") },
  returns: v.string(),
  handler: async (ctx, { stayId }) => {
    const { user } = await requireHost(ctx, stayId);
    const newCode = generateReferralCode();
    await ctx.db.patch(stayId, { referralCode: newCode, updatedAt: Date.now() });

    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "stay",
      action: "referral_code_regenerated",
      detail: "Host generated a new household referral code",
      entityId: stayId,
    });

    return newCode;
  },
});
