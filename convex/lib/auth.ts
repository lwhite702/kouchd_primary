import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AppCtx = QueryCtx | MutationCtx;

export async function requireCurrentUser(ctx: AppCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", identity.subject))
    .unique();
  if (!user) throw new Error("User profile is not synced");
  return user;
}

export async function requireMembership(ctx: AppCtx, stayId: Id<"stays">) {
  const user = await requireCurrentUser(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", user._id))
    .unique();
  if (!membership || membership.status !== "active") throw new Error("Not authorized for this stay");
  return { user, membership };
}

export async function requireHost(ctx: AppCtx, stayId: Id<"stays">) {
  const result = await requireMembership(ctx, stayId);
  if (result.membership.role !== "host") throw new Error("Host access required");
  return result;
}
