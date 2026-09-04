import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

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
  returns: v.union(v.null(), v.object({ id: v.id("users"), name: v.string(), email: v.optional(v.string()), imageUrl: v.optional(v.string()) })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", identity.subject)).unique();
    return user ? { id: user._id, name: user.name, email: user.email, imageUrl: user.imageUrl } : null;
  },
});
