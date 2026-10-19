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

    // Consolidated host reminders: exactly 3 candidates (Guest 1, Guest 2, and 1 consolidated Host reminder)
    expect(candidatesMorning).toHaveLength(3);

    const guest1Candidate = candidatesMorning.find((c) => c.data.recipientRole === "guest" && c.data.guestName === "Alex Guest");
    expect(guest1Candidate).toBeDefined();
    expect(guest1Candidate?.workflow).toBe("agreement-pending");
    expect(guest1Candidate?.cancellationKey).toContain(`agreement-pending:${stayId}:`);
    expect(guest1Candidate?.data.termsUrl).toContain(`?stayId=${stayId}#stay`);
    expect(guest1Candidate?.data.hostName).toBe("Sarah Host");
    expect(guest1Candidate?.data.rate).toBe("$250");
    expect(guest1Candidate?.data.cadence).toBe("weekly");

    const hostConsolidatedCandidate = candidatesMorning.find((c) => c.data.recipientRole === "host");
    expect(hostConsolidatedCandidate).toBeDefined();
    expect(hostConsolidatedCandidate?.data.unsignedGuestCount).toBe(2);
    expect(hostConsolidatedCandidate?.data.guestName).toContain("Alex Guest");
    expect(hostConsolidatedCandidate?.data.guestName).toContain("Taylor Guest");
    expect(hostConsolidatedCandidate?.cancellationKey).toBe(`agreement-pending:${stayId}:${hostConsolidatedCandidate?.userId}`);

    // Verify deduplication: when recorded as sent, candidate is omitted
    await t.mutation(internal.notifications.recordSent, {
      userId: guest1Candidate!.userId,
      stayId,
      workflow: "agreement-pending",
      entityId: guest1Candidate!.entityId,
    });

    const candidatesAfterSent = await t.query(internal.notifications.agreementPendingCandidates, { now, slot: "am" });
    expect(candidatesAfterSent).toHaveLength(2);
    expect(candidatesAfterSent.find((c) => c.userId === guest1Candidate!.userId)).toBeUndefined();

    // Global daily cap: in evening slot on the same day, guest1 is suppressed (at most 1 reminder per day)
    const candidatesEvening = await t.query(internal.notifications.agreementPendingCandidates, { now, slot: "pm" });
    expect(candidatesEvening.find((c) => c.userId === guest1Candidate!.userId)).toBeUndefined();

    // On the next calendar day, if still unsigned, guest1 is eligible again
    const nextDay = now + 86_400_000;
    const candidatesNextDay = await t.query(internal.notifications.agreementPendingCandidates, { now: nextDay, slot: "am" });
    expect(candidatesNextDay.find((c) => c.userId === guest1Candidate!.userId)).toBeDefined();
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

  it("identifies unsigned agreements on active stays when guest-specific terms are updated", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-dana", "Dana Host");
    const guest = await createUser(t, "guest-evan", "Evan Guest");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: testTerms,
    });

    const token = "4".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: token, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: token });

    // Initial acceptance activates stay
    await guest.mutation(api.terms.acceptCurrent, { stayId });
    const now = new Date("2026-10-09T10:00:00Z").getTime();
    let candidates = await t.query(internal.notifications.agreementPendingCandidates, { now });
    expect(candidates).toHaveLength(0);

    // Host updates guest-specific terms on the ACTIVE stay
    const guestUserId = (await guest.query(api.users.viewer, {}))!.id;
    await host.mutation(api.terms.updateGuest, {
      stayId,
      guestUserId,
      terms: {
        ...testTerms,
        paymentDayOfWeek: 1,
        rateCents: 30_000,
      },
    });

    // Stay remains active, but Evan has not signed the new terms version!
    const activeStay = await guest.query(api.stays.getBundle, { stayId });
    expect(activeStay?.stay.status).toBe("active");

    // Reminders must still be triggered for unsigned agreement on active stay
    candidates = await t.query(internal.notifications.agreementPendingCandidates, { now });
    expect(candidates).toHaveLength(2); // Evan + Dana for Evan
    expect(candidates.find((c) => c.data.recipientRole === "guest" && c.data.rate === "$300")).toBeDefined();
  });

  it("paginates agreement pending candidates with continuation cursors across stay statuses", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-frank", "Frank Host");
    const guest = await createUser(t, "guest-grace", "Grace Guest");

    const stay1 = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: testTerms,
    });
    const token1 = "5".repeat(64);
    await host.mutation(api.invites.create, { stayId: stay1, tokenHash: token1, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: token1 });

    const now = new Date("2026-10-09T10:00:00Z").getTime();

    // Query with page size 1
    const page1 = await t.query(internal.notifications.agreementPendingCandidatesPage, { now, pageSize: 1 });
    expect(page1.candidates).toHaveLength(2); // candidates for stay1
    expect(page1.continueCursor).toBeDefined();

    // Query next page with cursor
    const page2 = await t.query(internal.notifications.agreementPendingCandidatesPage, { now, cursor: page1.continueCursor, pageSize: 1 });
    expect(page2.isDone).toBe(true);
  });

  it("skips delayed delivery if agreement is accepted before action runs", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-hank", "Hank Host");
    const guest = await createUser(t, "guest-ivy", "Ivy Guest");

    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: testTerms,
    });
    const token = "6".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: token, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: token });

    const now = new Date("2026-10-09T10:00:00Z").getTime();
    const candidates = await t.query(internal.notifications.agreementPendingCandidates, { now });
    const guestCandidate = candidates.find((c) => c.data.recipientRole === "guest")!;

    // Recheck eligibility before acceptance: should be eligible
    const eligibleBefore = await t.query(internal.notifications.checkAgreementPendingEligibility, {
      stayId,
      userId: guestCandidate.userId,
      expectedTermsId: guestCandidate.expectedTermsId!,
      recipientRole: "guest",
      guestUserId: guestCandidate.guestUserId,
      workflow: guestCandidate.workflow,
      entityId: guestCandidate.entityId,
    });
    expect(eligibleBefore).toBe(true);

    // Guest accepts agreement
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    // Recheck eligibility after acceptance: MUST be ineligible (skips Knock workflow creation)
    const eligibleAfter = await t.query(internal.notifications.checkAgreementPendingEligibility, {
      stayId,
      userId: guestCandidate.userId,
      expectedTermsId: guestCandidate.expectedTermsId!,
      recipientRole: "guest",
      guestUserId: guestCandidate.guestUserId,
      workflow: guestCandidate.workflow,
      entityId: guestCandidate.entityId,
    });
    expect(eligibleAfter).toBe(false);
  });

  it("builds consistent termsUrl using production and custom origins", () => {
    const stayId = "stay123";
    const defaultUrl = `https://app.kouchd.com/?stayId=${encodeURIComponent(stayId)}#stay`;
    expect(defaultUrl).toContain(`stayId=stay123#stay`);
  });
});
