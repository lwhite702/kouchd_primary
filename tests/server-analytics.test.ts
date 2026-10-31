import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const terms = {
  startDate: "2026-09-01",
  endDate: "2026-09-21",
  cadence: "weekly" as const,
  paymentDayOfWeek: 1,
  rateCents: 20_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Quiet after 10:30 PM.",
};

type Capture = { distinctId: string; event: string; properties: Record<string, unknown>; stayId?: string };

async function captures(t: ReturnType<typeof convexTest>): Promise<Capture[]> {
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  return scheduled
    .filter((job) => job.name.includes("posthog"))
    .map((job) => job.args[0] as Capture);
}

describe("server funnel events", () => {
  it("sends one sign-up per new account, keyed by the Clerk user ID", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "user_host_1", name: "Host", email: "host@example.com" });
    await host.mutation(api.users.syncCurrent, {});
    await host.mutation(api.users.syncCurrent, {});

    const signUps = (await captures(t)).filter((c) => c.event === "user_signed_up");
    expect(signUps).toEqual([
      { distinctId: "user_host_1", event: "user_signed_up", properties: { meta_event_id: "signup_user_host_1" } },
    ]);
  });

  it("sends stay_created with IDs and terms only, grouped by stay", async () => {
    const t = convexTest(schema, modules);
    const host = t.withIdentity({ subject: "user_host_2", name: "Host", email: "host2@example.com" });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, { name: "Maple Street", timezone: "America/New_York", terms });

    const created = (await captures(t)).find((c) => c.event === "stay_created");
    expect(created).toEqual({
      distinctId: "user_host_2",
      event: "stay_created",
      properties: { stayId, cadence: "weekly", rateCents: 20_000 },
      stayId,
    });
    expect(JSON.stringify(created)).not.toContain("Maple Street");
  });
});
