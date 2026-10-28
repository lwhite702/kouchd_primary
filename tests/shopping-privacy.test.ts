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

async function household() {
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
  return { host, owner, other, stayId };
}

describe("personal shopping items", () => {
  it("are visible and editable only by their creator, hosts included", async () => {
    const { host, owner, other, stayId } = await household();
    const itemId = await owner.mutation(api.shopping.create, {
      stayId,
      title: "Private medication",
      quantity: "1",
      note: "Private note",
      visibility: "personal",
    });

    const ownerList = await owner.query(api.shopping.list, { stayId });
    expect(ownerList.map((item) => item._id)).toContain(itemId);
    for (const viewer of [host, other]) {
      expect(
        JSON.stringify(await viewer.query(api.shopping.list, { stayId })),
      ).not.toContain("Private medication");
      await expect(
        viewer.mutation(api.shopping.toggle, { itemId }),
      ).rejects.toThrow("Shopping item not found");
      await expect(
        viewer.mutation(api.shopping.remove, { itemId }),
      ).rejects.toThrow("Shopping item not found");
      await expect(
        viewer.mutation(api.shopping.update, {
          itemId,
          title: "Renamed",
          quantity: "1",
          note: "",
          visibility: "shared",
        }),
      ).rejects.toThrow("Shopping item not found");
    }
  });

  it("only lets the creator make a shared item personal", async () => {
    const { host, owner, stayId } = await household();
    const itemId = await owner.mutation(api.shopping.create, {
      stayId,
      title: "Dish soap",
      quantity: "1",
      note: "",
      visibility: "shared",
    });
    await expect(
      host.mutation(api.shopping.update, {
        itemId,
        title: "Dish soap",
        quantity: "1",
        note: "",
        visibility: "personal",
      }),
    ).rejects.toThrow("Only the person who added this item can make it personal");
    await host.mutation(api.shopping.update, {
      itemId,
      title: "Dish soap",
      quantity: "2",
      note: "",
      visibility: "shared",
    });
    expect(
      (await owner.query(api.shopping.list, { stayId })).find(
        (item) => item._id === itemId,
      )?.quantity,
    ).toBe("2");
  });

  it("keep personal item names out of everyone else's activity feed, hosts included", async () => {
    const { host, owner, other, stayId } = await household();
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
    await owner.mutation(api.shopping.toggle, { itemId });
    await owner.mutation(api.shopping.remove, { itemId });

    for (const viewer of [host, other]) {
      expect(
        JSON.stringify(await viewer.query(api.activity.list, { stayId })),
      ).not.toContain("Private medication");
      const page = await viewer.query(api.activity.page, {
        stayId,
        paginationOpts: { cursor: null, numItems: 50 },
      });
      expect(JSON.stringify(page.page)).not.toContain("Private medication");
    }
    expect(
      (await owner.query(api.activity.list, { stayId })).filter(
        (row) => row.kind === "shopping",
      ),
    ).toHaveLength(4);
  });

  it("still shows shared item activity to the whole household", async () => {
    const { host, owner, other, stayId } = await household();
    await owner.mutation(api.shopping.create, {
      stayId,
      title: "Paper towels",
      quantity: "1",
      note: "",
      visibility: "shared",
    });
    for (const viewer of [host, owner, other]) {
      expect(
        JSON.stringify(await viewer.query(api.activity.list, { stayId })),
      ).toContain("Paper towels");
    }
  });

  it("pages host activity without repeating rows", async () => {
    const { host, owner, stayId } = await household();
    for (const title of ["Rice", "Beans", "Salt"]) {
      await owner.mutation(api.shopping.create, {
        stayId,
        title,
        quantity: "1",
        note: "",
        visibility: "shared",
      });
    }
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
  });
});
