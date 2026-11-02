import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { grantPlus } from "./helpers/plans";

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

async function createHousehold() {
  const t = convexTest(schema, modules);
  const actors = ["host", "guest1", "guest2"].map((subject) =>
    t.withIdentity({ subject, name: subject }),
  );
  for (const actor of actors) await actor.mutation(api.users.syncCurrent, {});
  const [host, guest1, guest2] = actors;

  const stayId = await host.mutation(api.stays.create, {
    timezone: "UTC",
    terms,
  });
  await grantPlus(t, stayId);

  const referralCode = (await host.query(api.stays.getBundle, { stayId }))
    .stay.referralCode!;
  await guest1.mutation(api.referral.joinWithCode, { referralCode });
  await guest2.mutation(api.referral.joinWithCode, { referralCode });

  const guest1Bundle = await guest1.query(api.stays.getBundle, { stayId });
  const guest1UserId = guest1Bundle.membership.userId;

  return { host, guest1, guest2, stayId, guest1UserId };
}

describe("shopping list to contribution ledger bridge (WRE-264)", () => {
  it("allows checking off a shared shopping item and recording a grocery contribution", async () => {
    const { host, guest1, guest2, stayId, guest1UserId } = await createHousehold();

    // 1. Guest 1 creates a shared shopping item
    const itemId = await guest1.mutation(api.shopping.create, {
      stayId,
      title: "Dish soap",
      quantity: "2 bottles",
      note: "Unscented citrus",
      visibility: "shared",
    });

    // 2. Guest 1 purchases the item and checks it off
    await guest1.mutation(api.shopping.toggle, { itemId });

    const items = await guest1.query(api.shopping.list, { stayId });
    const item = items.find((i) => i._id === itemId);
    expect(item?.checkedAt).toBeDefined();

    // 3. Guest 1 logs the contribution into the ledger
    const prefillNote = `${item?.title} (${item?.quantity}) · ${item?.note}`;
    const contributionId = await guest1.mutation(api.contributions.create, {
      stayId,
      guestUserId: guest1UserId,
      type: "groceries",
      amountCents: 1250, // $12.50
      date: "2026-10-15",
      note: prefillNote,
      countsTowardBalance: true,
    });

    expect(contributionId).toBeDefined();

    // 4. Verify bilateral privacy: Guest 1 and Host can see the contribution; Guest 2 cannot
    const guest1Contributions = await guest1.query(api.contributions.list, {
      stayId,
      guestUserId: guest1UserId,
    });
    expect(guest1Contributions).toHaveLength(1);
    expect(guest1Contributions[0].note).toBe(prefillNote);
    expect(guest1Contributions[0].type).toBe("groceries");
    expect(guest1Contributions[0].amountCents).toBe(1250);

    const hostContributions = await host.query(api.contributions.list, {
      stayId,
      guestUserId: guest1UserId,
    });
    expect(hostContributions).toHaveLength(1);
    expect(hostContributions[0].amountCents).toBe(1250);

    // Guest 2 querying Guest 1's financial summary is rejected by server privacy
    await expect(
      guest2.query(api.contributions.list, {
        stayId,
        guestUserId: guest1UserId,
      }),
    ).rejects.toThrow();
  });
});
