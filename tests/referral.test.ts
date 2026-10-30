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

const sampleTerms = {
  startDate: "2026-09-01",
  endDate: "2026-09-21",
  cadence: "weekly" as const,
  rateCents: 20_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Quiet after 10 PM.",
  houseRules: [
    {
      id: "quiet_1",
      category: "quiet_hours",
      title: "Quiet hours 10 PM - 8 AM",
      description: "Keep common spaces quiet during nighttime.",
      required: true,
    },
  ],
  rewards: {
    enabled: true,
    coinName: "KouchdCoins",
    centsPerPoint: 100,
    maxCreditPerPeriodCents: 10_000,
  },
};

async function createUser(t: ReturnType<typeof convexTest>, subject: string, name: string) {
  const actor = t.withIdentity({ subject, name, email: `${subject}@example.com` });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

describe("Ending a guest's agreement", () => {
  async function setup() {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "end_host", "Jordan Host");
    const guest = await createUser(t, "end_guest", "Taylor Guest");
    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: sampleTerms });
    const bundle = await host.query(api.stays.getBundle, { stayId });
    const referralCode = bundle.stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    const after = await host.query(api.stays.getBundle, { stayId });
    const guestUserId = after.members.find((member) => member.membership.role === "guest")!.person.id;
    return { t, host, guest, stayId, guestUserId, referralCode };
  }

  it("removes the guest, frees the spot, and reassigns open chores", async () => {
    const { host, guest, stayId, guestUserId } = await setup();
    await host.mutation(api.chores.create, {
      stayId, title: "Bins", note: "", assignee: "guest", assigneeUserId: guestUserId, dueDate: "2026-11-02",
    });

    await host.mutation(api.stays.endGuestAgreement, { stayId, guestUserId });

    expect(await guest.query(api.stays.listMine, {})).toHaveLength(0);
    await expect(guest.query(api.stays.getBundle, { stayId })).rejects.toThrow("Not authorized");
    const [chore] = await host.query(api.chores.list, { stayId });
    expect(chore.assignee).toBe("shared");
    expect(chore.assigneeUserId).toBeUndefined();
    const usage = await host.query(api.subscriptions.planUsage, {});
    expect(JSON.stringify(usage)).not.toContain(guestUserId);
  });

  it("only lets the host end an agreement, and only for an active guest", async () => {
    const { host, guest, stayId, guestUserId } = await setup();
    await expect(guest.mutation(api.stays.endGuestAgreement, { stayId, guestUserId })).rejects.toThrow("Host access required");
    await host.mutation(api.stays.endGuestAgreement, { stayId, guestUserId });
    await expect(host.mutation(api.stays.endGuestAgreement, { stayId, guestUserId })).rejects.toThrow("active guest");
  });

  it("lets the guest come back with the join code", async () => {
    const { host, guest, stayId, guestUserId, referralCode } = await setup();
    await host.mutation(api.stays.endGuestAgreement, { stayId, guestUserId });
    const result = await guest.mutation(api.referral.joinWithCode, { referralCode });
    expect(result.alreadyMember).toBe(false);
    expect(await guest.query(api.stays.listMine, {})).toHaveLength(1);
  });

  it("keeps a removed guest's ledger readable by the host but closed to changes", async () => {
    const { host, guest, stayId, guestUserId, referralCode } = await setup();
    await guest.mutation(api.contributions.create, {
      stayId, type: "payment", amountCents: 5_000, date: "2026-09-02", note: "Cash", countsTowardBalance: true,
    });
    await host.mutation(api.obligations.createAdhocCharge, {
      stayId, guestUserId, title: "Internet", amountCents: 2_000, effectiveDate: "2026-09-02", dueDate: "2026-09-09",
    });
    await host.mutation(api.stays.endGuestAgreement, { stayId, guestUserId });

    const args = { stayId, guestUserId };
    expect(await host.query(api.contributions.list, args)).toHaveLength(1);
    const record = await host.query(api.obligations.ledgerWithTotals, { ...args, asOfDate: "2026-09-30" });
    expect(record.rows.map((row) => row.title)).toContain("Internet");
    await host.query(api.rewards.getWallet, args);

    await expect(host.mutation(api.contributions.create, {
      ...args, type: "payment", amountCents: 100, date: "2026-09-03", note: "", countsTowardBalance: true,
    })).rejects.toThrow("not an active member");
    await expect(host.mutation(api.obligations.createAdhocCharge, {
      ...args, title: "Utilities", amountCents: 100, effectiveDate: "2026-09-03", dueDate: "2026-09-10",
    })).rejects.toThrow("not an active member");
    await expect(guest.query(api.contributions.list, { stayId })).rejects.toThrow("Not authorized");

    await guest.mutation(api.referral.joinWithCode, { referralCode });
    expect(await guest.query(api.contributions.list, { stayId })).toHaveLength(1);
  });

  it("lets the guest come back with a new invite link", async () => {
    const { host, guest, stayId, guestUserId } = await setup();
    await host.mutation(api.stays.endGuestAgreement, { stayId, guestUserId });
    const tokenHash = "a".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash });
    expect(await guest.query(api.stays.listMine, {})).toHaveLength(1);
  });
});

describe("Household Referral Codes", () => {
  it("generates a referral code on stay creation and allows guests to preview and join", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-ref-1", "Jordan Host");
    const guest = await createUser(t, "guest-ref-1", "Taylor Guest");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: sampleTerms,
    });

    const bundle = await host.query(api.stays.getBundle, { stayId });
    expect(bundle.stay.referralCode).toBeDefined();
    expect(bundle.stay.referralCode).toMatch(/^KCH-[A-Z0-9]{4,10}$/);

    const referralCode = bundle.stay.referralCode!;

    // Guest previews the referral code without joining
    const preview = await guest.query(api.referral.preview, { referralCode });
    expect(preview.valid).toBe(true);
    if (preview.valid) {
      expect(preview.stayId).toBe(stayId);
      expect(preview.hostName).toBe("Jordan Host");
      expect(preview.houseRules?.length).toBe(1);
      expect(preview.rewards?.enabled).toBe(true);
      expect(preview.rewards?.coinName).toBe("KouchdCoins");
    }

    // Guest joins using the referral code
    const joinResult = await guest.mutation(api.referral.joinWithCode, { referralCode });
    expect(joinResult.stayId).toBe(stayId);
    expect(joinResult.alreadyMember).toBe(false);

    // Re-joining returns alreadyMember: true
    const rejoinResult = await guest.mutation(api.referral.joinWithCode, { referralCode });
    expect(rejoinResult.alreadyMember).toBe(true);

    // Verify guest has membership
    const guestStays = await guest.query(api.stays.listMine, {});
    expect(guestStays.length).toBe(1);
    expect(guestStays[0].membership.role).toBe("guest");
    expect(guestStays[0].stay._id).toBe(stayId);
  });

  it("allows host to regenerate referral code and invalidates the old one", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-ref-2", "Alex Host");
    const outsider = await createUser(t, "outsider-ref", "Morgan");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: sampleTerms,
    });

    const initialBundle = await host.query(api.stays.getBundle, { stayId });
    const oldCode = initialBundle.stay.referralCode!;

    const newCode = await host.mutation(api.referral.regenerateCode, { stayId });
    expect(newCode).not.toBe(oldCode);

    // Old code preview fails
    const oldPreview = await outsider.query(api.referral.preview, { referralCode: oldCode });
    expect(oldPreview.valid).toBe(false);

    // New code preview succeeds
    const newPreview = await outsider.query(api.referral.preview, { referralCode: newCode });
    expect(newPreview.valid).toBe(true);
  });
});
