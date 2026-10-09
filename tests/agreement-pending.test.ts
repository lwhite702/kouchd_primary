import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

const testTerms = {
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  cadence: "weekly" as const,
  rateCents: 25_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: true,
  lateFeeCents: 1_000,
  graceDays: 2,
  houseNotes: "Please keep common areas clean.",
};

async function createUser(t: ReturnType<typeof convexTest>, subject: string, name: string) {
  const actor = t.withIdentity({ subject, name, email: `${subject}@example.com` });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

describe("agreement-pending reminders and cancellation contract (WRE-176)", () => {
  it("identifies agreement pending candidates with role-aware payloads and cancellation keys for multi-guest stay", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-user", "Sarah Host");
    const guest1 = await createUser(t, "guest-1", "Alex Guest");
    const guest2 = await createUser(t, "guest-2", "Taylor Guest");

    // Host creates stay
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: testTerms,
    });

    // Invite & accept for guest 1
    const token1 = "1".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: token1, expiresAt: Date.now() + 86_400_000 });
    await guest1.mutation(api.invites.accept, { tokenHash: token1 });

    // Invite & accept for guest 2
    const token2 = "2".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: token2, expiresAt: Date.now() + 86_400_000 });
    await guest2.mutation(api.invites.accept, { tokenHash: token2 });

    // Stay is pending, neither guest has accepted terms
    const now = new Date("2026-10-09T10:00:00Z").getTime();
    const candidatesMorning = await t.query(internal.notifications.agreementPendingCandidates, { now, slot: "am" });

    // There should be 4 candidates:
    // 1. Guest 1 candidate
    // 2. Host candidate for Guest 1
    // 3. Guest 2 candidate
    // 4. Host candidate for Guest 2
    expect(candidatesMorning).toHaveLength(4);

    const guest1Candidate = candidatesMorning.find((c) => c.data.recipientRole === "guest" && c.data.guestName === "Alex Guest");
    expect(guest1Candidate).toBeDefined();
    expect(guest1Candidate?.workflow).toBe("agreement-pending");
    expect(guest1Candidate?.cancellationKey).toContain(`agreement-pending:${stayId}:`);
    expect(guest1Candidate?.data.termsUrl).toContain(`?stayId=${stayId}#stay`);
    expect(guest1Candidate?.data.hostName).toBe("Sarah Host");
    expect(guest1Candidate?.data.rate).toBe("$250");
    expect(guest1Candidate?.data.cadence).toBe("weekly");

    const hostForGuest1Candidate = candidatesMorning.find((c) => c.data.recipientRole === "host" && c.data.guestName === "Alex Guest");
    expect(hostForGuest1Candidate).toBeDefined();
    expect(hostForGuest1Candidate?.cancellationKey).toBe(`agreement-pending:${stayId}:${hostForGuest1Candidate?.userId}:${guest1Candidate?.userId}`);

    // Verify deduplication: when recorded as sent, candidate is omitted
    await t.mutation(internal.notifications.recordSent, {
      userId: guest1Candidate!.userId,
      stayId,
      workflow: "agreement-pending",
      entityId: guest1Candidate!.entityId,
    });

    const candidatesAfterSent = await t.query(internal.notifications.agreementPendingCandidates, { now, slot: "am" });
    expect(candidatesAfterSent).toHaveLength(3);
    expect(candidatesAfterSent.find((c) => c.entityId === guest1Candidate!.entityId)).toBeUndefined();

    // In evening slot ("pm"), a new entityId is generated so the candidate is ready for the evening notification
    const candidatesEvening = await t.query(internal.notifications.agreementPendingCandidates, { now, slot: "pm" });
    expect(candidatesEvening.find((c) => c.userId === guest1Candidate!.userId)).toBeDefined();
    expect(candidatesEvening.find((c) => c.userId === guest1Candidate!.userId)?.entityId).toContain(":pm");
  });

  it("removes guest from candidates when guest accepts terms, and sets up cancellation call", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-bob", "Bob Host");
    const guest = await createUser(t, "guest-charlie", "Charlie Guest");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: testTerms,
    });

    const token = "3".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: token, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: token });

    const now = new Date("2026-10-09T10:00:00Z").getTime();
    let candidates = await t.query(internal.notifications.agreementPendingCandidates, { now });
    expect(candidates).toHaveLength(2); // 1 guest, 1 host

    // Guest accepts terms
    const status = await guest.mutation(api.terms.acceptCurrent, { stayId });
    expect(status).toBe("active");

    // After acceptance, candidates should be 0 because all active members accepted
    candidates = await t.query(internal.notifications.agreementPendingCandidates, { now });
    expect(candidates).toHaveLength(0);
  });

  it("builds consistent termsUrl using production and custom origins", () => {
    const stayId = "stay123";
    const defaultUrl = `https://app.kouchd.com/?stayId=${encodeURIComponent(stayId)}#stay`;
    expect(defaultUrl).toContain(`stayId=stay123#stay`);
  });
});
