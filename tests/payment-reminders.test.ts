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
  startDate: "2026-09-01",
  endDate: "2026-09-28",
  cadence: "weekly" as const,
  rateCents: 20_000,
  earlyDiscountEnabled: true,
  earlyDiscountPercentage: 5,
  earlyDiscountDays: 2,
  lateFeeEnabled: true,
  lateFeeCents: 1_500, // $15.00
  graceDays: 2, // 2 days grace: due Sept 07, grace ends Sept 09
  houseNotes: "Quiet after 10:30 PM.",
};

async function createUser(t: ReturnType<typeof convexTest>, subject: string, name: string) {
  const actor = t.withIdentity({ subject, name, email: `${subject}@example.com` });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

describe("progressive payment reminder system with urgent language and consequences", () => {
  it("progresses through upcoming, due-today, grace-period, compounding late-fee, and critical notices until paid", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-reminders", "Host Lee");
    const guest = await createUser(t, "guest-reminders", "Guest Marcus");
    const paidGuest = await createUser(t, "guest-paid", "Guest Riley");

    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: testTerms });

    const inviteTokenGuest = "a".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: inviteTokenGuest, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: inviteTokenGuest });

    const inviteTokenPaid = "b".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: inviteTokenPaid, expiresAt: Date.now() + 86_400_000 });
    await paidGuest.mutation(api.invites.accept, { tokenHash: inviteTokenPaid });

    await guest.mutation(api.terms.acceptCurrent, { stayId });
    await paidGuest.mutation(api.terms.acceptCurrent, { stayId });

    // Guest pays $50 toward $200 obligation (leaves $150 balance)
    const partialContributionId = await guest.mutation(api.contributions.create, {
      stayId,
      type: "payment",
      amountCents: 5_000,
      date: "2026-09-06",
      note: "Partial payment",
      countsTowardBalance: true,
    });
    await host.mutation(api.contributions.confirm, { contributionId: partialContributionId });

    // Paid guest pays $200 in full (balance $0)
    const fullContributionId = await paidGuest.mutation(api.contributions.create, {
      stayId,
      type: "payment",
      amountCents: 20_000,
      date: "2026-09-06",
      note: "Full payment",
      countsTowardBalance: true,
    });
    await host.mutation(api.contributions.confirm, { contributionId: fullContributionId });

    const guestProfile = await guest.query(api.users.viewer, {});
    const paidGuestProfile = await paidGuest.query(api.users.viewer, {});

    // =========================================================================
    // 1. STAGE: UPCOMING (1 day before due date: 2026-09-06)
    // =========================================================================
    const upcomingCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-06T12:00:00.000Z"),
    });
    const upcoming = upcomingCandidates.find((c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id);
    expect(upcoming).toBeDefined();
    expect(upcoming?.data.stage).toBe("upcoming");
    expect(upcoming?.data.urgencyLevel).toBe("normal");
    expect(upcoming?.data.amountDue).toBe(15_000);
    expect(upcoming?.data.consequences).toContain("early payment discount");
    // Paid guest is skipped
    expect(upcomingCandidates.find((c) => c.userId === paidGuestProfile?.id && c.workflow === "payment-due-reminder")).toBeUndefined();

    // Deduplication check: Record that upcoming reminder was sent
    await t.mutation(internal.notifications.recordSent, {
      userId: guestProfile!.id,
      stayId,
      workflow: "payment-due-reminder",
      entityId: upcoming!.entityId,
      detail: upcoming!.data.detail as string,
      action: upcoming!.data.action as string,
    });
    const afterSentCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-06T12:00:00.000Z"),
    });
    expect(afterSentCandidates.find((c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id)).toBeUndefined();

    // Check activity log recorded notification
    const activities = await host.query(api.activity.list, { stayId });
    expect(activities.some((item) => item.kind === "notification" && item.detail.includes("Upcoming stay contribution"))).toBe(true);

    // =========================================================================
    // 2. STAGE: DUE TODAY (On due date: 2026-09-07)
    // =========================================================================
    const dueTodayCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-07T12:00:00.000Z"),
    });
    const dueToday = dueTodayCandidates.find((c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id);
    expect(dueToday).toBeDefined();
    expect(dueToday?.data.stage).toBe("due_today");
    expect(dueToday?.data.urgencyLevel).toBe("moderate");
    expect(dueToday?.data.periodLabel).toContain("[DUE TODAY]");
    expect(dueToday?.data.consequences).toContain("grace period");
    expect(dueToday?.data.consequences).toContain("$15"); // late fee warning

    // =========================================================================
    // 3. STAGE: OVERDUE IN GRACE PERIOD (Day 1 past due: 2026-09-08)
    // =========================================================================
    const graceCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-08T12:00:00.000Z"),
    });
    const graceOverdue = graceCandidates.find((c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id);
    expect(graceOverdue).toBeDefined();
    expect(graceOverdue?.data.stage).toBe("grace_overdue");
    expect(graceOverdue?.data.urgencyLevel).toBe("urgent");
    expect(graceOverdue?.data.periodLabel).toContain("[PAST DUE — GRACE PERIOD]");
    expect(graceOverdue?.data.consequences).toContain("Late Fees");
    expect(graceOverdue?.data.consequences).toContain("$15");
    expect(graceOverdue?.data.consequences).toContain("Discount Forfeiture");

    // =========================================================================
    // 4. STAGE: FINAL GRACE PERIOD NOTICE (Day 2 past due: 2026-09-09)
    // =========================================================================
    const finalGraceCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-09T12:00:00.000Z"),
    });
    const finalGrace = finalGraceCandidates.find((c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id);
    expect(finalGrace).toBeDefined();
    expect(finalGrace?.data.stage).toBe("grace_final");
    expect(finalGrace?.data.urgencyLevel).toBe("urgent");
    expect(finalGrace?.data.periodLabel).toContain("[FINAL GRACE NOTICE — LATE FEE IMMINENT]");
    expect(finalGrace?.data.consequences).toContain("tomorrow morning");

    // =========================================================================
    // 5. STAGE: LATE FEE ASSESSED & COMPOUNDING (Day 3 past due: 2026-09-10)
    // =========================================================================
    const lateFeeCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-10T12:00:00.000Z"),
    });
    const lateFeeAssessed = lateFeeCandidates.find((c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id);
    expect(lateFeeAssessed).toBeDefined();
    expect(lateFeeAssessed?.data.stage).toBe("late_fee_assessed");
    expect(lateFeeAssessed?.data.urgencyLevel).toBe("urgent");
    expect(lateFeeAssessed?.data.periodLabel).toContain("[NOTICE: LATE FEE ASSESSED]");
    // Balance now includes $15 late fee: $150 + $15 = $165 ($16,500 cents)
    expect(lateFeeAssessed?.data.amountDue).toBe(16_500);
    expect(lateFeeAssessed?.data.balance).toBe(16_500);
    expect(lateFeeAssessed?.data.consequences).toContain("Compounding Fees");
    expect(lateFeeAssessed?.data.consequences).toContain("Overdue Plan");

    // =========================================================================
    // 6. STAGE: CRITICAL DELINQUENCY NOTICE (Day 18 past due: 2026-09-25)
    // =========================================================================
    const criticalCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-25T12:00:00.000Z"),
    });
    const critical = criticalCandidates.find(
      (c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id && c.data.dueDate === "2026-09-07",
    );
    expect(critical).toBeDefined();
    expect(critical?.data.stage).toBe("critical_delinquency");
    expect(critical?.data.urgencyLevel).toBe("critical");
    expect(critical?.data.periodLabel).toContain("[ATTENTION NEEDED: OVERDUE BALANCE]");
    expect(critical?.data.consequences).toContain("Host Review");
    expect(critical?.data.consequences).toContain("Household Standing");
    expect(critical?.data.consequences).toContain("Support Available");

    // =========================================================================
    // 7. STOPS ONCE PAID (Guest pays off remaining balance)
    // =========================================================================
    // Balance on 2026-09-25 has 3 compounding late fees: $150 + 3 * $15 = $195 ($19,500)
    const payoffContributionId = await guest.mutation(api.contributions.create, {
      stayId,
      type: "payment",
      amountCents: critical!.data.amountDue as number,
      date: "2026-09-25",
      note: "Full payoff with late fees",
      countsTowardBalance: true,
    });
    await host.mutation(api.contributions.confirm, { contributionId: payoffContributionId });

    // After payoff of the 2026-09-07 obligation, reminders for that obligation stop completely
    const afterPayoffCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-25T14:00:00.000Z"),
    });
    expect(
      afterPayoffCandidates.find(
        (c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id && c.data.dueDate === "2026-09-07",
      ),
    ).toBeUndefined();

    // Check again on subsequent days: reminders for that obligation remain stopped!
    const subsequentCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-09-27T12:00:00.000Z"),
    });
    expect(
      subsequentCandidates.find(
        (c) => c.workflow === "payment-due-reminder" && c.userId === guestProfile?.id && c.data.dueDate === "2026-09-07",
      ),
    ).toBeUndefined();
  });
});
