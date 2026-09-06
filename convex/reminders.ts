"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

export const queueDailyReminders = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const today = new Date().toISOString().slice(0, 10);
    const target = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const candidates: Array<{
      userId: Id<"users">;
      stayId: Id<"stays">;
      workflow: string;
      entityId: string;
      data: Record<string, unknown>;
    }> = await ctx.runQuery(internal.notifications.reminderCandidates, { targetDate: target, choreDate: today });
    for (const [index, candidate] of candidates.entries()) {
      await ctx.scheduler.runAfter(index * 25, internal.knock.triggerWorkflow, candidate);
    }
    return candidates.length;
  },
});
