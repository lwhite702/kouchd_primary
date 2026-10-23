import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);
const terms = {
  startDate: "2026-10-22",
  endDate: "2026-11-20",
  cadence: "daily" as const,
  rateCents: 1000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Welcome.",
};
const createTestBackend = () => convexTest(schema, modules);
async function setup(override = {}) {
  const t = createTestBackend();
  const host = t.withIdentity({
    subject: "host",
    name: "Host",
    email: "host@example.com",
  });
  const guest = t.withIdentity({
    subject: "guest",
    name: "Guest",
    email: "guest@example.com",
  });
  await host.mutation(api.users.syncCurrent, {});
  await guest.mutation(api.users.syncCurrent, {});
  const stayId = await host.mutation(api.stays.create, {
    timezone: "UTC",
    terms: { ...terms, ...override },
  });
  const code = (await host.query(api.stays.getBundle, { stayId })).stay
    .referralCode!;
  await guest.mutation(api.referral.joinWithCode, { referralCode: code });
  const bundle = await guest.query(api.stays.getBundle, { stayId });
  return { t, host, guest, stayId, guestId: bundle.membership.userId, code };
}
async function latestOffer(
  t: ReturnType<typeof createTestBackend>,
  stayId: Id<"stays">,
) {
  return t.run(async ({ db }) => {
    const offer = await db
      .query("agreementOffers")
      .withIndex("by_stay_status", (q) =>
        q.eq("stayId", stayId).eq("status", "pending"),
      )
      .order("desc")
      .first();
    if (!offer) throw new Error("Missing pending offer");
    await db.patch(offer._id, { autoAcceptAt: Date.now() - 1 });
    return offer._id;
  });
}
beforeEach(() => {
  process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.SUBSCRIPTION_LIMITS_ENFORCED;
  delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
});

describe("launch agreement safeguards", () => {
  it("replaces more than 500 daily obligations without duplicates and records the system actor", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
    const f = await setup({ endDate: "2028-10-20" });
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    await f.host.mutation(api.terms.updateGuest, {
      stayId: f.stayId,
      guestUserId: f.guestId,
      terms: { ...terms, endDate: "2028-10-20", rateCents: 2000 },
    });
    const offerId = await latestOffer(f.t, f.stayId);
    await f.t.mutation(internal.terms.autoAcceptOffer, { offerId });
    await f.t.mutation(internal.terms.autoAcceptOffer, { offerId });
    const result = await f.t.run(async ({ db }) => ({
      obligations: await db.query("obligations").collect(),
      activity: await db.query("activity").collect(),
      acceptances: await db.query("termsAcceptances").collect(),
      offer: await db.get(offerId),
    }));
    const live = result.obligations.filter((o) => !o.voidedAt);
    expect(live.length).toBeGreaterThan(500);
    expect(new Set(live.map((o) => o.periodStart)).size).toBe(live.length);
    expect(live.every((o) => o.baseAmountCents === 2000)).toBe(true);
    expect(
      result.obligations
        .filter((o) => o.voidedAt)
        .every((o) => o.voidedSource === "system" && !o.voidedBy),
    ).toBe(true);
    expect(
      result.activity.filter((a) => a.action === "auto_accepted"),
    ).toHaveLength(1);
    expect(
      result.activity.find((a) => a.action === "auto_accepted"),
    ).toMatchObject({ actorType: "system" });
    expect(
      result.activity.find((a) => a.action === "auto_accepted")?.actorUserId,
    ).toBeUndefined();
    expect(result.offer?.status).toBe("auto_accepted");
  });

  it("keeps full financial totals while sending a compact dashboard payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
    const f = await setup({ endDate: "2028-10-20" });
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    await f.t.run(async ({ db }) => {
      for (let i = 0; i < 150; i++)
        await db.insert("contributions", {
          stayId: f.stayId,
          guestUserId: f.guestId,
          createdBy: f.guestId,
          type: "payment",
          amountCents: 100,
          date: "2026-10-22",
          note: "Synthetic benchmark",
          countsTowardBalance: true,
          status: "confirmed",
          createdAt: Date.now() + i,
        });
    });
    const args = {
      stayId: f.stayId,
      guestUserId: f.guestId,
      asOfDate: "2026-10-22",
    };
    const ledger = await f.guest.query(api.obligations.list, args);
    const summary = await f.guest.query(api.obligations.summary, args);
    expect(summary.creditCents).toBe(15000);
    expect(summary.dueCount).toBe(0);
    expect(summary.balanceCents).toBeGreaterThan(0);
    const laterSummary = await f.guest.query(api.obligations.summary, {
      ...args,
      asOfDate: "2026-12-22",
    });
    expect(laterSummary.dueCount).toBeGreaterThan(3);
    expect(laterSummary.highlights).toHaveLength(3);
    expect(summary.chargesCents).toBe(
      ledger.reduce((sum, item) => sum + item.effectiveChargeCents, 0),
    );
    expect(summary.balanceCents).toBe(summary.chargesCents - 15000);
    const fullBytes = Buffer.byteLength(JSON.stringify(ledger));
    const summaryBytes = Buffer.byteLength(JSON.stringify(summary));
    expect(summaryBytes).toBeLessThan(fullBytes / 10);
    console.info("WRE-224 synthetic financial payload", {
      fullBytes,
      summaryBytes,
      reductionPercent: Math.round(100 * (1 - summaryBytes / fullBytes)),
    });
    const outsider = f.t.withIdentity({
      subject: "outsider",
      name: "Outsider",
    });
    await outsider.mutation(api.users.syncCurrent, {});
    await expect(outsider.query(api.obligations.summary, args)).rejects.toThrow(
      "Not authorized",
    );
  });

  it("offers household updates to existing guests and retains their explicit overrides", async () => {
    const f = await setup();
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    await f.host.mutation(api.terms.updateGuest, {
      stayId: f.stayId,
      guestUserId: f.guestId,
      terms: { ...terms, rateCents: 1500 },
    });
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    await f.host.mutation(api.terms.updateCurrent, {
      stayId: f.stayId,
      terms: { ...terms, rateCents: 2500, houseNotes: "Updated expectations." },
    });
    const updated = await f.guest.query(api.stays.getBundle, {
      stayId: f.stayId,
    });
    expect(updated.terms).toMatchObject({
      rateCents: 1500,
      houseNotes: "Updated expectations.",
    });
    expect(updated.membership.acceptedTermsId).not.toBe(updated.terms?._id);
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    expect(
      (await f.host.query(api.stays.getBundle, { stayId: f.stayId })).stay
        .status,
    ).toBe("active");
  });

  it("retains optional weekly guest overrides when a daily household update omits them", async () => {
    const f = await setup();
    await f.guest.mutation(api.terms.acceptCurrent, {
      stayId: f.stayId,
      initialCadence: "weekly",
      initialPaymentDayOfWeek: 3,
    });
    await f.host.mutation(api.terms.updateCurrent, {
      stayId: f.stayId,
      terms: { ...terms, houseNotes: "Updated shared notes" },
    });
    const bundle = await f.guest.query(api.stays.getBundle, {
      stayId: f.stayId,
    });
    expect(bundle.terms).toMatchObject({
      cadence: "weekly",
      paymentDayOfWeek: 3,
      rateCents: 7000,
      houseNotes: "Updated shared notes",
    });
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
  });

  it("replaces legacy unscoped future rows for a single guest without duplicate charges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
    const f = await setup();
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    await f.t.run(async ({ db }) => {
      for (const row of await db.query("obligations").collect())
        await db.patch(row._id, { guestUserId: undefined });
    });
    await f.host.mutation(api.terms.updateGuest, {
      stayId: f.stayId,
      guestUserId: f.guestId,
      terms: { ...terms, rateCents: 2000 },
    });
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    const ledger = await f.guest.query(api.obligations.list, {
      stayId: f.stayId,
      asOfDate: "2026-10-22",
    });
    expect(new Set(ledger.map((row) => row.periodStart)).size).toBe(
      ledger.length,
    );
    expect(ledger.every((row) => row.baseAmountCents === 2000)).toBe(true);
  });

  it("keeps manual acceptance unchanged when a scheduled callback is retried", async () => {
    const f = await setup();
    const offerId = await latestOffer(f.t, f.stayId);
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    await f.t.mutation(internal.terms.autoAcceptOffer, { offerId });
    const rows = await f.t.run(({ db }) =>
      db.query("termsAcceptances").collect(),
    );
    expect(rows.filter((row) => row.userId === f.guestId)).toHaveLength(1);
    expect(rows.find((row) => row.userId === f.guestId)?.method).toBe("guest");
  });

  it("preserves one acceptance when manual and scheduled acceptance arrive together", async () => {
    const f = await setup();
    const offerId = await latestOffer(f.t, f.stayId);
    await Promise.all([
      f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId }),
      f.t.mutation(internal.terms.autoAcceptOffer, { offerId }),
    ]);
    const rows = await f.t.run(async ({ db }) => ({
      accepted: await db.query("termsAcceptances").collect(),
      obligations: await db.query("obligations").collect(),
      scheduled: await db.system.query("_scheduled_functions").collect(),
    }));
    expect(
      rows.accepted.filter((row) => row.userId === f.guestId),
    ).toHaveLength(1);
    expect(new Set(rows.obligations.map((row) => row.periodStart)).size).toBe(
      rows.obligations.length,
    );
    expect(
      rows.scheduled.some((job) => job.name.includes("cancelAgreementPending")),
    ).toBe(true);
  });

  it("refuses an incomplete financial total when active history exceeds the safe bound", async () => {
    const f = await setup();
    await f.guest.mutation(api.terms.acceptCurrent, { stayId: f.stayId });
    const bundle = await f.guest.query(api.stays.getBundle, {
      stayId: f.stayId,
    });
    await f.t.run(async ({ db }) => {
      for (let i = 0; i < 4097; i++)
        await db.insert("obligations", {
          stayId: f.stayId,
          guestUserId: f.guestId,
          termsId: bundle.terms!._id,
          type: "adhoc",
          baseAmountCents: 101,
          periodStart: "2026-10-22",
          periodEnd: "2026-10-22",
          dueDate: "2026-10-22",
          createdAt: Date.now(),
        });
    });
    await expect(
      f.guest.query(api.obligations.summary, {
        stayId: f.stayId,
        asOfDate: "2026-10-22",
      }),
    ).rejects.toThrow("records are retained");
  });

  it("ignores replaced offers, disabled timers and ended stays", async () => {
    const f = await setup();
    const oldId = await latestOffer(f.t, f.stayId);
    await f.host.mutation(api.terms.updateGuest, {
      stayId: f.stayId,
      guestUserId: f.guestId,
      terms: { ...terms, rateCents: 1800 },
    });
    await f.t.mutation(internal.terms.autoAcceptOffer, { offerId: oldId });
    expect(
      (await f.guest.query(api.stays.getBundle, { stayId: f.stayId }))
        .membership.acceptedTermsId,
    ).toBeUndefined();
    const newId = await latestOffer(f.t, f.stayId);
    await f.host.mutation(api.stays.updateAgreementAutoAccept, {
      stayId: f.stayId,
      enabled: false,
      hours: 24,
    });
    await f.t.mutation(internal.terms.autoAcceptOffer, { offerId: newId });
    await f.host.mutation(api.stays.end, { stayId: f.stayId });
    await f.t.mutation(internal.terms.autoAcceptOffer, { offerId: newId });
    await expect(
      f.host.mutation(api.stays.updateHouseInfo, {
        stayId: f.stayId,
        houseInfo: { wifiNetwork: "Changed" },
      }),
    ).rejects.toThrow("Ended stays");
    await expect(
      f.host.mutation(api.stays.updateGuestPreferredName, {
        stayId: f.stayId,
        guestUserId: f.guestId,
        preferredName: "Changed",
      }),
    ).rejects.toThrow("Ended stays");
  });

  it("returns guest contact details only to hosts", async () => {
    const f = await setup();
    const hostBundle = await f.host.query(api.stays.getBundle, {
      stayId: f.stayId,
    });
    const guestBundle = await f.guest.query(api.stays.getBundle, {
      stayId: f.stayId,
    });
    expect(
      hostBundle.members.find((m) => m.person.id === f.guestId)?.person.email,
    ).toBe("guest@example.com");
    expect(
      guestBundle.members.every(
        (m) => m.person.email === undefined && m.person.phone === undefined,
      ),
    ).toBe(true);
  });
});

describe("account capacity", () => {
  it("reports a configuration gap without treating paid accounts as Starter", async () => {
    const f = await setup();
    process.env.SUBSCRIPTION_LIMITS_ENFORCED = "true";
    delete process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
    await expect(
      f.host.mutation(api.stays.create, { timezone: "UTC", terms }),
    ).rejects.toThrow("limits are being configured");
    expect(await f.host.query(api.stays.listMine, {})).toHaveLength(1);
  });

  it("reserves pending stays, permits creation retries, and frees ended capacity", async () => {
    process.env.SUBSCRIPTION_LIMITS_ENFORCED = "true";
    const f = await setup();
    await expect(
      f.host.mutation(api.stays.create, { timezone: "UTC", terms }),
    ).rejects.toThrow("1 active stay");
    await f.host.mutation(api.stays.end, { stayId: f.stayId });
    const id = await f.host.mutation(api.stays.create, {
      timezone: "UTC",
      terms,
      creationRequestId: "retry",
    });
    expect(
      await f.host.mutation(api.stays.create, {
        timezone: "UTC",
        terms,
        creationRequestId: "retry",
      }),
    ).toBe(id);
  });

  it("allows only one of two competing Starter guest joins", async () => {
    const f = await setup();
    await f.t.run(async ({ db }) => {
      const membership = await db
        .query("memberships")
        .withIndex("by_stay_user", (q) =>
          q.eq("stayId", f.stayId).eq("userId", f.guestId),
        )
        .unique();
      await db.patch(membership!._id, { status: "left" });
    });
    process.env.SUBSCRIPTION_LIMITS_ENFORCED = "true";
    const competitors = ["join-a", "join-b"].map((subject) =>
      f.t.withIdentity({ subject, name: "Guest" }),
    );
    await Promise.all(
      competitors.map((actor) => actor.mutation(api.users.syncCurrent, {})),
    );
    const results = await Promise.allSettled(
      competitors.map((actor) =>
        actor.mutation(api.referral.joinWithCode, { referralCode: f.code }),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (
        await f.host.query(api.stays.getBundle, { stayId: f.stayId })
      ).members.filter(
        (member) =>
          member.membership.role === "guest" &&
          member.membership.status === "active",
      ),
    ).toHaveLength(1);
  });

  it("blocks additional Starter guests without consuming their invitation", async () => {
    const f = await setup();
    process.env.SUBSCRIPTION_LIMITS_ENFORCED = "true";
    const other = f.t.withIdentity({ subject: "other", name: "Other" });
    await other.mutation(api.users.syncCurrent, {});
    const tokenHash = "f".repeat(64);
    await f.host.mutation(api.invites.create, {
      stayId: f.stayId,
      tokenHash,
      expiresAt: Date.now() + 60000,
    });
    await expect(
      other.mutation(api.invites.accept, { tokenHash }),
    ).rejects.toThrow("1 active guest membership");
    expect(await other.query(api.invites.preview, { tokenHash })).toMatchObject(
      { valid: true },
    );
    expect(
      (await f.guest.query(api.stays.getBundle, { stayId: f.stayId }))
        .membership.status,
    ).toBe("active");
  });

  it("shares Plus guest capacity across stays and preserves over-limit records after expiry", async () => {
    const f = await setup();
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "sandbox";
    const account = (
      await f.host.query(api.stays.getBundle, { stayId: f.stayId })
    ).stay.householdAccountId!;
    await f.t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      provider: "revenuecat",
      providerEventId: "plus",
      householdAccountId: account,
      providerAppUserId: "host",
      eventType: "INITIAL_PURCHASE",
      entitlement: "plus",
      status: "active",
      environment: "sandbox",
      occurredAt: Date.now(),
      currentPeriodEndsAt: Date.now() + 60000,
    });
    process.env.SUBSCRIPTION_LIMITS_ENFORCED = "true";
    for (let i = 0; i < 2; i++) {
      const stayId = await f.host.mutation(api.stays.create, {
        timezone: "UTC",
        terms,
      });
      const code = (await f.host.query(api.stays.getBundle, { stayId })).stay
        .referralCode!;
      const guest = f.t.withIdentity({
        subject: `plus-guest-${i}`,
        name: "Guest",
      });
      await guest.mutation(api.users.syncCurrent, {});
      await guest.mutation(api.referral.joinWithCode, { referralCode: code });
      if (i === 1) {
        const alternateHost = f.t.withIdentity({
          subject: "alternate-host",
          name: "Host",
        });
        await alternateHost.mutation(api.users.syncCurrent, {});
        const profile = await alternateHost.query(api.users.viewer, {});
        await f.t.run(({ db }) =>
          db.patch(stayId, { hostUserId: profile!.id }),
        );
      }
    }
    await expect(
      f.host.mutation(api.stays.create, { timezone: "UTC", terms }),
    ).rejects.toThrow("3 active stays");
    const fourth = f.t.withIdentity({ subject: "fourth", name: "Fourth" });
    await fourth.mutation(api.users.syncCurrent, {});
    await expect(
      fourth.mutation(api.referral.joinWithCode, { referralCode: f.code }),
    ).rejects.toThrow("3 active guest memberships");
    await f.t.mutation(internal.subscriptions.recordProviderSnapshotEvent, {
      provider: "revenuecat",
      providerEventId: "expired",
      householdAccountId: account,
      providerAppUserId: "host",
      eventType: "EXPIRATION",
      entitlement: "plus",
      status: "expired",
      environment: "sandbox",
      occurredAt: Date.now() + 1,
    });
    expect(await f.host.query(api.stays.listMine, {})).toHaveLength(3);
    expect(
      (await f.guest.query(api.stays.getBundle, { stayId: f.stayId }))
        .membership.status,
    ).toBe("active");
  });
});
