"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

export const queueDailyReminders = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const now = Date.now();
    const candidates: Array<{
      userId: Id<"users">;
      stayId: Id<"stays">;
      workflow: string;
      entityId: string;
      data: Record<string, unknown>;
    }> = await ctx.runQuery(internal.notifications.reminderCandidates, { now });
    for (const [index, candidate] of candidates.entries()) {
      await ctx.scheduler.runAfter(index * 25, internal.knock.triggerWorkflow, candidate);
    }
    return candidates.length;
  },
});
