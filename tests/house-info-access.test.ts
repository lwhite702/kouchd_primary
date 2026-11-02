import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
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

const houseInfo = {
  wifiNetwork: "TestNet",
  wifiPassword: "test-pass",
  doorCode: "0000",
  trashDay: "Tuesday",
};

async function createActor(t: ReturnType<typeof convexTest>, subject: string) {
  const actor = t.withIdentity({ subject, name: subject });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

async function queryStayFromBoth(
  actor: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  stayId: Id<"stays">,
) {
  const bundle = await actor.query(api.stays.getBundle, { stayId });
  const list = await actor.query(api.stays.listMine, {});
  const listed = list.find((entry) => entry.stay._id === stayId);
  expect(listed).toBeDefined();
  return { bundleStay: bundle.stay, listedStay: listed!.stay };
}

describe("houseInfo access code protection", () => {
  it("hides codes from a guest who has not accepted", async () => {
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const guest = await createActor(t, "guest");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });
    const referralCode = (await host.query(api.stays.getBundle, { stayId }))
      .stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });

    const { bundleStay, listedStay } = await queryStayFromBoth(guest, stayId);
    for (const stay of [bundleStay, listedStay]) {
      expect(stay.houseInfo?.doorCode).toBeUndefined();
      expect(stay.houseInfo?.wifiPassword).toBeUndefined();
      expect(stay.houseInfo?.wifiNetwork).toBe("TestNet");
      expect(stay.houseInfo?.trashDay).toBe("Tuesday");
    }
  });

  it("shows codes after the guest accepts", async () => {
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const guest = await createActor(t, "guest");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });
    const referralCode = (await host.query(api.stays.getBundle, { stayId }))
      .stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const { bundleStay, listedStay } = await queryStayFromBoth(guest, stayId);
    for (const stay of [bundleStay, listedStay]) {
      expect(stay.houseInfo?.doorCode).toBe("0000");
      expect(stay.houseInfo?.wifiPassword).toBe("test-pass");
      expect(stay.houseInfo?.wifiNetwork).toBe("TestNet");
      expect(stay.houseInfo?.trashDay).toBe("Tuesday");
    }
  });

  it("keeps codes when a new agreement version is waiting", async () => {
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const guest = await createActor(t, "guest");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });
    const referralCode = (await host.query(api.stays.getBundle, { stayId }))
      .stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    await host.mutation(api.terms.updateCurrent, {
      stayId,
      terms: { ...terms, rateCents: 1500 },
    });

    const { bundleStay, listedStay } = await queryStayFromBoth(guest, stayId);
    for (const stay of [bundleStay, listedStay]) {
      expect(stay.status).toBe("pending");
      expect(stay.houseInfo?.doorCode).toBe("0000");
      expect(stay.houseInfo?.wifiPassword).toBe("test-pass");
    }
  });

  it("shows codes to an accepted guest while another guest has not accepted", async () => {
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const acceptedGuest = await createActor(t, "accepted-guest");
    const pendingGuest = await createActor(t, "pending-guest");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    await grantPlus(t, stayId);
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });
    const referralCode = (await host.query(api.stays.getBundle, { stayId }))
      .stay.referralCode!;
    await acceptedGuest.mutation(api.referral.joinWithCode, { referralCode });
    await pendingGuest.mutation(api.referral.joinWithCode, { referralCode });
    await acceptedGuest.mutation(api.terms.acceptCurrent, { stayId });

    const acceptedResult = await queryStayFromBoth(acceptedGuest, stayId);
    for (const stay of [acceptedResult.bundleStay, acceptedResult.listedStay]) {
      expect(stay.status).toBe("pending");
      expect(stay.houseInfo?.doorCode).toBe("0000");
      expect(stay.houseInfo?.wifiPassword).toBe("test-pass");
    }

    const pendingResult = await queryStayFromBoth(pendingGuest, stayId);
    for (const stay of [pendingResult.bundleStay, pendingResult.listedStay]) {
      expect(stay.status).toBe("pending");
      expect(stay.houseInfo?.doorCode).toBeUndefined();
      expect(stay.houseInfo?.wifiPassword).toBeUndefined();
      expect(stay.houseInfo?.wifiNetwork).toBe("TestNet");
    }
  });

  it("hides codes from an accepted guest after the stay ends", async () => {
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const guest = await createActor(t, "guest");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });
    const referralCode = (await host.query(api.stays.getBundle, { stayId }))
      .stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    await guest.mutation(api.terms.acceptCurrent, { stayId });
    await host.mutation(api.stays.end, { stayId });

    const { bundleStay, listedStay } = await queryStayFromBoth(guest, stayId);
    for (const stay of [bundleStay, listedStay]) {
      expect(stay.status).toBe("ended");
      expect(stay.houseInfo?.doorCode).toBeUndefined();
      expect(stay.houseInfo?.wifiPassword).toBeUndefined();
      expect(stay.houseInfo?.wifiNetwork).toBe("TestNet");
      expect(stay.houseInfo?.trashDay).toBe("Tuesday");
    }
  });

  it("always shows codes to the host, including after the stay ends", async () => {
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });

    const beforeEnd = await queryStayFromBoth(host, stayId);
    for (const stay of [beforeEnd.bundleStay, beforeEnd.listedStay]) {
      expect(stay.houseInfo?.doorCode).toBe("0000");
      expect(stay.houseInfo?.wifiPassword).toBe("test-pass");
    }

    await host.mutation(api.stays.end, { stayId });

    const afterEnd = await queryStayFromBoth(host, stayId);
    for (const stay of [afterEnd.bundleStay, afterEnd.listedStay]) {
      expect(stay.status).toBe("ended");
      expect(stay.houseInfo?.doorCode).toBe("0000");
      expect(stay.houseInfo?.wifiPassword).toBe("test-pass");
    }
  });

  it("returns a valid response when the stay has no houseInfo", async () => {
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const guest = await createActor(t, "guest");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    const referralCode = (await host.query(api.stays.getBundle, { stayId }))
      .stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });

    const { bundleStay, listedStay } = await queryStayFromBoth(guest, stayId);
    for (const stay of [bundleStay, listedStay]) {
      expect(stay.houseInfo).toBeUndefined();
    }
  });

  it("hides codes from a former guest who rejoins until they accept again", async () => {
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const guest = await createActor(t, "guest");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
    });
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });
    const referralCode = (await host.query(api.stays.getBundle, { stayId }))
      .stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const beforeLeave = await guest.query(api.stays.getBundle, { stayId });
    expect(beforeLeave.stay.houseInfo?.doorCode).toBe("0000");

    await t.run(async ({ db }) => {
      await db.patch(beforeLeave.membership._id, { status: "left" });
    });

    await guest.mutation(api.referral.joinWithCode, { referralCode });

    const afterRejoin = await queryStayFromBoth(guest, stayId);
    for (const stay of [afterRejoin.bundleStay, afterRejoin.listedStay]) {
      expect(stay.houseInfo?.doorCode).toBeUndefined();
      expect(stay.houseInfo?.wifiPassword).toBeUndefined();
      expect(stay.houseInfo?.wifiNetwork).toBe("TestNet");
    }

    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const afterReaccept = await queryStayFromBoth(guest, stayId);
    for (const stay of [afterReaccept.bundleStay, afterReaccept.listedStay]) {
      expect(stay.houseInfo?.doorCode).toBe("0000");
      expect(stay.houseInfo?.wifiPassword).toBe("test-pass");
    }
  });
});
