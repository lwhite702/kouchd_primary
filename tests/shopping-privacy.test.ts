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
  startDate: "2026-10-01",
  endDate: "2026-11-01",
  cadence: "daily" as const,
  rateCents: 1000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Welcome",
};

describe("personal shopping activity", () => {
  it("keeps personal item names out of another guest's feed for creation, updates, completion and removal", async () => {
    const t = convexTest(schema, modules);
    const actors = ["host", "owner", "other"].map((subject) =>
      t.withIdentity({ subject, name: subject }),
    );
    for (const actor of actors) await actor.mutation(api.users.syncCurrent, {});
    const [host, owner, other] = actors;
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    const referralCode = (await host.query(api.stays.getBundle, { stayId }))
      .stay.referralCode!;
    await owner.mutation(api.referral.joinWithCode, { referralCode });
    await other.mutation(api.referral.joinWithCode, { referralCode });
    const itemId = await owner.mutation(api.shopping.create, {
      stayId,
      title: "Private medication",
      quantity: "1",
      note: "Private note",
      visibility: "personal",
    });
    await owner.mutation(api.shopping.update, {
      itemId,
      title: "Private medication refill",
      quantity: "2",
      note: "Private note",
      visibility: "personal",
    });
    await host.mutation(api.shopping.toggle, { itemId });
    await host.mutation(api.shopping.remove, { itemId });
    expect(
      JSON.stringify(await other.query(api.activity.list, { stayId })),
    ).not.toContain("Private medication");
    const guestPage = await other.query(api.activity.page, {
      stayId,
      paginationOpts: { cursor: null, numItems: 50 },
    });
    expect(JSON.stringify(guestPage.page)).not.toContain("Private medication");
    const first = await host.query(api.activity.page, {
      stayId,
      paginationOpts: { cursor: null, numItems: 2 },
    });
    const next = await host.query(api.activity.page, {
      stayId,
      paginationOpts: { cursor: first.continueCursor, numItems: 2 },
    });
    expect(first.page).toHaveLength(2);
    expect(next.page).toHaveLength(2);
    expect(
      next.page.every(
        (row) => !first.page.some((previous) => previous._id === row._id),
      ),
    ).toBe(true);
    expect(
      (await owner.query(api.activity.list, { stayId })).filter(
        (row) => row.kind === "shopping",
      ),
    ).toHaveLength(4);
    expect(
      (await host.query(api.activity.list, { stayId })).filter(
        (row) => row.kind === "shopping",
      ),
    ).toHaveLength(4);
    await expect(
      other.mutation(api.shopping.toggle, { itemId }),
    ).rejects.toThrow();
  });
});
