import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { getOrCreateHouseholdAccount } from "./householdOwnership";

const BATCH_SIZE = 100;

/**
 * Idempotently associates legacy stays with their host's household account.
 * Invoke again with the returned cursor until `done` is true. Existing linked
 * stays and all membership, terms, financial, reward, chore, and activity data
 * are left untouched.
 */
export const backfillHouseholdAccounts = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    cursor: v.union(v.string(), v.null()),
    done: v.boolean(),
    linked: v.number(),
    alreadyLinked: v.number(),
  }),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("stays").paginate({
      numItems: BATCH_SIZE,
      cursor: cursor ?? null,
    });

    let linked = 0;
    let alreadyLinked = 0;
    for (const stay of page.page) {
      if (stay.householdAccountId) {
        const account = await ctx.db.get(stay.householdAccountId);
        if (!account || account.ownerUserId !== stay.hostUserId) {
          throw new Error(`Household account ownership mismatch for stay ${stay._id}`);
        }
        alreadyLinked += 1;
        continue;
      }
      const householdAccountId = await getOrCreateHouseholdAccount(ctx, stay.hostUserId);
      await ctx.db.patch(stay._id, { householdAccountId });
      linked += 1;
    }

    return {
      cursor: page.isDone ? null : page.continueCursor,
      done: page.isDone,
      linked,
      alreadyLinked,
    };
  },
});

/**
 * Audits a bounded page of stay ownership links without returning record IDs.
 * Continue with the returned cursor until `done` is true, summing the counts
 * across pages for the complete migration reconciliation.
 */
export const auditHouseholdAccounts = internalQuery({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    cursor: v.union(v.string(), v.null()),
    done: v.boolean(),
    scanned: v.number(),
    missingLinks: v.number(),
    ownerMismatches: v.number(),
  }),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("stays").paginate({
      numItems: BATCH_SIZE,
      cursor: cursor ?? null,
    });

    let missingLinks = 0;
    let ownerMismatches = 0;
    for (const stay of page.page) {
      if (!stay.householdAccountId) {
        missingLinks += 1;
        continue;
      }
      const account = await ctx.db.get(stay.householdAccountId);
      if (!account || account.ownerUserId !== stay.hostUserId) ownerMismatches += 1;
    }

    return {
      cursor: page.isDone ? null : page.continueCursor,
      done: page.isDone,
      scanned: page.page.length,
      missingLinks,
      ownerMismatches,
    };
  },
});
