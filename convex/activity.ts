import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireMembership } from "./lib/auth";

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.any()),
  handler: async (ctx, { stayId }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const items = await ctx.db.query("activity").withIndex("by_stay_created_at", (query) => query.eq("stayId", stayId)).order("desc").take(200);
    if (membership.role === "host") return items.slice(0, 100);
    return items.filter((item) => item.guestUserId === user._id || (!item.guestUserId && item.kind !== "contribution" && item.kind !== "obligation")).slice(0, 100);
  },
});
