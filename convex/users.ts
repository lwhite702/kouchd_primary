import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { assertPhone } from "./lib/validation";

export const syncCurrent = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", identity.subject))
      .unique();
    const name = identity.name ?? identity.nickname ?? "Kouchd member";
    const email = identity.email;
    const imageUrl = identity.pictureUrl;
    if (existing) {
      await ctx.db.patch(existing._id, { name, email, imageUrl, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("users", { clerkUserId: identity.subject, name, email, imageUrl, createdAt: now, updatedAt: now });
  },
});

export const viewer = query({
  args: {},
  returns: v.union(v.null(), v.object({ id: v.id("users"), name: v.string(), email: v.optional(v.string()), phone: v.optional(v.string()), imageUrl: v.optional(v.string()), notifyEmail: v.boolean(), notifySms: v.boolean() })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", identity.subject)).unique();
    return user ? { id: user._id, name: user.name, email: user.email, phone: user.phone, imageUrl: user.imageUrl, notifyEmail: user.notifyEmail ?? true, notifySms: user.notifySms ?? false } : null;
  },
});

export const updatePreferences = mutation({
  args: { phone: v.optional(v.string()), notifyEmail: v.boolean(), notifySms: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const phone = args.phone?.trim() || undefined;
    assertPhone(phone);
    if (args.notifySms && !phone) throw new Error("Add a phone number before enabling SMS reminders");
    await ctx.db.patch(user._id, { phone, notifyEmail: args.notifyEmail, notifySms: args.notifySms, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.knock.identifyUser, { userId: user._id });
    return null;
  },
});
