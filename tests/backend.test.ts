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

const firstTerms = {
  startDate: "2026-09-01",
  endDate: "2026-09-21",
  cadence: "weekly" as const,
  paymentDayOfWeek: 1,
  rateCents: 20_000,
  earlyDiscountEnabled: true,
  earlyDiscountPercentage: 5,
  earlyDiscountDays: 2,
  lateFeeEnabled: true,
  lateFeeCents: 1_500,
  graceDays: 2,
  houseNotes: "Quiet after 10:30 PM.",
};

async function createUser(t: ReturnType<typeof convexTest>, subject: string, name: string) {
  const actor = t.withIdentity({ subject, name, email: `${subject}@example.com` });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

describe("shared stay authorization and audit rules", () => {
  it("keeps invite previews read-only and carries the guest name into membership", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "invite-preview-host", "Lee");
    const guest = await createUser(t, "invite-preview-guest", "Kouchd member");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: firstTerms });
    const tokenHash = "9".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash, expiresAt: Date.now() + 86_400_000 });
    const stay = await host.query(api.stays.getBundle, { stayId });

    const preview = await guest.query(api.invites.preview, { tokenHash });
    expect(preview).toEqual({ valid: true, hostName: "Lee", referralCode: stay.stay.referralCode, expiresAt: expect.any(Number) });
    expect(stay.members).toHaveLength(1);

    await expect(guest.mutation(api.users.syncCurrent, { clerkName: "   " })).rejects.toThrow("Name must be between 1 and 80 characters");
    await guest.mutation(api.users.syncCurrent, { clerkName: "Jordan Rivera" });
    expect((await guest.query(api.users.viewer, {}))?.name).toBe("Jordan Rivera");
    await guest.mutation(api.users.syncCurrent, { clerkName: "Jordan Rivera" });
    expect((await guest.query(api.users.viewer, {}))?.name).toBe("Jordan Rivera");
    await guest.mutation(api.invites.accept, { tokenHash });
    await guest.mutation(api.users.updatePreferences, { notifyEmail: true, notifySms: false });
    await guest.mutation(api.users.syncCurrent, { clerkName: "Jordan R." });

    const joinedStay = await host.query(api.stays.getBundle, { stayId });
    expect(joinedStay.members.some((member) => member.person.name === "Jordan R.")).toBe(true);
    expect(await guest.query(api.invites.preview, { tokenHash })).toEqual({ valid: false, status: "used" });

    const profileOwner = await createUser(t, "profile-name-owner", "Clerk Full Name");
    await profileOwner.mutation(api.users.syncCurrent, { clerkName: "Preferred Display Name" });
    await profileOwner.mutation(api.users.syncCurrent, { clerkName: "Clerk Full Name" });
    expect((await profileOwner.query(api.users.viewer, {}))?.name).toBe("Clerk Full Name");
  });

  it("keeps guest agreements and payment options private while allowing different terms", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "household-host", "Lee");
    const firstGuest = await createUser(t, "household-guest-one", "Marcus");
    const secondGuest = await createUser(t, "household-guest-two", "Riley");
    const startDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      paymentOptions: [
        { provider: "paypal", detail: "https://paypal.me/lee" },
        { provider: "zelle", detail: "lee@example.com" },
      ],
      terms: { ...firstTerms, startDate, endDate },
    });
    const firstInviteHash = "1".repeat(64);
    const secondInviteHash = "2".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: firstInviteHash, expiresAt: Date.now() + 86_400_000 });
    await host.mutation(api.invites.create, { stayId, tokenHash: secondInviteHash, expiresAt: Date.now() + 86_400_000 });

    const preview = await firstGuest.query(api.invites.preview, { tokenHash: firstInviteHash });
    expect(preview).toEqual({ valid: true, hostName: "Lee", referralCode: expect.any(String), expiresAt: expect.any(Number) });
    await firstGuest.mutation(api.invites.accept, { tokenHash: firstInviteHash });
    const firstMember = (await host.query(api.stays.getBundle, { stayId })).members.find((member) => member.person.name === "Marcus")!;
    await host.mutation(api.terms.updateGuest, { stayId, guestUserId: firstMember.person.id, terms: { ...firstTerms, startDate, endDate, rateCents: 11_000 } });
    await firstGuest.mutation(api.terms.acceptCurrent, { stayId });

    await secondGuest.mutation(api.invites.accept, { tokenHash: secondInviteHash });
    await host.mutation(api.stays.updatePaymentOptions, {
      stayId,
      paymentOptions: [
        { provider: "cashapp", detail: "$LeeHouse" },
        { provider: "applepay", detail: "https://example.com/pay/lee" },
      ],
    });
    const secondMember = (await host.query(api.stays.getBundle, { stayId })).members.find((member) => member.person.name === "Riley")!;
    await host.mutation(api.terms.updateGuest, { stayId, guestUserId: secondMember.person.id, terms: { ...firstTerms, startDate, endDate, rateCents: 32_000 } });
    await secondGuest.mutation(api.terms.acceptCurrent, { stayId });

    const hostBundle = await host.query(api.stays.getBundle, { stayId });
    const firstBundle = await firstGuest.query(api.stays.getBundle, { stayId });
    const secondBundle = await secondGuest.query(api.stays.getBundle, { stayId });
    expect(hostBundle.members.find((member) => member.person.name === "Marcus")?.terms?.rateCents).toBe(11_000);
    expect(hostBundle.members.find((member) => member.person.name === "Riley")?.terms?.rateCents).toBe(32_000);
    expect(firstBundle.terms?.rateCents).toBe(11_000);
    expect(secondBundle.terms?.rateCents).toBe(32_000);
    expect(firstBundle.members.some((member) => "terms" in member)).toBe(false);
    expect(firstBundle.stay.paymentOptions).toEqual([
      { provider: "cashapp", detail: "$LeeHouse" },
      { provider: "applepay", detail: "https://example.com/pay/lee" },
    ]);
    const publicCodePreview = await firstGuest.query(api.referral.preview, { referralCode: hostBundle.stay.referralCode! });
    expect(publicCodePreview).not.toHaveProperty("paymentOptions");
    expect(await firstGuest.query(api.invites.preview, { tokenHash: firstInviteHash })).toEqual({ valid: false, status: "used" });

    const secondAcceptedTermsId = secondBundle.membership.acceptedTermsId;
    await host.mutation(api.terms.updateGuest, { stayId, guestUserId: firstMember.person.id, terms: { ...firstTerms, startDate, endDate, rateCents: 12_000 } });
    const revisedBundle = await host.query(api.stays.getBundle, { stayId });
    expect(revisedBundle.stay.status).toBe("active");
    expect(revisedBundle.members.find((member) => member.person.name === "Riley")?.membership.acceptedTermsId).toBe(secondAcceptedTermsId);
    expect(revisedBundle.members.find((member) => member.person.name === "Marcus")?.membership.acceptedTermsId).not.toBe(revisedBundle.members.find((member) => member.person.name === "Marcus")?.terms?._id);
    await firstGuest.mutation(api.terms.acceptCurrent, { stayId });

    const asOfDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const firstLedger = await firstGuest.query(api.obligations.list, { stayId, asOfDate });
    const secondLedger = await secondGuest.query(api.obligations.list, { stayId, asOfDate });
    expect(firstLedger.map((item) => item.baseAmountCents)).toContain(12_000);
    expect(secondLedger.map((item) => item.baseAmountCents)).toContain(32_000);
    await expect(firstGuest.query(api.obligations.list, { stayId, asOfDate, guestUserId: secondMember.person.id })).rejects.toThrow("Guests cannot access another guest's financial record");
  });

  it("includes legacy unscoped due obligations in a single guest schedule change balance gate", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "legacy-schedule-host", "Lee");
    const guest = await createUser(t, "legacy-schedule-guest", "Marcus");
    const startDate = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms: { ...firstTerms, startDate, endDate },
    });
    await host.mutation(api.invites.create, { stayId, tokenHash: "9".repeat(64), expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: "9".repeat(64) });
    await guest.mutation(api.terms.acceptCurrent, { stayId });
    const bundle = await guest.query(api.stays.getBundle, { stayId });
    const termsId = bundle.membership.acceptedTermsId!;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await t.run((ctx) => ctx.db.insert("obligations", {
      stayId,
      termsId,
      periodStart: yesterday,
      periodEnd: yesterday,
      dueDate: today,
      baseAmountCents: 2_500,
      createdAt: Date.now(),
    }));

    await expect(guest.mutation(api.paymentSchedule.requestChange, { stayId, cadence: "daily" }))
      .rejects.toThrow("Bring your due balance to $0");
  });

  it("voids legacy unscoped obligations when a sole guest's schedule change is approved", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "legacy-approval-host", "Lee");
    const guest = await createUser(t, "legacy-approval-guest", "Marcus");
    const startDate = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: { ...firstTerms, startDate, endDate },
    });
    await host.mutation(api.invites.create, { stayId, tokenHash: "8".repeat(64), expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: "8".repeat(64) });
    await guest.mutation(api.terms.acceptCurrent, { stayId });
    const bundle = await guest.query(api.stays.getBundle, { stayId });
    const legacyPeriodStart = new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10);
    const legacyPeriodEnd = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const legacyObligationId = await t.run((ctx) => ctx.db.insert("obligations", {
      stayId,
      termsId: bundle.membership.acceptedTermsId!,
      periodStart: legacyPeriodStart,
      periodEnd: legacyPeriodEnd,
      dueDate: legacyPeriodStart,
      baseAmountCents: 20_000,
      createdAt: Date.now(),
    }));
    const requestId = await guest.mutation(api.paymentSchedule.requestChange, { stayId, cadence: "daily" });

    await host.mutation(api.paymentSchedule.reviewRequest, { requestId, decision: "approve" });

    const legacyObligation = await t.run((ctx) => ctx.db.get(legacyObligationId));
    expect(legacyObligation?.voidedAt).toEqual(expect.any(Number));
  });

  it("requires and stores the weekly payment day when a host edits a guest to weekly terms", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "weekday-edit-host", "Lee");
    const guest = await createUser(t, "weekday-edit-guest", "Marcus");
    const startDate = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const { paymentDayOfWeek: _paymentDayOfWeek, ...dailyTerms } = firstTerms;
    expect(_paymentDayOfWeek).toBe(1);
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: { ...dailyTerms, cadence: "daily", startDate, endDate },
    });
    await host.mutation(api.invites.create, { stayId, tokenHash: "7".repeat(64), expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: "7".repeat(64) });
    await guest.mutation(api.terms.acceptCurrent, { stayId });
    const bundle = await host.query(api.stays.getBundle, { stayId });
    const guestUserId = bundle.members.find((member) => member.person.name === "Marcus")!.person.id;

    await expect(host.mutation(api.terms.updateGuest, {
      stayId,
      guestUserId,
      terms: { ...dailyTerms, cadence: "weekly", startDate, endDate },
    })).rejects.toThrow("Choose a weekday for weekly guest contributions");
    await host.mutation(api.terms.updateGuest, {
      stayId,
      guestUserId,
      terms: { ...dailyTerms, cadence: "weekly", paymentDayOfWeek: 4, startDate, endDate },
    });

    const updatedBundle = await host.query(api.stays.getBundle, { stayId });
    expect(updatedBundle.members.find((member) => member.person.name === "Marcus")?.terms)
      .toMatchObject({ cadence: "weekly", paymentDayOfWeek: 4 });
  });

  it("uses the accepted historical agreement for backdated overnights and permits audited correction", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "occupancy-history-host", "Lee");
    const guest = await createUser(t, "occupancy-history-guest", "Marcus");
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const stayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      terms: { ...firstTerms, startDate, endDate, cadence: "daily", billingBasis: "occupied_nights" },
    });
    await host.mutation(api.invites.create, { stayId, tokenHash: "6".repeat(64), expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: "6".repeat(64) });
    await guest.mutation(api.terms.acceptCurrent, { stayId });
    const acceptedTermsId = (await guest.query(api.stays.getBundle, { stayId })).membership.acceptedTermsId!;
    const guestId = (await host.query(api.stays.getBundle, { stayId })).members.find((member) => member.person.name === "Marcus")!.person.id;

    await host.mutation(api.terms.updateGuest, {
      stayId,
      guestUserId: guestId,
      terms: { ...firstTerms, startDate, endDate, cadence: "daily", billingBasis: "occupied_nights", rateCents: 12_000 },
    });
    const occupiedNightId = await host.mutation(api.occupancy.recordOvernight, { stayId, guestUserId: guestId, nightDate: yesterday });
    const recorded = await t.run(async (ctx) => {
      const night = await ctx.db.get(occupiedNightId);
      return { night, obligation: night ? await ctx.db.get(night.obligationId) : null };
    });
    expect(recorded.night?.termsId).toBe(acceptedTermsId);
    expect(recorded.obligation).toMatchObject({ dueDate: today, baseAmountCents: firstTerms.rateCents });

    await host.mutation(api.occupancy.voidOvernight, { occupiedNightId });
    const corrected = await t.run(async (ctx) => {
      const night = await ctx.db.get(occupiedNightId);
      return { night, obligation: night ? await ctx.db.get(night.obligationId) : null };
    });
    expect(corrected.night?.voidedAt).toEqual(expect.any(Number));
    expect(corrected.night?.voidedBy).toBeDefined();
    expect(corrected.obligation?.voidedAt).toEqual(expect.any(Number));
  });

  it("saves role-specific tour progress for active household members", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "guide-host", "Lee");
    const guest = await createUser(t, "guide-guest", "Marcus");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: firstTerms });
    const tokenHash = "f".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash });

    await host.mutation(api.users.updateGuideProgress, { role: "host", step: 2, status: "in_progress" });
    await guest.mutation(api.users.updateGuideProgress, { role: "guest", step: 0, status: "skipped" });
    expect((await host.query(api.users.viewer, {}))?.guideProgress?.host).toEqual({ step: 2, status: "in_progress" });
    expect((await guest.query(api.users.viewer, {}))?.guideProgress?.guest).toEqual({ step: 0, status: "skipped" });
    await expect(guest.mutation(api.users.updateGuideProgress, { role: "host", step: 0, status: "completed" })).rejects.toThrow("not an active member in this role");
    await expect(host.mutation(api.users.updateGuideProgress, { role: "host", step: -1, status: "in_progress" })).rejects.toThrow("Invalid guide step");
  });

  it("rejects weak invite hashes and invalid financial terms", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-validation", "Lee");
    await expect(host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: { ...firstTerms, earlyDiscountPercentage: 125 },
    })).rejects.toThrow("Early discount");
    await expect(host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: { ...firstTerms, startDate: "later" },
    })).rejects.toThrow("calendar date");

    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: firstTerms });
    await expect(host.mutation(api.invites.create, {
      stayId,
      tokenHash: "weak",
      expiresAt: Date.now() + 86_400_000,
    })).rejects.toThrow("invite hash");
  });

  it("keeps a stay private and activates only after both members accept", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-1", "Lee");
    const guest = await createUser(t, "guest-1", "Marcus");
    const outsider = await createUser(t, "outsider-1", "Other");
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      nextCheckInDate: "2026-09-08",
      terms: firstTerms,
    });

    await expect(outsider.query(api.stays.getBundle, { stayId })).rejects.toThrow("Not authorized");

    const tokenHash = "a".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash });
    await expect(guest.mutation(api.invites.accept, { tokenHash })).rejects.toThrow("invalid or expired");

    const before = await host.query(api.stays.getBundle, { stayId });
    expect(before.stay.status).toBe("pending");
    expect(await guest.mutation(api.terms.acceptCurrent, { stayId })).toBe("active");
    const after = await guest.query(api.stays.getBundle, { stayId });
    expect(after.stay.status).toBe("active");
  });

  it("requires the other member to confirm and retains voided history", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-2", "Lee");
    const guest = await createUser(t, "guest-2", "Marcus");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: firstTerms });
    const tokenHash = "b".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash });

    const contributionId = await guest.mutation(api.contributions.create, {
      stayId,
      type: "groceries",
      amountCents: 4_850,
      date: "2026-09-03",
      note: "Kitchen restock",
      countsTowardBalance: true,
    });
    await expect(guest.mutation(api.contributions.confirm, { contributionId })).rejects.toThrow("cannot confirm");
    await host.mutation(api.contributions.confirm, { contributionId });
    await guest.mutation(api.contributions.voidContribution, { contributionId });

    const entries = await host.query(api.contributions.list, { stayId });
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("voided");
    expect(entries[0].voidedAt).toEqual(expect.any(Number));
  });

  it("ends a stay idempotently and keeps its records", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-3", "Lee");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: firstTerms });
    await host.mutation(api.stays.end, { stayId });
    await host.mutation(api.stays.end, { stayId });
    const bundle = await host.query(api.stays.getBundle, { stayId });
    expect(bundle.stay.status).toBe("ended");
    expect(bundle.terms?.houseNotes).toBe(firstTerms.houseNotes);
  });

  it("generates obligation periods on activation and audits a host fee waiver", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-obligations", "Lee");
    const guest = await createUser(t, "guest-obligations", "Marcus");
    const outsider = await createUser(t, "outsider-obligations", "Other");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: firstTerms });
    const tokenHash = "c".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const contributionId = await guest.mutation(api.contributions.create, {
      stayId,
      type: "payment",
      amountCents: 19_000,
      date: "2026-09-05",
      note: "First week paid early",
      countsTowardBalance: true,
    });
    await host.mutation(api.contributions.confirm, { contributionId });

    await expect(outsider.query(api.obligations.list, { stayId, asOfDate: "2026-09-30" })).rejects.toThrow("Not authorized");
    const beforeWaiver = await host.query(api.obligations.list, { stayId, asOfDate: "2026-09-30" });
    expect(beforeWaiver).toHaveLength(3);
    expect(beforeWaiver[0]).toMatchObject({ baseAmountCents: 20_000, earlyDiscountCents: -1_000, balanceCents: 0 });
    expect(beforeWaiver[1].lateFeeCents).toBe(3_000);

    await expect(guest.mutation(api.obligations.waiveLateFee, { obligationId: beforeWaiver[1]._id })).rejects.toThrow("Host access");
    await host.mutation(api.obligations.waiveLateFee, { obligationId: beforeWaiver[1]._id });
    await host.mutation(api.obligations.waiveLateFee, { obligationId: beforeWaiver[1]._id });
    const afterWaiver = await host.query(api.obligations.list, { stayId, asOfDate: "2026-09-30" });
    expect(afterWaiver[1]).toMatchObject({ lateFeeCents: 0, lateFeeWaived: true });

    const activity = await host.query(api.activity.list, { stayId });
    expect(activity.filter((item: { action: string }) => item.action === "late_fee_waived")).toHaveLength(1);
  });

  it("enforces guest-by-guest financial privacy in a multi-guest stay", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-private", "Lee");
    const guestA = await createUser(t, "guest-private-a", "Marcus");
    const guestB = await createUser(t, "guest-private-b", "Avery");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: firstTerms });

    await host.mutation(api.invites.create, { stayId, tokenHash: "d".repeat(64), expiresAt: Date.now() + 86_400_000 });
    await guestA.mutation(api.invites.accept, { tokenHash: "d".repeat(64) });
    await host.mutation(api.invites.create, { stayId, tokenHash: "e".repeat(64), expiresAt: Date.now() + 86_400_000 });
    await guestB.mutation(api.invites.accept, { tokenHash: "e".repeat(64) });
    await guestA.mutation(api.terms.acceptCurrent, { stayId });
    await guestB.mutation(api.terms.acceptCurrent, { stayId });

    const bundleA = await guestA.query(api.stays.getBundle, { stayId });
    const bundleB = await guestB.query(api.stays.getBundle, { stayId });
    const guestAId = bundleA.membership.userId;
    const guestBId = bundleB.membership.userId;
    await host.mutation(api.obligations.createAdhocCharge, { stayId, guestUserId: guestAId, title: "Alice utility", amountCents: 4_000, effectiveDate: "2026-09-01", dueDate: "2026-09-02" });
    await host.mutation(api.obligations.createAdhocCharge, { stayId, guestUserId: guestBId, title: "Bob utility", amountCents: 8_000, effectiveDate: "2026-09-01", dueDate: "2026-09-02" });

    await expect(guestA.query(api.obligations.list, { stayId, guestUserId: guestBId, asOfDate: "2026-09-03" })).rejects.toThrow("cannot access another guest");
    await expect(guestA.mutation(api.contributions.create, { stayId, guestUserId: guestBId, type: "payment", amountCents: 2_000, date: "2026-09-03", note: "Nope", countsTowardBalance: true })).rejects.toThrow("cannot access another guest");

    const ledgerA = await guestA.query(api.obligations.list, { stayId, asOfDate: "2026-09-03" });
    const ledgerB = await guestB.query(api.obligations.list, { stayId, asOfDate: "2026-09-03" });
    expect(ledgerA.some((item: { title?: string }) => item.title === "Alice utility")).toBe(true);
    expect(ledgerA.some((item: { title?: string }) => item.title === "Bob utility")).toBe(false);
    expect(ledgerB.some((item: { title?: string }) => item.title === "Bob utility")).toBe(true);
    expect(ledgerB.some((item: { title?: string }) => item.title === "Alice utility")).toBe(false);
    const activityA = await guestA.query(api.activity.list, { stayId });
    const activityB = await guestB.query(api.activity.list, { stayId });
    expect(activityA.some((item: { detail: string }) => item.detail.includes("Alice utility"))).toBe(true);
    expect(activityA.some((item: { detail: string }) => item.detail.includes("Bob utility"))).toBe(false);
    expect(activityB.some((item: { detail: string }) => item.detail.includes("Bob utility"))).toBe(true);
    expect(activityB.some((item: { detail: string }) => item.detail.includes("Alice utility"))).toBe(false);
  });

  it("validates notification preferences before scheduling a Knock sync", async () => {
    const t = convexTest(schema, modules);
    const user = await createUser(t, "notify-user", "Lee");
    await expect(user.mutation(api.users.updatePreferences, { phone: "555", notifyEmail: true, notifySms: true })).rejects.toThrow("E.164");
    await expect(user.mutation(api.users.updatePreferences, { notifyEmail: true, notifySms: true })).rejects.toThrow("phone number");
    await expect(user.mutation(api.users.updatePreferences, { phone: "+15551234567", notifyEmail: true, notifySms: true })).rejects.toThrow("Confirm SMS consent");
    await user.mutation(api.users.updatePreferences, {
      phone: "+15551234567",
      notifyEmail: true,
      notifySms: true,
      smsConsentSource: "sms_opt_in_form",
      smsConsentConfirmed: true,
    });
    const viewer = await user.query(api.users.viewer, {});
    expect(viewer).toMatchObject({ phone: "+15551234567", notifyEmail: true, notifySms: true });

    await user.mutation(api.users.updatePreferences, {
      phone: "+15551234567",
      notifyEmail: true,
      notifySms: false,
      smsConsentSource: "settings",
    });
    const consentEvents = await t.run((ctx) => ctx.db.query("smsConsentEvents").collect());
    expect(consentEvents.map(({ action, source }) => ({ action, source }))).toEqual([
      { action: "opted_in", source: "sms_opt_in_form" },
      { action: "opted_out", source: "settings" },
    ]);
  });

  it("manages household logistics and WiFi info with host authorization", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-wifi", "Lee");
    const guest = await createUser(t, "guest-wifi", "Marcus");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: firstTerms });
    const tokenHash = "c".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash });

    const houseInfo = {
      wifiNetwork: "Kouchd-5G",
      wifiPassword: "GuestPassword123!",
      streetAddress: "123 Elm St",
      unit: "Apt 4B",
      cityStateZip: "Austin, TX 78701",
      doorCode: "#4321",
      parkingNotes: "Spot 12 behind building, permit hanging on fridge",
      trashDay: "Tuesday mornings (bins out Monday night)",
      emergencyContact: "Building Super Joe: (555) 019-2834",
      otherNotes: "Thermostat is set automatically; please keep kitchen counters wiped.",
    };

    // Guest cannot update house info
    await expect(guest.mutation(api.stays.updateHouseInfo, { stayId, houseInfo })).rejects.toThrow("Host access required");

    // Host updates house info
    await host.mutation(api.stays.updateHouseInfo, { stayId, houseInfo });

    // Both host and guest can read the house info via stay bundle
    const hostBundle = await host.query(api.stays.getBundle, { stayId });
    expect(hostBundle.stay.houseInfo).toMatchObject(houseInfo);

    const guestBundle = await guest.query(api.stays.getBundle, { stayId });
    expect(guestBundle.stay.houseInfo).toMatchObject(houseInfo);
  });
});
