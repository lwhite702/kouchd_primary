import { buildObligationPeriods } from "../../lib/domain/obligations";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { recordActivity } from "./activity";

export async function ensureObligationsForTerms(
  ctx: MutationCtx,
  stayId: Id<"stays">,
  termsId: Id<"terms">,
  actorUserId: Id<"users">,
) {
  const existing = await ctx.db
    .query("obligations")
    .withIndex("by_terms", (query) => query.eq("termsId", termsId))
    .take(1);
  if (existing.length > 0) return;

  const terms = await ctx.db.get(termsId);
  if (!terms || terms.stayId !== stayId) throw new Error("Terms not found for this stay");

  const createdAt = Date.now();
  const periods = buildObligationPeriods(terms);
  for (const period of periods) {
    await ctx.db.insert("obligations", {
      stayId,
      termsId,
      ...period,
      createdAt,
    });
  }

  await recordActivity(ctx, {
    stayId,
    actorUserId,
    kind: "obligation",
    action: "generated",
    detail: `${periods.length} contribution obligation${periods.length === 1 ? "" : "s"} created`,
    entityId: termsId,
  });
}
