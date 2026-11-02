import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { resolveMemberName } from "./lib/names";
import { assertPhone } from "./lib/validation";
import { ANALYTICS_EVENTS } from "../lib/analytics/events";
import { trackServerEvent } from "./lib/posthog";
import { signupMetaEventId } from "../lib/analytics/consent";

const guideStateValidator = v.object({
  step: v.number(),
  status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
});
const guideProgressValidator = v.object({
  host: v.optional(guideStateValidator),
  guest: v.optional(guideStateValidator),
});

export const syncCurrent = mutation({
  args: {
    clerkName: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", identity.subject))
      .unique();
    const clerkName = args.clerkName?.trim();
    if (args.clerkName !== undefined && (!clerkName || clerkName.length > 80)) {
      throw new Error("Name must be between 1 and 80 characters");
    }
    const name = resolveMemberName({
      explicitName: clerkName,
      identityName: identity.name,
      givenName: identity.givenName,
      familyName: identity.familyName,
      nickname: identity.nickname,
      preferredUsername: identity.preferredUsername,
      email: args.email ?? identity.email,
    });
    const email = args.email?.trim() || identity.email || existing?.email;
    const imageUrl = args.imageUrl || identity.pictureUrl || existing?.imageUrl;
    let userId = existing?._id;
    if (existing) {
      await ctx.db.patch(existing._id, { name, email, imageUrl, updatedAt: now });
    } else {
      userId = await ctx.db.insert("users", { clerkUserId: identity.subject, name, email, imageUrl, createdAt: now, updatedAt: now });
      trackServerEvent(ctx, { clerkUserId: identity.subject }, ANALYTICS_EVENTS.USER_SIGNED_UP, {
        meta_event_id: signupMetaEventId(identity.subject),
      });
    }
    if (userId) {
      await ctx.scheduler.runAfter(0, internal.knock.identifyUser, { userId });
    }
    return userId!;
  },
});

export const viewer = query({
  args: {},
  returns: v.union(v.null(), v.object({ id: v.id("users"), name: v.string(), email: v.optional(v.string()), phone: v.optional(v.string()), imageUrl: v.optional(v.string()), notifyEmail: v.boolean(), notifySms: v.boolean(), guideProgress: v.optional(guideProgressValidator) })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", identity.subject)).unique();
    if (!user) return null;
    return {
      id: user._id,
      // syncCurrent mirrors the Clerk profile into Convex for household queries.
      name: user.name,
      email: user.email,
      phone: user.phone,
      imageUrl: user.imageUrl,
      notifyEmail: user.notifyEmail ?? true,
      notifySms: user.notifySms ?? false,
      guideProgress: user.guideProgress,
    };
  },
});

export const updateGuideProgress = mutation({
  args: {
    role: v.union(v.literal("host"), v.literal("guest")),
    step: v.number(),
    status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
  },
  returns: v.null(),
  handler: async (ctx, { role, step, status }) => {
    const user = await requireCurrentUser(ctx);
    if (!Number.isSafeInteger(step) || step < 0 || step > 3) throw new Error("Invalid guide step");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .take(50);
    if (!memberships.some((membership) => membership.role === role && membership.status === "active")) {
      throw new Error("You are not an active member in this role");
    }

    await ctx.db.patch(user._id, {
      guideProgress: { ...user.guideProgress, [role]: { step, status } },
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updatePreferences = mutation({
  args: {
    phone: v.optional(v.string()),
    notifyEmail: v.boolean(),
    notifySms: v.boolean(),
    smsConsentSource: v.optional(v.union(
      v.literal("host_onboarding"),
      v.literal("guest_onboarding"),
      v.literal("settings"),
      v.literal("sms_opt_in_form"),
    )),
    smsConsentConfirmed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const phone = args.phone?.trim() || undefined;
    assertPhone(phone);
    if (args.notifySms && !phone) throw new Error("Add a phone number before enabling SMS reminders");
    const wasSmsEnabled = user.notifySms ?? false;
    const previousPhone = user.phone;
    const now = Date.now();
    const needsNewConsent = args.notifySms && (!wasSmsEnabled || previousPhone !== phone);
    const hasExplicitConsent = args.smsConsentConfirmed === true;

    if (needsNewConsent && !hasExplicitConsent) {
      throw new Error("Confirm SMS consent before enabling reminders");
    }
    if ((needsNewConsent || hasExplicitConsent) && args.notifySms) {
      if (!args.smsConsentSource) throw new Error("SMS consent source is required");
      await ctx.db.insert("smsConsentEvents", {
        userId: user._id,
        phone: phone!,
        action: "opted_in",
        source: args.smsConsentSource,
        consentVersion: "transactional-sms-v1",
        recordedAt: now,
      });
    } else if (!args.notifySms && wasSmsEnabled) {
      if (!args.smsConsentSource) throw new Error("SMS preference source is required when opting out");
      await ctx.db.insert("smsConsentEvents", {
        userId: user._id,
        phone: previousPhone ?? phone ?? "",
        action: "opted_out",
        source: args.smsConsentSource,
        consentVersion: "transactional-sms-v1",
        recordedAt: now,
      });
    }

    await ctx.db.patch(user._id, {
      phone,
      notifyEmail: args.notifyEmail,
      notifySms: args.notifySms,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.knock.identifyUser, { userId: user._id });
    return null;
  },
});
