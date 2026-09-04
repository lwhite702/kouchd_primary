import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireCurrentUser, requireHost } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { assertInvite, assertInviteHash } from "./lib/validation";

export const create = mutation({
  args: { stayId: v.id("stays"), tokenHash: v.string(), invitedEmail: v.optional(v.string()), expiresAt: v.number() },
  returns: v.id("invites"),
  handler: async (ctx, args) => {
    const { user } = await requireHost(ctx, args.stayId);
    assertInvite(args.tokenHash, args.expiresAt);
    const existing = await ctx.db.query("invites").withIndex("by_token_hash", (query) => query.eq("tokenHash", args.tokenHash)).unique();
    if (existing) throw new Error("Invite token already exists");
    const inviteId = await ctx.db.insert("invites", { ...args, createdBy: user._id, createdAt: Date.now() });
    await recordActivity(ctx, { stayId: args.stayId, actorUserId: user._id, kind: "invite", action: "created", detail: "Guest invite created", entityId: inviteId });
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
    if (existing) throw new Error("Already a member of this stay");
    const memberCount = await ctx.db.query("memberships").withIndex("by_stay", (query) => query.eq("stayId", invite.stayId)).take(3);
    if (memberCount.filter((member) => member.status === "active").length >= 2) throw new Error("This stay already has two active members");
    const now = Date.now();
    await ctx.db.insert("memberships", { stayId: invite.stayId, userId: user._id, role: "guest", status: "active", joinedAt: now });
    await ctx.db.patch(invite._id, { usedAt: now, usedBy: user._id });
    await recordActivity(ctx, { stayId: invite.stayId, actorUserId: user._id, kind: "invite", action: "accepted", detail: "Guest joined the stay", entityId: invite._id });
    return invite.stayId;
  },
});
