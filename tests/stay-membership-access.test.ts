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
  houseNotes: "Private notes.",
};

async function signIn(t: ReturnType<typeof convexTest>, subject: string, name: string) {
  const actor = t.withIdentity({ subject, name, email: `${subject}@example.com` });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

// The web app picks the stay from ?stayId=…, so the server must refuse anyone who is not in it.
describe("stay data requires membership", () => {
  it("refuses a signed-in non-member who passes another household's stayId", async () => {
    const t = convexTest(schema, modules);
    const host = await signIn(t, "owner-host", "Owner Host");
    const outsider = await signIn(t, "outsider", "Outsider");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms });

    await expect(host.query(api.stays.getBundle, { stayId })).resolves.toBeDefined();

    await expect(outsider.query(api.stays.getBundle, { stayId })).rejects.toThrow();
    await expect(outsider.query(api.chores.list, { stayId })).rejects.toThrow();
    await expect(outsider.query(api.shopping.list, { stayId })).rejects.toThrow();
  });

  it("refuses a signed-out caller", async () => {
    const t = convexTest(schema, modules);
    const host = await signIn(t, "owner-host-2", "Owner Host");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms });

    await expect(t.query(api.stays.getBundle, { stayId })).rejects.toThrow();
  });
});
