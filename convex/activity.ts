import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireMembership } from "./lib/auth";

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId }) => {
    await requireMembership(ctx, stayId);
    return await ctx.db.query("activity").withIndex("by_stay_created_at", (query) => query.eq("stayId", stayId)).order("desc").take(100);
  },
});
