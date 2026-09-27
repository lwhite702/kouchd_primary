import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

export async function getCurrentGuestTerms(ctx: DbCtx, stayId: Id<"stays">, guestUserId: Id<"users">) {
  const guestTerms = await ctx.db
    .query("terms")
    .withIndex("by_stay_and_guest", (query) => query.eq("stayId", stayId).eq("guestUserId", guestUserId))
    .order("desc")
    .first();
  if (guestTerms) return guestTerms;

  const stay = await ctx.db.get(stayId);
  return stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
}

export async function getAcceptedGuestTerms(ctx: DbCtx, stayId: Id<"stays">, guestUserId: Id<"users">) {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_stay_user", (query) => query.eq("stayId", stayId).eq("userId", guestUserId))
    .unique();
  if (membership?.acceptedTermsId) {
    const acceptedTerms = await ctx.db.get(membership.acceptedTermsId);
    if (acceptedTerms) return acceptedTerms;
  }

  const stay = await ctx.db.get(stayId);
  return stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
}

export async function ensureGuestTerms(
  ctx: MutationCtx,
  stayId: Id<"stays">,
  guestUserId: Id<"users">,
  createdBy: Id<"users">,
) {
  const existing = await ctx.db
    .query("terms")
    .withIndex("by_stay_and_guest", (query) => query.eq("stayId", stayId).eq("guestUserId", guestUserId))
    .order("desc")
    .first();
  if (existing) return existing;

  const stay = await ctx.db.get(stayId);
  const defaults = stay?.currentTermsId ? await ctx.db.get(stay.currentTermsId) : null;
  if (!stay || !defaults) throw new Error("Household terms are not available");

  const defaultsFields = {
    stayId: defaults.stayId,
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    cadence: defaults.cadence,
    rateCents: defaults.rateCents,
    earlyDiscountPercentage: defaults.earlyDiscountPercentage,
    earlyDiscountDays: defaults.earlyDiscountDays,
    lateFeeCents: defaults.lateFeeCents,
    graceDays: defaults.graceDays,
    houseNotes: defaults.houseNotes,
    ...(defaults.earlyDiscountEnabled !== undefined ? { earlyDiscountEnabled: defaults.earlyDiscountEnabled } : {}),
    ...(defaults.lateFeeEnabled !== undefined ? { lateFeeEnabled: defaults.lateFeeEnabled } : {}),
    ...(defaults.houseRules !== undefined ? { houseRules: defaults.houseRules } : {}),
    ...(defaults.rewards !== undefined ? { rewards: defaults.rewards } : {}),
  };
  const termsId = await ctx.db.insert("terms", {
    ...defaultsFields,
    guestUserId,
    version: defaults.version,
    createdBy,
    createdAt: Date.now(),
  });
  const terms = await ctx.db.get(termsId);
  if (!terms) throw new Error("Could not create guest agreement");
  return terms;
}
