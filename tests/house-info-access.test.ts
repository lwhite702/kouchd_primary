import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { canViewAccessCodes, redactStayForMember } from "../convex/lib/houseInfoAccess";
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
  afterEach(() => {
    vi.useRealTimers();
  });

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
    // Nothing was configured, so nothing was withheld.
    expect((await guest.query(api.stays.getBundle, { stayId })).accessCodesHidden).toBeNull();
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

    expect((await guest.query(api.stays.getBundle, { stayId })).accessCodesHidden).toBe("needs_acceptance");
    const afterRejoin = await queryStayFromBoth(guest, stayId);
    for (const stay of [afterRejoin.bundleStay, afterRejoin.listedStay]) {
      expect(stay.houseInfo?.doorCode).toBeUndefined();
      expect(stay.houseInfo?.wifiPassword).toBeUndefined();
      expect(stay.houseInfo?.wifiNetwork).toBe("TestNet");
    }

    await guest.mutation(api.terms.acceptCurrent, { stayId });

    expect((await guest.query(api.stays.getBundle, { stayId })).accessCodesHidden).toBeNull();
    const afterReaccept = await queryStayFromBoth(guest, stayId);
    for (const stay of [afterReaccept.bundleStay, afterReaccept.listedStay]) {
      expect(stay.houseInfo?.doorCode).toBe("0000");
      expect(stay.houseInfo?.wifiPassword).toBe("test-pass");
    }
  });

  it("retires the earlier schedule when a rejoining guest accepts, even with a pending revision", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
    const t = convexTest(schema, modules);
    const host = await createActor(t, "host");
    const guest = await createActor(t, "guest");
    const stayId = await host.mutation(api.stays.create, { timezone: "UTC", terms });
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });
    const referralCode = (await host.query(api.stays.getBundle, { stayId })).stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    await guest.mutation(api.terms.acceptCurrent, { stayId });
    const membershipId = (await guest.query(api.stays.getBundle, { stayId })).membership._id;

    // A revision is offered but not accepted before the guest leaves.
    await host.mutation(api.terms.updateCurrent, { stayId, terms: { ...terms, rateCents: 1500 } });
    await t.run(async ({ db }) => {
      await db.patch(membershipId, { status: "left" });
    });

    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    const rejoined = await guest.query(api.stays.getBundle, { stayId });
    expect(rejoined.membership.acceptedTermsId).toBeDefined();
    expect(rejoined.terms?.rateCents).toBe(1500);
    expect(rejoined.terms?.effectiveFrom).toBe("2026-10-15");
    expect(rejoined.accessCodesHidden).toBe("needs_acceptance");

    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const active = await t.run(async ({ db }) =>
      (await db.query("obligations").collect()).filter(
        (obligation) => obligation.type === "cadence" && obligation.voidedAt === undefined,
      ),
    );
    const starts = active.map((obligation) => obligation.periodStart);
    expect(new Set(starts).size).toBe(starts.length);
    const fromRejoin = active.filter((obligation) => obligation.periodStart >= "2026-10-15");
    expect(fromRejoin.every((obligation) => obligation.termsId === rejoined.terms?._id)).toBe(true);
    expect((await guest.query(api.stays.getBundle, { stayId })).accessCodesHidden).toBeNull();
  });

  it("redacts sublease doorCode and wifiPassword after the agreement endDate while leaving home_stay unaffected", () => {
    const subleaseStay = {
      status: "active" as const,
      arrangement: "sublease" as const,
      timezone: "UTC",
      houseInfo,
    };
    const homeStay = {
      status: "active" as const,
      arrangement: "home_stay" as const,
      timezone: "UTC",
      houseInfo,
    };
    const acceptedGuestMembership = {
      role: "guest" as const,
      acceptedTermsId: "terms_1" as Id<"terms">,
    };
    const hostMembership = {
      role: "host" as const,
      acceptedTermsId: "terms_1" as Id<"terms">,
    };

    // On or before the sublease end date, accepted guest sees access codes
    expect(
      canViewAccessCodes(subleaseStay, acceptedGuestMembership, {
        termsEndDate: "2026-11-30",
        currentDate: "2026-11-30",
      }),
    ).toBe(true);
    const activeRedacted = redactStayForMember(subleaseStay, acceptedGuestMembership, {
      termsEndDate: "2026-11-30",
      currentDate: "2026-11-30",
    });
    expect(activeRedacted.houseInfo?.doorCode).toBe("0000");
    expect(activeRedacted.houseInfo?.wifiPassword).toBe("test-pass");

    // After the sublease end date, accepted guest loses access codes
    expect(
      canViewAccessCodes(subleaseStay, acceptedGuestMembership, {
        termsEndDate: "2026-11-30",
        currentDate: "2026-12-01",
      }),
    ).toBe(false);
    const expiredRedacted = redactStayForMember(subleaseStay, acceptedGuestMembership, {
      termsEndDate: "2026-11-30",
      currentDate: "2026-12-01",
    });
    expect(expiredRedacted.houseInfo?.doorCode).toBeUndefined();
    expect(expiredRedacted.houseInfo?.wifiPassword).toBeUndefined();
    expect(expiredRedacted.houseInfo?.wifiNetwork).toBe("TestNet");

    // Host still sees codes after sublease end date
    expect(
      canViewAccessCodes(subleaseStay, hostMembership, {
        termsEndDate: "2026-11-30",
        currentDate: "2026-12-01",
      }),
    ).toBe(true);

    // Home stay is unaffected by termsEndDate passing
    expect(
      canViewAccessCodes(homeStay, acceptedGuestMembership, {
        termsEndDate: "2026-11-30",
        currentDate: "2026-12-01",
      }),
    ).toBe(true);
    const homeRedacted = redactStayForMember(homeStay, acceptedGuestMembership, {
      termsEndDate: "2026-11-30",
      currentDate: "2026-12-01",
    });
    expect(homeRedacted.houseInfo?.doorCode).toBe("0000");
    expect(homeRedacted.houseInfo?.wifiPassword).toBe("test-pass");
  });
});
