import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { getPlanLimits, type SubscriptionPlan } from "../lib/domain/subscriptionPlans";
import { getEffectivePlanForStay } from "./lib/subscriptionAccess";

type ShadowDimension = "active_stays" | "active_guest_memberships";
type ShadowEvent = "stay_activated" | "guest_joined" | "guest_rejoined";

/** Schedule telemetry separately so its reads or failures cannot roll back a household action. */
export function scheduleSubscriptionLimitShadow(
  ctx: MutationCtx,
  stayId: Id<"stays">,
  event: ShadowEvent,
  dimension: ShadowDimension,
) {
    return ctx.scheduler.runAfter(0, internal.subscriptionShadow.recordLimitShadow, {
    stayId,
    event,
    dimension,
  });
}

/** Aggregate-only advisory telemetry. This never enforces a tier limit. */
export const recordLimitShadow = internalMutation({
  args: {
    stayId: v.id("stays"),
    event: v.union(v.literal("stay_activated"), v.literal("guest_joined"), v.literal("guest_rejoined")),
    dimension: v.union(v.literal("active_stays"), v.literal("active_guest_memberships")),
  },
  returns: v.null(),
  handler: async (ctx, { stayId, event, dimension }) => {
    try {
      const stay = await ctx.db.get(stayId);
      if (!stay) return null;

      const configuredEnvironment = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
      const expectedEnvironment = configuredEnvironment === "production" || configuredEnvironment === "sandbox"
        ? configuredEnvironment
        : undefined;
      // Missing environment configuration must not allow a non-production
      // purchase to grant access; resolve to Starter until explicitly set.
      const plan: SubscriptionPlan = expectedEnvironment
        ? (await getEffectivePlanForStay(ctx, stay, expectedEnvironment)).plan
        : "starter";
      const limit = getPlanLimits(plan)[dimension === "active_stays" ? "maxActiveStays" : "maxActiveGuests"];

      let observedCount: number | null = null;
      let scanTruncated = false;
      if (limit !== null) {
        const householdAccountId = stay.householdAccountId;
        const linkedStays = householdAccountId
          ? await ctx.db
              .query("stays")
              .withIndex("by_household_account_status", (q) =>
                q.eq("householdAccountId", householdAccountId).eq("status", "active"),
              )
              .take(51)
          : await ctx.db
              .query("stays")
              .withIndex("by_host_user_status", (q) =>
                q.eq("hostUserId", stay.hostUserId).eq("status", "active"),
              )
              .take(51);
        const legacyStays = householdAccountId
          ? await ctx.db
              .query("stays")
              .withIndex("by_host_user_status", (q) =>
                q.eq("hostUserId", stay.hostUserId).eq("status", "active"),
              )
              .take(51)
          : [];
        scanTruncated = linkedStays.length > 50 || legacyStays.length > 50;
        const householdStays = new Map([...linkedStays, ...legacyStays].map((item) => [item._id, item]));
        const activeStays = [...householdStays.values()];

        if (dimension === "active_stays") {
          observedCount = activeStays.length;
        } else {
          observedCount = 0;
          for (const activeStay of activeStays) {
            const memberships = await ctx.db
              .query("memberships")
              .withIndex("by_stay_role_status", (q) =>
                q.eq("stayId", activeStay._id).eq("role", "guest").eq("status", "active"),
              )
              .take(51);
            observedCount += memberships.length;
            scanTruncated ||= memberships.length > 50;
            // These tiers cap at five guests; beyond that, the exact count is
            // unnecessary to determine whether the commercial limit is hit.
            if (observedCount > limit) break;
          }
        }
      }

      console.info("subscription_limit_shadow", {
        event,
        plan,
        dimension,
        observedCount,
        limit,
        scanTruncated,
        wouldExceed: limit === null || observedCount === null
          ? false
          : observedCount > limit
            ? true
            : scanTruncated
              ? null
              : false,
      });
    } catch {
      // Do not surface subscription telemetry failure to hosts or guests.
      console.warn("subscription_limit_shadow_failed", { event, dimension });
    }
    return null;
  },
});
