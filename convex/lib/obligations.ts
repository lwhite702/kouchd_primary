import { buildObligationPeriods } from "../../lib/domain/obligations";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { recordActivity } from "./activity";

export async function listActiveGuestObligations(
  ctx: MutationCtx | QueryCtx,
  stayId: Id<"stays">,
  guestUserId: Id<"users"> | undefined,
) {
  // The active-row index keeps voided history out of the scan, so the bounded
  // read is not truncated by years of superseded schedule obligations.
  return ctx.db.query("obligations")
    .withIndex("by_stay_guest_and_voided", (query) => query
      .eq("stayId", stayId)
      .eq("guestUserId", guestUserId)
      .eq("voidedAt", undefined))
    .take(1_000);
}

export async function ensureObligationsForTerms(
  ctx: MutationCtx,
  stayId: Id<"stays">,
  termsId: Id<"terms">,
  guestUserId: Id<"users">,
  actorUserId: Id<"users">,
) {
  const existing = await ctx.db
    .query("obligations")
    .withIndex("by_terms_and_guest", (query) => query.eq("termsId", termsId).eq("guestUserId", guestUserId))
    .take(1);
  if (existing.length > 0) return;

  const terms = await ctx.db.get(termsId);
  if (!terms || terms.stayId !== stayId) throw new Error("Terms not found for this stay");
  if (terms.billingBasis === "occupied_nights") return;

  const createdAt = Date.now();
  const effectiveStart = terms.effectiveFrom && terms.effectiveFrom > terms.startDate
    ? terms.effectiveFrom
    : terms.startDate;
  const periods = buildObligationPeriods({ ...terms, startDate: effectiveStart });
  for (const period of periods) {
    await ctx.db.insert("obligations", {
      stayId,
      termsId,
      guestUserId,
      type: "cadence",
      ...period,
      createdAt,
    });
  }

  await recordActivity(ctx, {
    stayId,
    actorUserId,
    guestUserId,
    kind: "obligation",
    action: "generated",
    detail: `${periods.length} contribution obligation${periods.length === 1 ? "" : "s"} created`,
    entityId: termsId,
  });
}
