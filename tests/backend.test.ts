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
    await user.mutation(api.users.updatePreferences, { phone: "+15551234567", notifyEmail: true, notifySms: true });
    const viewer = await user.query(api.users.viewer, {});
    expect(viewer).toMatchObject({ phone: "+15551234567", notifyEmail: true, notifySms: true });
  });
});
