import { assertPlanCapacity } from "./lib/planCapacity";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireHost } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertInvite, assertInviteHash } from "./lib/validation";
import { ensureGuestTerms, offerGuestAgreement } from "./lib/stayTerms";
import { scheduleSubscriptionLimitShadow } from "./subscriptionShadow";
import { clearBlockedJoins } from "./subscriptions";

export const preview = query({
  args: { tokenHash: v.string() },
  returns: v.object({
    valid: v.boolean(),
    status: v.optional(v.union(v.literal("invalid"), v.literal("used"))),
    hostName: v.optional(v.string()),
    referralCode: v.optional(v.string()),
    stayName: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    terms: v.optional(v.object({
      version: v.number(),
      startDate: v.string(),
      endDate: v.string(),
      cadence: v.union(v.literal("daily"), v.literal("weekly")),
      rateCents: v.number(),
      houseNotes: v.string(),
    })),
  }),
  handler: async (ctx, { tokenHash }) => {
    try {
      assertInviteHash(tokenHash);
    } catch {
      return { valid: false, status: "invalid" as const };
    }
    const invite = await ctx.db.query("invites").withIndex("by_token_hash", (query) => query.eq("tokenHash", tokenHash)).unique();
    if (!invite) return { valid: false, status: "invalid" as const };
    if (invite.usedAt) return { valid: false, status: "used" as const };
    if (invite.expiresAt <= Date.now()) return { valid: false, status: "invalid" as const };
    const stay = await ctx.db.get(invite.stayId);
    if (!stay || stay.status === "ended") return { valid: false, status: "invalid" as const };
    const host = await ctx.db.get(stay.hostUserId);
    const terms = stay.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
    return {
      valid: true,
      hostName: host?.name ?? "A Kouchd host",
      referralCode: stay.referralCode,
      stayName: stay.name ?? "Shared stay",
      expiresAt: invite.expiresAt,
      ...(terms ? { terms: {
        version: terms.version,
        startDate: terms.startDate,
        endDate: terms.endDate,
        cadence: terms.cadence,
        rateCents: terms.rateCents,
        houseNotes: terms.houseNotes,
      } } : {}),
    };
  },
});

export const create = mutation({
  args: { stayId: v.id("stays"), tokenHash: v.string(), invitedEmail: v.optional(v.string()), inviteUrl: v.optional(v.string()), expiresAt: v.number() },
  returns: v.id("invites"),
  handler: async (ctx, args) => {
    const { user } = await requireHost(ctx, args.stayId);
    assertInvite(args.tokenHash, args.expiresAt);
    if (args.inviteUrl) {
      const inviteUrl = new URL(args.inviteUrl);
      if (!['http:', 'https:'].includes(inviteUrl.protocol) || args.inviteUrl.length > 2_000) throw new Error("Invite URL is invalid");
    }
    const existing = await ctx.db.query("invites").withIndex("by_token_hash", (query) => query.eq("tokenHash", args.tokenHash)).unique();
    if (existing) throw new Error("Invite token already exists");
    const inviteId = await ctx.db.insert("invites", { stayId: args.stayId, tokenHash: args.tokenHash, invitedEmail: args.invitedEmail, expiresAt: args.expiresAt, createdBy: user._id, createdAt: Date.now() });
    await recordActivity(ctx, { stayId: args.stayId, actorUserId: user._id, kind: "invite", action: "created", detail: "Guest invite created", entityId: inviteId });
    if (args.invitedEmail && args.inviteUrl) {
      await ctx.scheduler.runAfter(0, internal.knock.triggerInvitation, {
        recipientEmail: args.invitedEmail,
        hostName: user.name,
        inviteUrl: args.inviteUrl,
        expiresAt: args.expiresAt,
      });
    }
    return inviteId;
  },
});

export const accept = mutation({
  args: { tokenHash: v.string() },
  returns: v.id("stays"),
  handler: async (ctx, { tokenHash }) => {
    const user = await requireCurrentUser(ctx);
    try {
      assertInviteHash(tokenHash);
    } catch {
      throw new Error("Invite is invalid or expired");
    }
    const invite = await ctx.db.query("invites").withIndex("by_token_hash", (query) => query.eq("tokenHash", tokenHash)).unique();
    if (!invite || invite.usedAt || invite.expiresAt <= Date.now()) throw new Error("Invite is invalid or expired");
    const existing = await ctx.db.query("memberships").withIndex("by_stay_user", (query) => query.eq("stayId", invite.stayId).eq("userId", user._id)).unique();
    if (existing?.status === "active") throw new Error("Already a member of this stay");
    const memberCount = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", invite.stayId)).take(21);
    if (memberCount.filter((member) => member.status === "active").length >= 20) throw new Error("This stay has reached its member limit");
    const joiningStay = await ctx.db.get(invite.stayId);
    if (!joiningStay || joiningStay.status === "ended") throw new Error("Invite is invalid or expired");
    await assertPlanCapacity(ctx, joiningStay.hostUserId, "guest", joiningStay.householdAccountId);
    const now = Date.now();
    if (existing) {
      // A guest whose agreement ended can come back with a new invite.
      await ctx.db.patch(existing._id, { status: "active", joinedAt: now });
    } else {
      await ctx.db.insert("memberships", { stayId: invite.stayId, userId: user._id, role: "guest", status: "active", joinedAt: now });
    }
    await clearBlockedJoins(ctx, invite.stayId, user._id);
    const stay = await ctx.db.get(invite.stayId);
    if (!stay) throw new Error("Stay not found");
    const guestTerms = await ensureGuestTerms(ctx, invite.stayId, user._id, stay.hostUserId);
    await offerGuestAgreement(ctx, { stayId: invite.stayId, termsId: guestTerms._id, guestUserId: user._id, offeredBy: stay.hostUserId });
    await ctx.db.patch(invite._id, { usedAt: now, usedBy: user._id });
    if (stay.status === "active") {
      await scheduleSubscriptionLimitShadow(ctx, stay._id, "guest_joined", "active_guest_memberships");
    }
    await recordActivity(ctx, { stayId: invite.stayId, actorUserId: user._id, kind: "invite", action: "accepted", detail: "Guest joined the stay", entityId: invite._id });
    return invite.stayId;
  },
});
