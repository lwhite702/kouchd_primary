import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { SUGGESTED_CONTRIBUTION_TASKS } from "../lib/domain/rewards";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const terms = {
  startDate: "2026-11-03",
  endDate: "2026-11-17",
  cadence: "weekly" as const,
  rateCents: 20_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Quiet after 10 PM.",
  rewards: { enabled: true, coinName: "Coins", centsPerPoint: 100, maxCreditPerPeriodCents: 10_000 },
};

async function host(t: ReturnType<typeof convexTest>) {
  const actor = t.withIdentity({ subject: "host-1", name: "Jordan Reyes", email: "host-1@example.com" });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

async function ruleTitles(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => (await ctx.db.query("contributionRules").collect()).map((rule) => rule.title));
}

describe("stay creation reward activities", () => {
  it("seeds only the activities the host kept in setup", async () => {
    const t = convexTest(schema, modules);
    const actor = await host(t);
    const kept = SUGGESTED_CONTRIBUTION_TASKS.slice(0, 2);
    await actor.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms,
      rewardTaskIds: kept.map((task) => task.id),
    });
    expect((await ruleTitles(t)).sort()).toEqual(kept.map((task) => task.title).sort());
  });

  it("keeps every suggestion for clients that do not send a selection", async () => {
    const t = convexTest(schema, modules);
    const actor = await host(t);
    await actor.mutation(api.stays.create, { timezone: "America/New_York", terms });
    expect(await ruleTitles(t)).toHaveLength(SUGGESTED_CONTRIBUTION_TASKS.length);
  });

  it("seeds no activities when rewards are off", async () => {
    const t = convexTest(schema, modules);
    const actor = await host(t);
    await actor.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: { ...terms, rewards: { ...terms.rewards, enabled: false } },
      rewardTaskIds: [SUGGESTED_CONTRIBUTION_TASKS[0].id],
    });
    expect(await ruleTitles(t)).toEqual([]);
  });
});
