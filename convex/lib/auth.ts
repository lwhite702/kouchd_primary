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

export async function resolveFinancialGuest(
  ctx: AppCtx,
  stayId: Id<"stays">,
  requestedGuestUserId?: Id<"users">,
) {
  const result = await requireMembership(ctx, stayId);
  if (result.membership.role === "guest") {
    if (requestedGuestUserId && requestedGuestUserId !== result.user._id) {
      throw new Error("Guests cannot access another guest's financial record");
    }
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_stay_role_status", (query) => query.eq("stayId", stayId).eq("role", "guest").eq("status", "active"))
      .take(2);
    const guestCount = memberships.filter((membership) => membership.status === "active" && membership.role === "guest").length;
    return { ...result, guestUserId: result.user._id, includeLegacyUnscoped: guestCount === 1 };
  }

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_stay_role_status", (query) => query.eq("stayId", stayId).eq("role", "guest").eq("status", "active"))
    .take(2);
  const guests = memberships.filter((membership) => membership.status === "active" && membership.role === "guest");
  const target = requestedGuestUserId ?? (guests.length === 1 ? guests[0]?.userId : undefined);
  if (!target) {
    if (guests.length === 0) return { ...result, guestUserId: undefined, includeLegacyUnscoped: false };
    throw new Error("Choose a guest to view financial records");
  }
  const targetMembership = await ctx.db.query("memberships")
    .withIndex("by_stay_user", query => query.eq("stayId", stayId).eq("userId", target)).unique();
  if (!targetMembership || targetMembership.role !== "guest" || targetMembership.status !== "active") {
    throw new Error("Guest is not an active member of this stay");
  }
  return { ...result, guestUserId: target, includeLegacyUnscoped: guests.length === 1 };
}

export async function requirePlatformAdmin(ctx: AppCtx) {
  const user = await requireCurrentUser(ctx);
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const adminUserIds = (process.env.PLATFORM_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const email = (user.email ?? identity.email)?.toLowerCase();
  const hasEmailMatch = email ? adminEmails.includes(email) : false;
  const hasIdMatch = adminUserIds.includes(user.clerkUserId) || adminUserIds.includes(identity.subject);
  const isDbAdmin = Boolean(user.isAdmin);

  if (!hasEmailMatch && !hasIdMatch && !isDbAdmin) {
    throw new Error("Unauthorized: Platform admin grant required");
  }

  return { user, identity };
}
