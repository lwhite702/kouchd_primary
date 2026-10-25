import { v } from "convex/values";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { recordPlatformAuditLog, requireAuditReason, requirePlatformAdmin } from "./lib/auth";
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
    const rows = await ctx.db.query("featureFlags").collect();
    let isAdmin = false;
    try {
      await requirePlatformAdmin(ctx);
      isAdmin = true;
    } catch {
      isAdmin = false;
    }

    if (isAdmin) {
      return rows;
    }

    return rows.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      key: row.key,
      override: row.override,
      updatedAt: row.updatedAt,
    }));
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
      updatedAt: record?.updatedAt,
    };
  },
});

export const setOverride = mutation({
  args: {
    key: v.string(),
    override: v.union(v.literal("enabled"), v.literal("disabled"), v.literal("default")),
    note: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requirePlatformAdmin(ctx);
    const rawReason = args.reason !== undefined ? args.reason : (args.note ?? `Feature flag ${args.key} set to ${args.override}`);
    const auditReason = requireAuditReason(rawReason);

    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    const now = Date.now();
    const previousOverride = existing?.override ?? "default";

    if (args.override === "default" && existing) {
      await ctx.db.delete(existing._id);
      await recordPlatformAuditLog(ctx, {
        actorUser: user,
        actorEmail: user.email ?? identity.email,
        action: "feature_flag.override_removed",
        provider: "convex",
        targetType: "feature_flag",
        targetId: args.key,
        reason: auditReason,
        metadata: {
          key: args.key,
          previousOverride,
          newOverride: "default",
        },
      });
      return { success: true, action: "removed", key: args.key };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        override: args.override,
        note: args.note ?? auditReason,
        updatedByUserId: user._id,
        updatedAt: now,
      });
      await recordPlatformAuditLog(ctx, {
        actorUser: user,
        actorEmail: user.email ?? identity.email,
        action: "feature_flag.override_updated",
        provider: "convex",
        targetType: "feature_flag",
        targetId: args.key,
        reason: auditReason,
        metadata: {
          key: args.key,
          previousOverride,
          newOverride: args.override,
        },
      });
      return { success: true, action: "updated", key: args.key, override: args.override };
    }

    if (args.override !== "default") {
      await ctx.db.insert("featureFlags", {
        key: args.key,
        override: args.override,
        note: args.note ?? auditReason,
        updatedByUserId: user._id,
        updatedAt: now,
      });
      await recordPlatformAuditLog(ctx, {
        actorUser: user,
        actorEmail: user.email ?? identity.email,
        action: "feature_flag.override_created",
        provider: "convex",
        targetType: "feature_flag",
        targetId: args.key,
        reason: auditReason,
        metadata: {
          key: args.key,
          previousOverride: "default",
          newOverride: args.override,
        },
      });
    }

    return { success: true, action: "created", key: args.key, override: args.override };
  },
});

export const resetOverrides = mutation({
  args: {
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requirePlatformAdmin(ctx);
    const rawReason = args.reason !== undefined ? args.reason : "All feature flag overrides reset to code defaults";
    const auditReason = requireAuditReason(rawReason);

    const all = await ctx.db.query("featureFlags").collect();
    for (const record of all) {
      await ctx.db.delete(record._id);
    }

    await recordPlatformAuditLog(ctx, {
      actorUser: user,
      actorEmail: user.email ?? identity.email,
      action: "feature_flag.overrides_reset",
      provider: "convex",
      targetType: "feature_flag",
      targetId: "all",
      reason: auditReason,
      metadata: {
        clearedCount: all.length,
      },
    });

    return { success: true, cleared: all.length };
  },
});
