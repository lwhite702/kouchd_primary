import { v } from "convex/values";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/auth";
import { FEATURE_FLAGS_REGISTRY } from "../lib/flags/config";

type AppCtx = QueryCtx | MutationCtx;

/**
 * Server-side helper to determine if a feature flag is enabled in Convex.
 * Checks database-level platform overrides first. If no override exists (or is set to "default"),
 * falls back to the code default defined in FEATURE_FLAGS_REGISTRY.
 */
export async function isFeatureEnabled(
  ctx: AppCtx,
  key: string,
  fallbackDefault?: boolean
): Promise<boolean> {
  const existing = await ctx.db
    .query("featureFlags")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (existing) {
    if (existing.override === "enabled") return true;
    if (existing.override === "disabled") return false;
  }

  if (fallbackDefault !== undefined) {
    return fallbackDefault;
  }

  const meta = (FEATURE_FLAGS_REGISTRY as Record<string, { defaultValue: boolean }>)[key];
  return meta?.defaultValue ?? true;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("featureFlags").collect();
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    const enabled = await isFeatureEnabled(ctx, args.key);
    return {
      key: args.key,
      override: record?.override ?? "default",
      enabled,
      note: record?.note,
      updatedAt: record?.updatedAt,
    };
  },
});

export const setOverride = mutation({
  args: {
    key: v.string(),
    override: v.union(v.literal("enabled"), v.literal("disabled"), v.literal("default")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requirePlatformAdmin(ctx);

    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    const now = Date.now();

    if (args.override === "default" && existing) {
      await ctx.db.delete(existing._id);
      return { success: true, action: "removed", key: args.key };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        override: args.override,
        note: args.note,
        updatedByUserId: user._id,
        updatedAt: now,
      });
      return { success: true, action: "updated", key: args.key, override: args.override };
    }

    if (args.override !== "default") {
      await ctx.db.insert("featureFlags", {
        key: args.key,
        override: args.override,
        note: args.note,
        updatedByUserId: user._id,
        updatedAt: now,
      });
    }

    return { success: true, action: "created", key: args.key, override: args.override };
  },
});

export const resetOverrides = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);

    const all = await ctx.db.query("featureFlags").collect();
    for (const record of all) {
      await ctx.db.delete(record._id);
    }

    return { success: true, cleared: all.length };
  },
});
