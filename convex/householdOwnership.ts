import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/**
 * Returns the billing/ownership account for a Kouchd user, creating it once if
 * needed. Callers must pass the authenticated host's user ID, never a guest ID.
 */
export async function getOrCreateHouseholdAccount(
  ctx: MutationCtx,
  ownerUserId: Id<"users">,
) {
  const existing = await ctx.db
    .query("householdAccounts")
    .withIndex("by_owner_user_id", (query) => query.eq("ownerUserId", ownerUserId))
    .unique();
  if (existing) return existing._id;

  const now = Date.now();
  return await ctx.db.insert("householdAccounts", {
    ownerUserId,
    createdAt: now,
    updatedAt: now,
  });
}
