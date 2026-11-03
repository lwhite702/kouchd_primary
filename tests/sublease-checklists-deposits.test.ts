import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { FEATURE_FLAGS } from "../lib/flags/config";
import { grantPlus } from "./helpers/plans";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

async function setSubleaseFlag(
  t: ReturnType<typeof convexTest>,
  override: "enabled" | "disabled",
) {
  await t.run(async ({ db }) => {
    const flags = await db.query("featureFlags").collect();
    const existing = flags.find((f) => f.key === FEATURE_FLAGS.SUBLEASES);
    if (existing) {
      await db.patch(existing._id, { override, updatedAt: Date.now() });
    } else {
      await db.insert("featureFlags", {
        key: FEATURE_FLAGS.SUBLEASES,
        override,
        updatedAt: Date.now(),
      });
    }
  });
}

const baseTerms = {
  startDate: "2026-11-01",
  endDate: "2026-12-01",
  cadence: "monthly" as const,
  paymentDayOfMonth: 1,
  billingBasis: "continuous" as const,
  rateCents: 150000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Sublease Welcome",
};

const setupWeeklyTerms = {
  startDate: "2026-11-01",
  endDate: "2026-12-01",
  cadence: "weekly" as const,
  paymentDayOfWeek: 1,
  rateCents: 50000,
  earlyDiscountEnabled: false,
  earlyDiscountPercentage: 0,
  earlyDiscountDays: 0,
  lateFeeEnabled: false,
  lateFeeCents: 0,
  graceDays: 0,
  houseNotes: "Setup Stay",
};

async function createActor(t: ReturnType<typeof convexTest>, subject: string) {
  const actor = t.withIdentity({ subject, name: subject });
  await actor.mutation(api.users.syncCurrent, {});
  return actor;
}

describe("Sublease condition checklists and deposit records (Step 5)", () => {
  it("submits, reviews, and locks condition checklists with private/shared separation", async () => {
    const t = convexTest(schema, modules);
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await setSubleaseFlag(t, "enabled");
    const host = await createActor(t, "host_user");
    const guest = await createActor(t, "guest_user");

    const setupStayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      name: "Setup Stay",
      terms: setupWeeklyTerms,
    });
    await grantPlus(t, setupStayId);

    const stayId = await host.mutation(api.stays.create, {
      name: "Private Room Sublease",
      timezone: "UTC",
      arrangement: "sublease",
      subleaseLayout: "private_room",
      roommateCount: 2,
      landlordConsentAnswer: "written_permission",
      terms: baseTerms,
    });

    const bundle = await host.query(api.stays.getBundle, { stayId });
    const referralCode = bundle.stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const guestBundle = await guest.query(api.stays.getBundle, { stayId });
    const guestUserId = guestBundle.membership.userId;

    // 1. Initial query returns empty checklists
    const initialChecklists = await host.query(api.checklists.getByStay, {
      stayId,
      guestUserId,
    });
    expect(initialChecklists.moveIn).toBeNull();
    expect(initialChecklists.moveOut).toBeNull();

    // 2. Host submits move-in checklist with both private and shared items
    const moveInItems = [
      {
        id: "item_1",
        area: "Bedroom 2",
        category: "private" as const,
        item: "Hardwood floors",
        condition: "good" as const,
        notes: "Minor scuff near door",
      },
      {
        id: "item_2",
        area: "Kitchen",
        category: "shared" as const,
        item: "Refrigerator & Freezer",
        condition: "good" as const,
      },
      {
        id: "item_3",
        area: "Common Bathroom",
        category: "shared" as const,
        item: "Sink and plumbing",
        condition: "fair" as const,
        notes: "Slight faucet drip",
      },
    ];

    const moveInId = await host.mutation(api.checklists.submit, {
      stayId,
      guestUserId,
      type: "move_in",
      items: moveInItems,
    });
    expect(moveInId).toBeDefined();

    // 3. Guest can see submitted checklist
    const guestView = await guest.query(api.checklists.getByStay, { stayId });
    expect(guestView.moveIn).toBeDefined();
    expect(guestView.moveIn?.status).toBe("submitted");
    expect(guestView.moveIn?.submittedAt).toBeDefined();
    expect(guestView.moveIn?.items).toHaveLength(3);

    // 4. Host cannot review own checklist
    await expect(
      host.mutation(api.checklists.review, {
        checklistId: moveInId,
        action: "confirm",
      }),
    ).rejects.toThrow("Checklist must be reviewed and confirmed by the counterpart");

    // 5. Guest confirms move-in checklist
    await guest.mutation(api.checklists.review, {
      checklistId: moveInId,
      action: "confirm",
      reviewNote: "Agreed with conditions upon move-in.",
    });

    const confirmedView = await guest.query(api.checklists.getByStay, { stayId });
    expect(confirmedView.moveIn?.status).toBe("confirmed");
    expect(confirmedView.moveIn?.reviewedBy).toBe(guestUserId);
    expect(confirmedView.moveIn?.reviewedAt).toBeDefined();
    expect(confirmedView.moveIn?.reviewNote).toBe("Agreed with conditions upon move-in.");

    // 6. Confirmed checklist is immutable
    await expect(
      host.mutation(api.checklists.submit, {
        stayId,
        guestUserId,
        type: "move_in",
        items: moveInItems,
      }),
    ).rejects.toThrow("Confirmed condition checklists cannot be modified");

    // 7. Move-out checklist with disputes
    const moveOutItems = [
      {
        id: "out_1",
        area: "Bedroom 2",
        category: "private" as const,
        item: "Hardwood floors",
        condition: "damaged" as const,
        notes: "Deep scratch on left side",
      },
      {
        id: "out_2",
        area: "Kitchen",
        category: "shared" as const,
        item: "Refrigerator",
        condition: "good" as const,
      },
    ];

    const moveOutId = await host.mutation(api.checklists.submit, {
      stayId,
      guestUserId,
      type: "move_out",
      items: moveOutItems,
    });

    // Guest disputes the scratch
    await guest.mutation(api.checklists.review, {
      checklistId: moveOutId,
      action: "dispute",
      reviewNote: "The floor scratch was pre-existing as noted in move-in inspection.",
      itemDisputes: [
        {
          itemId: "out_1",
          disputeNote: "Pre-existing scratch documented at move-in.",
        },
      ],
    });

    const disputedView = await host.query(api.checklists.getByStay, { stayId, guestUserId });
    expect(disputedView.moveOut?.status).toBe("disputed");
    expect(disputedView.moveOut?.items[0].disputeNote).toBe(
      "Pre-existing scratch documented at move-in.",
    );
  });

  it("records and tracks deposit records without affecting obligations, rent, or ledger balances", async () => {
    const t = convexTest(schema, modules);
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await setSubleaseFlag(t, "enabled");
    const host = await createActor(t, "host_user");
    const guest = await createActor(t, "guest_user");

    const setupStayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      name: "Setup Stay",
      terms: setupWeeklyTerms,
    });
    await grantPlus(t, setupStayId);

    const stayId = await host.mutation(api.stays.create, {
      name: "Whole Place Sublease",
      timezone: "UTC",
      arrangement: "sublease",
      subleaseLayout: "whole_place",
      landlordConsentAnswer: "not_required",
      terms: baseTerms,
    });

    const bundle = await host.query(api.stays.getBundle, { stayId });
    const referralCode = bundle.stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const guestBundle = await guest.query(api.stays.getBundle, { stayId });
    const guestUserId = guestBundle.membership.userId;

    // Check baseline ledger obligations before deposit
    const initialSummary = await host.query(api.obligations.summary, {
      stayId,
      asOfDate: "2026-11-15",
    });

    // 1. Host records deposit
    const depositId = await host.mutation(api.deposits.record, {
      stayId,
      guestUserId,
      amountCents: 150000, // $1,500.00
      holder: "host",
      agreedReturnDate: "2026-12-15",
    });

    expect(depositId).toBeDefined();

    // 2. Verify deposit does NOT create any obligation or alter ledger totals
    const afterDepositSummary = await host.query(api.obligations.summary, {
      stayId,
      asOfDate: "2026-11-15",
    });
    expect(afterDepositSummary.chargesCents).toBe(initialSummary.chargesCents);
    expect(afterDepositSummary.creditCents).toBe(initialSummary.creditCents);
    expect(afterDepositSummary.balanceCents).toBe(initialSummary.balanceCents);

    const obligations = await t.run(async ({ db }) =>
      db
        .query("obligations")
        .withIndex("by_stay", (q) => q.eq("stayId", stayId))
        .collect(),
    );
    expect(obligations.every((o) => o.type === "cadence")).toBe(true);

    // 3. Guest views deposit
    const guestDeposit = await guest.query(api.deposits.getByStay, { stayId });
    expect(guestDeposit).toBeDefined();
    expect(guestDeposit?.amountCents).toBe(150000);
    expect(guestDeposit?.holder).toBe("host");
    expect(guestDeposit?.status).toBe("recorded");

    // 4. Host proposes itemized deductions
    await host.mutation(api.deposits.proposeDeductions, {
      depositId,
      deductions: [
        {
          id: "deduct_1",
          description: "Professional carpet cleaning",
          amountCents: 15000, // $150.00
        },
      ],
    });

    const pendingDeposit = await guest.query(api.deposits.getByStay, { stayId });
    expect(pendingDeposit?.status).toBe("refund_pending");
    expect(pendingDeposit?.deductions).toHaveLength(1);
    expect(pendingDeposit?.deductions?.[0].amountCents).toBe(15000);

    // Deductions exceeding total deposit are rejected
    await expect(
      host.mutation(api.deposits.proposeDeductions, {
        depositId,
        deductions: [
          {
            id: "deduct_too_much",
            description: "Damage",
            amountCents: 200000,
          },
        ],
      }),
    ).rejects.toThrow("Total deductions cannot exceed total deposit amount");

    // 5. Guest confirms deposit return
    await guest.mutation(api.deposits.respond, {
      depositId,
      action: "confirm",
    });

    const returnedDeposit = await host.query(api.deposits.getByStay, {
      stayId,
      guestUserId,
    });
    expect(returnedDeposit?.status).toBe("returned");
    expect(returnedDeposit?.guestConfirmedAt).toBeDefined();

    // Final ledger integrity check
    const finalSummary = await host.query(api.obligations.summary, {
      stayId,
      asOfDate: "2026-11-15",
    });
    expect(finalSummary.chargesCents).toBe(initialSummary.chargesCents);
    expect(finalSummary.balanceCents).toBe(initialSummary.balanceCents);
  });

  it("blocks checklist and deposit mutations when a sublease is locked", async () => {
    const t = convexTest(schema, modules);
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    await setSubleaseFlag(t, "enabled");
    const host = await createActor(t, "host_user");
    const guest = await createActor(t, "guest_user");

    const setupStayId = await host.mutation(api.stays.create, {
      timezone: "UTC",
      name: "Setup Stay",
      terms: setupWeeklyTerms,
    });
    await grantPlus(t, setupStayId);

    const stayId = await host.mutation(api.stays.create, {
      name: "Lock Test Sublease",
      timezone: "UTC",
      arrangement: "sublease",
      subleaseLayout: "whole_place",
      landlordConsentAnswer: "not_required",
      terms: baseTerms,
    });

    const bundle = await host.query(api.stays.getBundle, { stayId });
    const referralCode = bundle.stay.referralCode!;
    await guest.mutation(api.referral.joinWithCode, { referralCode });
    await guest.mutation(api.terms.acceptCurrent, { stayId });

    const guestBundle = await guest.query(api.stays.getBundle, { stayId });
    const guestUserId = guestBundle.membership.userId;

    // Record initial deposit while unlocked
    const depositId = await host.mutation(api.deposits.record, {
      stayId,
      guestUserId,
      amountCents: 100000,
      holder: "host",
      agreedReturnDate: "2026-12-15",
    });

    // Now expire subscription snapshot so sublease becomes locked
    await t.run(async ({ db }) => {
      const stayDoc = await db.get(stayId);
      const snapshot = await db
        .query("subscriptionSnapshots")
        .withIndex("by_household_account", (q) =>
          q.eq("householdAccountId", stayDoc!.householdAccountId!),
        )
        .first();
      await db.patch(snapshot!._id, {
        status: "expired",
        currentPeriodEndsAt: Date.now() - 10000,
        updatedAt: Date.now(),
      });
    });

    // Verify lock state is locked
    const lockedBundle = await host.query(api.stays.getBundle, { stayId });
    expect(lockedBundle.subleaseLock?.locked).toBe(true);

    // Host checklist submit blocked
    await expect(
      host.mutation(api.checklists.submit, {
        stayId,
        guestUserId,
        type: "move_in",
        items: [
          {
            id: "1",
            area: "Living Room",
            category: "shared",
            item: "Couch",
            condition: "good",
          },
        ],
      }),
    ).rejects.toThrow(/Your Plus subscription has ended/);

    // Guest checklist submit blocked
    await expect(
      guest.mutation(api.checklists.submit, {
        stayId,
        guestUserId,
        type: "move_in",
        items: [
          {
            id: "1",
            area: "Living Room",
            category: "shared",
            item: "Couch",
            condition: "good",
          },
        ],
      }),
    ).rejects.toThrow(/This sublease is read-only/);

    // Host deposit record blocked
    await expect(
      host.mutation(api.deposits.record, {
        stayId,
        guestUserId,
        amountCents: 120000,
        holder: "host",
        agreedReturnDate: "2026-12-15",
      }),
    ).rejects.toThrow(/Your Plus subscription has ended/);

    // Host deductions proposal blocked
    await expect(
      host.mutation(api.deposits.proposeDeductions, {
        depositId,
        deductions: [{ id: "d1", description: "Cleaning", amountCents: 5000 }],
      }),
    ).rejects.toThrow(/Your Plus subscription has ended/);

    // Guest deposit respond blocked
    await expect(
      guest.mutation(api.deposits.respond, {
        depositId,
        action: "confirm",
      }),
    ).rejects.toThrow(/This sublease is read-only/);
  });
});
