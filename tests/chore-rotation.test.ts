import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
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

async function createHousehold() {
  const t = convexTest(schema, modules);
  const actors = ["host", "guest1", "guest2"].map((subject) =>
    t.withIdentity({ subject, name: subject }),
  );
  for (const actor of actors) await actor.mutation(api.users.syncCurrent, {});
  const [host, guest1, guest2] = actors;

  const stayId = await host.mutation(api.stays.create, {
    timezone: "UTC",
    terms,
  });
  await grantPlus(t, stayId);

  const hostBundle = await host.query(api.stays.getBundle, { stayId });
  const hostUserId = hostBundle.membership.userId;
  const referralCode = hostBundle.stay.referralCode!;

  await guest1.mutation(api.referral.joinWithCode, { referralCode });
  await guest2.mutation(api.referral.joinWithCode, { referralCode });

  const guest1Bundle = await guest1.query(api.stays.getBundle, { stayId });
  const guest1UserId = guest1Bundle.membership.userId;

  const guest2Bundle = await guest2.query(api.stays.getBundle, { stayId });
  const guest2UserId = guest2Bundle.membership.userId;

  return { host, guest1, guest2, stayId, hostUserId, guest1UserId, guest2UserId };
}

describe("automated turn-taking chore rotation (WRE-267)", () => {
  it("rotates assignees in sequence (host -> guest1 -> guest2 -> host) upon chore completion", async () => {
    const { host, guest1, guest2, stayId, hostUserId, guest1UserId, guest2UserId } =
      await createHousehold();

    // 1. Host creates a recurring weekly chore with turn rotation enabled, starting assigned to Host
    // Set dueDate in the future so that standard single-interval increment applies
    const choreId1 = await host.mutation(api.chores.create, {
      stayId,
      title: "Take out kitchen trash & recycling",
      note: "Bin goes out by Tuesday night",
      assignee: "host",
      assigneeUserId: hostUserId,
      dueDate: "2026-11-10",
      repeatCadence: "weekly",
      rotateAssignee: true,
    });

    const choresList1 = await host.query(api.chores.list, { stayId });
    const chore1 = choresList1.find((c) => c._id === choreId1);
    expect(chore1).toBeDefined();
    expect(chore1?.assigneeUserId).toBe(hostUserId);
    expect(chore1?.rotateAssignee).toBe(true);
    expect(chore1?.repeatCadence).toBe("weekly");

    // 2. Host finishes their turn and checks off the chore
    await host.mutation(api.chores.toggle, { choreId: choreId1 });

    // Chore 1 should now be completed
    const choresAfterToggle1 = await host.query(api.chores.list, { stayId });
    const completedChore1 = choresAfterToggle1.find((c) => c._id === choreId1);
    expect(completedChore1?.completedAt).toBeDefined();

    // Next occurrence should be assigned to guest1 (joined after host)
    const activeChoresAfter1 = choresAfterToggle1.filter((c) => !c.completedAt);
    expect(activeChoresAfter1).toHaveLength(1);
    const chore2 = activeChoresAfter1[0];
    expect(chore2.assigneeUserId).toBe(guest1UserId);
    expect(chore2.assignee).toBe("guest");
    expect(chore2.rotateAssignee).toBe(true);
    expect(chore2.dueDate).toBe("2026-11-17");

    // 3. Guest 1 finishes their turn and checks off the chore
    await guest1.mutation(api.chores.toggle, { choreId: chore2._id });

    const choresAfterToggle2 = await guest1.query(api.chores.list, { stayId });
    const activeChoresAfter2 = choresAfterToggle2.filter((c) => !c.completedAt);
    expect(activeChoresAfter2).toHaveLength(1);
    const chore3 = activeChoresAfter2[0];
    // Next occurrence should be assigned to guest2
    expect(chore3.assigneeUserId).toBe(guest2UserId);
    expect(chore3.assignee).toBe("guest");
    expect(chore3.rotateAssignee).toBe(true);
    expect(chore3.dueDate).toBe("2026-11-24");

    // 4. Guest 2 finishes their turn and checks off the chore
    await guest2.mutation(api.chores.toggle, { choreId: chore3._id });

    const choresAfterToggle3 = await guest2.query(api.chores.list, { stayId });
    const activeChoresAfter3 = choresAfterToggle3.filter((c) => !c.completedAt);
    expect(activeChoresAfter3).toHaveLength(1);
    const chore4 = activeChoresAfter3[0];
    // Next occurrence wraps around back to host!
    expect(chore4.assigneeUserId).toBe(hostUserId);
    expect(chore4.assignee).toBe("host");
    expect(chore4.rotateAssignee).toBe(true);
    expect(chore4.dueDate).toBe("2026-12-01");
  });

  it("does not rotate assignee if rotateAssignee is false or not set", async () => {
    const { host, stayId, hostUserId } = await createHousehold();

    const choreId = await host.mutation(api.chores.create, {
      stayId,
      title: "Clean bathroom mirror",
      note: "Host responsibility",
      assignee: "host",
      assigneeUserId: hostUserId,
      dueDate: "2026-10-06",
      repeatCadence: "weekly",
      rotateAssignee: false,
    });

    await host.mutation(api.chores.toggle, { choreId });

    const chores = await host.query(api.chores.list, { stayId });
    const activeChore = chores.find((c) => !c.completedAt);
    expect(activeChore).toBeDefined();
    expect(activeChore?.assigneeUserId).toBe(hostUserId);
    expect(activeChore?.rotateAssignee).toBe(false);
  });
});
