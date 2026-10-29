import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import schema from "./schema";

import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireMembership } from "./lib/auth";

const activityRecord = v.object({ ...schema.tables.activity.validator.fields, _id: v.id("activity"), _creationTime: v.number() });

/** Personal shopping rows carry their creator in guestUserId and stay private to them, hosts included. */
function canSee(item: Doc<"activity">, userId: Id<"users">, isHost: boolean) {
  if (item.kind === "shopping" && item.guestUserId) return item.guestUserId === userId;
  if (isHost) return true;
  return item.guestUserId === userId || (!item.guestUserId && item.kind !== "contribution" && item.kind !== "obligation");
}

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(activityRecord),
  handler: async (ctx, { stayId }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const items = await ctx.db.query("activity").withIndex("by_stay_created_at", (query) => query.eq("stayId", stayId)).order("desc").take(200);
    return items.filter((item) => canSee(item, user._id, membership.role === "host")).slice(0, 100);
  },
});

/** Additive bounded history endpoint; existing clients retain the list contract. */
export const page = query({
  args: { stayId: v.id("stays"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(activityRecord),
  handler: async (ctx, { stayId, paginationOpts }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const result = await ctx.db.query("activity").withIndex("by_stay_created_at", q => q.eq("stayId", stayId)).order("desc")
      .paginate({ ...paginationOpts, numItems: Math.min(50, Math.max(1, Math.floor(paginationOpts.numItems))), maximumRowsRead: 200, maximumBytesRead: 1_000_000 });
    return { ...result, page: result.page.filter(item => canSee(item, user._id, membership.role === "host")) };
  },
});
