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
  rateCents: 15_000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: true,
  lateFeeCents: 1_000,
  graceDays: 2,
  houseNotes: "Quiet hours after 10 PM.",
};

async function createUser(t: ReturnType<typeof convexTest>, subject: string, name: string) {
  const actor = t.withIdentity({ subject, name, email: `${subject}@example.com` });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

describe("daily reminder cap and consolidation", () => {
  it("consolidates multiple chores due on the same day into a single notification per user", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-cap-1", "Host Alpha");
    const guest = await createUser(t, "guest-cap-1", "Guest Beta");

    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: testTerms });

    const inviteToken = "c".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: inviteToken, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: inviteToken });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const guestProfile = await guest.query(api.users.viewer, {});
    expect(guestProfile).toBeDefined();

    // Guest pays off obligations so payment reminder is not triggered
    const fullPayoff = await guest.mutation(api.contributions.create, {
      stayId,
      type: "payment",
      amountCents: 60_000,
      date: "2026-10-01",
      note: "Full month in advance",
      countsTowardBalance: true,
    });
    await host.mutation(api.contributions.confirm, { contributionId: fullPayoff });

    // Create 3 chores assigned to guest due on 2026-10-05
    await host.mutation(api.chores.create, {
      stayId,
      title: "Clean kitchen surfaces",
      note: "Wipe down counters",
      assignee: "guest",
      assigneeUserId: guestProfile!.id,
      dueDate: "2026-10-05",
    });
    await host.mutation(api.chores.create, {
      stayId,
      title: "Take out recycling",
      note: "Bins to the curb",
      assignee: "guest",
      assigneeUserId: guestProfile!.id,
      dueDate: "2026-10-05",
    });
    await host.mutation(api.chores.create, {
      stayId,
      title: "Restock paper towels",
      note: "Pantry shelf 2",
      assignee: "guest",
      assigneeUserId: guestProfile!.id,
      dueDate: "2026-10-05",
    });

    const candidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-10-05T13:00:00.000Z"),
    });

    const guestChoreReminders = candidates.filter(
      (c) => c.workflow === "chore-reminder" && c.userId === guestProfile!.id,
    );
    expect(guestChoreReminders).toHaveLength(1);

    const reminder = guestChoreReminders[0];
    expect(reminder.data.choreCount).toBe(3);
    expect(reminder.data.additionalChoresCount).toBe(2);
    expect(reminder.data.choreTitle).toContain("Clean kitchen surfaces and 2 more chores");
  });

  it("prioritizes payment reminders over chores so a user receives at most one reminder", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-cap-2", "Host Charlie");
    const guest = await createUser(t, "guest-cap-2", "Guest Delta");

    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: testTerms });

    const inviteToken = "d".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: inviteToken, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: inviteToken });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const guestProfile = await guest.query(api.users.viewer, {});
    expect(guestProfile).toBeDefined();

    // Guest has an unpaid obligation due on 2026-10-07
    // Also create a chore due on 2026-10-07
    await host.mutation(api.chores.create, {
      stayId,
      title: "Sweep patio",
      note: "Front and back",
      assignee: "guest",
      assigneeUserId: guestProfile!.id,
      dueDate: "2026-10-07",
    });

    const candidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-10-07T13:00:00.000Z"),
    });

    // Check all reminders for guest
    const guestReminders = candidates.filter((c) => c.userId === guestProfile!.id);
    expect(guestReminders).toHaveLength(1);
    expect(guestReminders[0].workflow).toBe("payment-due-reminder");
    expect(guestReminders[0].data.stage).toBe("due_today");
  });

  it("suppresses subsequent reminders on the same calendar day once a reminder is recorded as sent", async () => {
    const t = convexTest(schema, modules);
    const host = await createUser(t, "host-cap-3", "Host Echo");
    const guest = await createUser(t, "guest-cap-3", "Guest Foxtrot");

    const stayId = await host.mutation(api.stays.create, { timezone: "America/New_York", terms: testTerms });

    const inviteToken = "e".repeat(64);
    await host.mutation(api.invites.create, { stayId, tokenHash: inviteToken, expiresAt: Date.now() + 86_400_000 });
    await guest.mutation(api.invites.accept, { tokenHash: inviteToken });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const guestProfile = await guest.query(api.users.viewer, {});
    expect(guestProfile).toBeDefined();

    // Candidate query for 2026-10-07
    const initialCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-10-07T13:00:00.000Z"),
    });
    const guestInitial = initialCandidates.find((c) => c.userId === guestProfile!.id);
    expect(guestInitial).toBeDefined();

    // Record the reminder as sent today
    await t.mutation(internal.notifications.recordSent, {
      userId: guestProfile!.id,
      stayId,
      workflow: guestInitial!.workflow,
      entityId: guestInitial!.entityId,
      sentAt: Date.parse("2026-10-07T13:00:00.000Z"),
    });

    // Run query again on the same day (e.g. later in the day or next cron)
    const sameDayCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-10-07T18:00:00.000Z"),
    });
    expect(sameDayCandidates.some((c) => c.userId === guestProfile!.id)).toBe(false);

    // Also verify wasSent check
    const isSuppressed = await t.query(internal.notifications.wasSent, {
      userId: guestProfile!.id,
      stayId,
      workflow: "chore-reminder",
      entityId: "chore:some-other-chore:2026-10-07",
      now: Date.parse("2026-10-07T18:00:00.000Z"),
    });
    expect(isSuppressed).toBe(true);

    // On next calendar day (2026-10-08), if still unpaid, a new reminder is eligible
    const nextDayCandidates = await t.query(internal.notifications.reminderCandidates, {
      now: Date.parse("2026-10-08T13:00:00.000Z"),
    });
    const nextDayReminder = nextDayCandidates.find((c) => c.userId === guestProfile!.id);
    expect(nextDayReminder).toBeDefined();
    expect(nextDayReminder?.workflow).toBe("payment-due-reminder");
    expect(nextDayReminder?.data.stage).toBe("grace_overdue");
  });
});
