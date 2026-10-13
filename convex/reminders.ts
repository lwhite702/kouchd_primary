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

export const queueAgreementPendingReminders = internalAction({
  args: { slot: v.optional(v.union(v.literal("am"), v.literal("pm"))) },
  returns: v.number(),
  handler: async (ctx, { slot }): Promise<number> => {
    const now = Date.now();
    let cursor: string | null = null;
    let isDone = false;
    let totalScheduled = 0;
    while (!isDone) {
      const page = await ctx.runQuery(internal.notifications.agreementPendingCandidatesPage, {
        now,
        slot,
        cursor,
        pageSize: 100,
      });
      for (const candidate of page.candidates) {
        await ctx.scheduler.runAfter(totalScheduled * 25, internal.knock.deliverAgreementPending, candidate);
        totalScheduled++;
      }
      cursor = page.continueCursor;
      isDone = page.isDone;
    }
    return totalScheduled;
  },
});
