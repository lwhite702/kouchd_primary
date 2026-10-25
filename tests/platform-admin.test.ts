import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { requirePlatformEntryKey } from "../lib/platform/console";
import { getHelpScoutOpsStatus, getMintlifyOpsStatus } from "../lib/platform/providers";

vi.mock("server-only", () => ({}));

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

describe("Platform Console Discovery & Access Gate", () => {
  const originalEnv = { ...process.env };
  const validSlug = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails closed when PLATFORM_CONSOLE_SLUG is unset", () => {
    delete process.env.PLATFORM_CONSOLE_SLUG;
    expect(() => requirePlatformEntryKey("anything")).toThrow();
  });

  it("fails closed when consoleKey does not match PLATFORM_CONSOLE_SLUG", () => {
    process.env.PLATFORM_CONSOLE_SLUG = validSlug;
    expect(() => requirePlatformEntryKey("wrong-key-value")).toThrow();
  });

  it("fails closed when auth bypass is enabled", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    process.env.PLATFORM_CONSOLE_SLUG = validSlug;
    process.env.AUTH_BYPASS_ENABLED = "true";
    expect(() => requirePlatformEntryKey(validSlug)).toThrow();
  });

  it("succeeds when consoleKey matches and bypass is false", () => {
    process.env.PLATFORM_CONSOLE_SLUG = validSlug;
    delete process.env.AUTH_BYPASS_ENABLED;
    expect(() => requirePlatformEntryKey(validSlug)).not.toThrow();
  });
});

describe("Convex Platform Admin Backend Authorization & Privacy", () => {
  const adminEmail = "operator@kouchd.com";

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = adminEmail;
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    process.env.REVENUECAT_WEBHOOK_AUTHORIZATION = "Bearer test-webhook-secret";
  });

  it("denies access to non-admin users across all platform queries and mutations", async () => {
    const t = convexTest(schema, modules);
    const standardUser = t.withIdentity({
      subject: "standard-user",
      name: "Standard User",
      email: "standard@example.com",
    });
    await standardUser.mutation(api.users.syncCurrent, {});

    await expect(standardUser.query(api.admin.getOverviewStats, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
    await expect(standardUser.query(api.admin.getPlatformOpsOverview, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
    await expect(standardUser.query(api.admin.getRevenueCatOps, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
    await expect(standardUser.query(api.admin.getKnockOps, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
    await expect(standardUser.query(api.admin.getLoopsOps, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
    await expect(standardUser.query(api.admin.listPlatformAuditLogs, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
    await expect(
      standardUser.mutation(api.admin.reconcileHouseholdOwnership, {
        reason: "Unauthorized attempt",
      })
    ).rejects.toThrow("Unauthorized: Platform admin grant required");
  });

  it("redacts sensitive household logistics in getStayDetail and enforces audited admin grants", async () => {
    const t = convexTest(schema, modules);

    const host = t.withIdentity({
      subject: "host-user",
      name: "Host Sarah",
      email: "host@example.com",
    });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: {
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        cadence: "weekly",
        rateCents: 25_000,
        earlyDiscountEnabled: false,
        earlyDiscountPercentage: 0,
        earlyDiscountDays: 0,
        lateFeeEnabled: false,
        lateFeeCents: 0,
        graceDays: 0,
        houseNotes: "Welcome!",
      },
    });

    // Patch stay with sensitive houseInfo to verify redaction
    await t.run(async (ctx) => {
      await ctx.db.patch(stayId, {
        houseInfo: {
          streetAddress: "742 Evergreen Terrace",
          cityStateZip: "Springfield, OR 97477",
          wifiNetwork: "SecretHomeNet",
          wifiPassword: "super-secret-wifi-password",
          doorCode: "9876#",
          emergencyContact: "555-0199",
          otherNotes: "Spare key under flowerpot",
        },
      });
    });

    const admin = t.withIdentity({
      subject: "admin-user",
      name: "Platform Operator",
      email: adminEmail,
    });
    await admin.mutation(api.users.syncCurrent, {});

    // Stay detail must redact sensitive fields
    const stayDetail = await admin.query(api.admin.getStayDetail, { stayId });
    expect(stayDetail).not.toBeNull();
    expect(stayDetail?.host?.name).toBe("Host Sarah");
    expect((stayDetail?.stay as Record<string, unknown>).houseInfo).toBeUndefined();
    expect(stayDetail?.stay.houseInfoSummary).toEqual({
      cityStateZip: "Springfield, OR 97477",
      hasStreetAddress: true,
      hasWifiConfigured: true,
      hasDoorCodeConfigured: true,
      hasEmergencyContact: true,
      hasOtherNotes: true,
    });

    // Toggle admin requires a reason >= 5 chars
    const users = await admin.query(api.admin.listUsers, { searchTerm: "Sarah" });
    const targetUser = users[0];
    await expect(
      admin.mutation(api.admin.toggleAdmin, {
        userId: targetUser._id,
        isAdmin: true,
        reason: "no",
      })
    ).rejects.toThrow("Audit reason is required (minimum 5 characters)");

    const toggleResult = await admin.mutation(api.admin.toggleAdmin, {
      userId: targetUser._id,
      isAdmin: true,
      reason: "Granting temporary platform read access for support review",
    });
    expect(toggleResult.isAdmin).toBe(true);

    // Promoted DB admin can read overview stats, but CANNOT promote/revoke other admins
    const promotedUser = t.withIdentity({
      subject: "host-user",
      name: "Host Sarah",
      email: "host@example.com",
    });
    const promotedStats = await promotedUser.query(api.admin.getOverviewStats, {});
    expect(promotedStats.totalStays).toBeGreaterThanOrEqual(1);

    await expect(
      promotedUser.mutation(api.admin.toggleAdmin, {
        userId: targetUser._id,
        isAdmin: false,
        reason: "Attempting self-change without env allowlist",
      })
    ).rejects.toThrow("Forbidden: Only explicit environment-allowlisted operators");

    // Verify audit log was written
    const auditLogs = await admin.query(api.admin.listPlatformAuditLogs, {});
    expect(auditLogs.some((l) => l.action === "platform_admin.grant" && l.targetId === targetUser._id)).toBe(true);
  });

  it("provides RevenueCat ops visibility, sandbox/production distinction, and audited ownership reconciliation", async () => {
    const t = convexTest(schema, modules);

    const host = t.withIdentity({
      subject: "rc-host-clerk-id",
      name: "Host Marcus",
      email: "marcus@example.com",
    });
    const hostUserId = await host.mutation(api.users.syncCurrent, {});

    const admin = t.withIdentity({
      subject: "admin-user",
      name: "Platform Operator",
      email: adminEmail,
    });
    await admin.mutation(api.users.syncCurrent, {});

    // Create a legacy stay missing householdAccountId and ingest both sandbox and production events
    await t.run(async (ctx) => {
      await ctx.db.insert("stays", {
        hostUserId,
        status: "active",
        timezone: "America/Chicago",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.mutation(internal.subscriptions.ingestRevenueCatEvent, {
      providerEventId: "evt_sandbox_1",
      providerAppUserId: "rc-host-clerk-id",
      eventType: "INITIAL_PURCHASE",
      productId: "kouchd_host_plus_monthly",
      entitlement: "plus",
      status: "active",
      environment: "sandbox",
      currentPeriodEndsAt: Date.now() + 30 * 86_400_000,
      occurredAt: Date.now() - 10_000,
    });

    await t.mutation(internal.subscriptions.ingestRevenueCatEvent, {
      providerEventId: "evt_prod_1",
      providerAppUserId: "rc-host-clerk-id",
      eventType: "INITIAL_PURCHASE",
      productId: "kouchd_pro_monthly",
      entitlement: "pro",
      status: "active",
      environment: "production",
      currentPeriodEndsAt: Date.now() + 30 * 86_400_000,
      occurredAt: Date.now() - 5_000,
    });

    const rcOpsBefore = await admin.query(api.admin.getRevenueCatOps, {});
    expect(rcOpsBefore.config.expectedEnvironment).toBe("production");
    expect(rcOpsBefore.reconciliation.missingAccountLinks).toBe(1);
    expect(rcOpsBefore.snapshots).toHaveLength(2);

    const prodSnap = rcOpsBefore.snapshots.find((s) => s.environment === "production");
    const sandboxSnap = rcOpsBefore.snapshots.find((s) => s.environment === "sandbox");
    expect(prodSnap?.environmentMatchesExpected).toBe(true);
    expect(prodSnap?.effectivePlan).toBe("householdPro");
    expect(sandboxSnap?.environmentMatchesExpected).toBe(false);

    // Reconcile household ownership with audit reason
    const reconcileRes = await admin.mutation(api.admin.reconcileHouseholdOwnership, {
      reason: "Backfill missing householdAccountId for legacy stay",
    });
    expect(reconcileRes.linked).toBe(1);

    const rcOpsAfter = await admin.query(api.admin.getRevenueCatOps, {});
    expect(rcOpsAfter.reconciliation.missingAccountLinks).toBe(0);

    const logs = await admin.query(api.admin.listPlatformAuditLogs, { provider: "revenuecat" });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("revenuecat.reconcile_household_ownership");
  });

  it("tracks Knock workflow events without raw PII payloads and enforces idempotent, cap-aware retries", async () => {
    const t = convexTest(schema, modules);

    const guest = t.withIdentity({
      subject: "knock-guest",
      name: "Guest Elena",
      email: "elena@example.com",
    });
    const guestUserId = await guest.mutation(api.users.syncCurrent, {});

    const host = t.withIdentity({
      subject: "knock-host",
      name: "Host David",
      email: "david@example.com",
    });
    await host.mutation(api.users.syncCurrent, {});
    const stayId = await host.mutation(api.stays.create, {
      timezone: "America/New_York",
      terms: {
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        cadence: "weekly",
        rateCents: 20_000,
        earlyDiscountEnabled: false,
        earlyDiscountPercentage: 0,
        earlyDiscountDays: 0,
        lateFeeEnabled: false,
        lateFeeCents: 0,
        graceDays: 0,
        houseNotes: "Quiet hours after 10pm",
      },
    });

    const admin = t.withIdentity({
      subject: "admin-user",
      name: "Platform Operator",
      email: adminEmail,
    });
    await admin.mutation(api.users.syncCurrent, {});

    // Record a failed notification event
    await t.mutation(internal.notifications.recordNotificationOutcome, {
      userId: guestUserId,
      stayId,
      workflow: "payment-due-reminder",
      entityId: `obligation:test:due-today:2026-10-25`,
      status: "failed",
      errorSummary: "Knock API timeout",
    });

    const knockOps = await admin.query(api.admin.getKnockOps, {});
    expect(knockOps.failures).toHaveLength(1);
    const failedEvent = knockOps.failures[0];
    expect(failedEvent.recipientEmailRedacted).toBe("el***@example.com");
    expect((failedEvent as Record<string, unknown>).data).toBeUndefined();

    // Retry requires reason
    await expect(
      admin.mutation(api.admin.retryNotificationEvent, {
        eventId: failedEvent._id,
        reason: "fix",
      })
    ).rejects.toThrow("Audit reason is required");

    const retryResult = await admin.mutation(api.admin.retryNotificationEvent, {
      eventId: failedEvent._id,
      reason: "Retrying transient Knock timeout for single recipient",
    });
    expect(retryResult.queued).toBe(true);

    // If the notification is then marked as sent, retrying again must be rejected (idempotency)
    await t.mutation(internal.notifications.recordSent, {
      userId: guestUserId,
      stayId,
      workflow: "payment-due-reminder",
      entityId: `obligation:test:due-today:2026-10-25`,
    });

    await expect(
      admin.mutation(api.admin.retryNotificationEvent, {
        eventId: failedEvent._id,
        reason: "Attempting duplicate retry after delivery",
      })
    ).rejects.toThrow("Cannot retry notification event in 'sent' state");
  });

  it("exposes Loops marketing consent and suppression records read-only with redacted emails", async () => {
    const t = convexTest(schema, modules);

    const admin = t.withIdentity({
      subject: "admin-user",
      name: "Platform Operator",
      email: adminEmail,
    });
    await admin.mutation(api.users.syncCurrent, {});

    await t.run(async (ctx) => {
      await ctx.db.insert("marketingConsentEvents", {
        email: "subscriber@example.com",
        status: "subscribed",
        source: "Kouchd marketing website",
        consentConfirmed: true,
        doubleOptInStatus: "confirmed",
        requestedAt: Date.now() - 60_000,
        confirmedAt: Date.now() - 30_000,
        updatedAt: Date.now() - 30_000,
      });
      await ctx.db.insert("marketingConsentEvents", {
        email: "unsub@example.com",
        status: "suppressed",
        source: "Kouchd marketing website",
        consentConfirmed: false,
        doubleOptInStatus: "confirmed",
        requestedAt: Date.now() - 120_000,
        suppressedAt: Date.now() - 10_000,
        updatedAt: Date.now() - 10_000,
      });
    });

    const loopsOps = await admin.query(api.admin.getLoopsOps, {});
    expect(loopsOps.config.autoAddHostsOrGuests).toBe(false);
    expect(loopsOps.counts.subscribed).toBe(1);
    expect(loopsOps.counts.suppressed).toBe(1);
    expect(loopsOps.consents[0].emailRedacted).toBe("un***@example.com");
  });

  it("requires audit reasons and logs feature flag overrides while keeping public flags.get sanitized", async () => {
    const t = convexTest(schema, modules);

    const admin = t.withIdentity({
      subject: "admin-user",
      name: "Platform Operator",
      email: adminEmail,
    });
    await admin.mutation(api.users.syncCurrent, {});

    await expect(
      admin.mutation(api.flags.setOverride, {
        key: "enable_sms_reminders",
        override: "disabled",
        reason: "no",
      })
    ).rejects.toThrow("Audit reason is required");

    await admin.mutation(api.flags.setOverride, {
      key: "enable_sms_reminders",
      override: "disabled",
      note: "Internal operator note",
      reason: "Pausing SMS reminders during carrier maintenance window",
    });

    // Public flags.get should not expose internal operator note
    const publicFlag = await t.query(api.flags.get, { key: "enable_sms_reminders" });
    expect(publicFlag.enabled).toBe(false);
    expect((publicFlag as Record<string, unknown>).note).toBeUndefined();

    // Admin audit log should contain the override event
    const logs = await admin.query(api.admin.listPlatformAuditLogs, { provider: "convex" });
    expect(logs.some((l) => l.action === "feature_flag.override_created" && l.targetId === "enable_sms_reminders")).toBe(true);
  });
});


describe("Help Scout & Mintlify Provider Verification Helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports Help Scout as setup_blocked when inbox and OAuth credentials are unconfigured", () => {
    delete process.env.HELPSCOUT_APP_ID;
    delete process.env.HELPSCOUT_APP_SECRET;
    delete process.env.HELPSCOUT_INBOX_ID;

    const status = getHelpScoutOpsStatus();
    expect(status.status).toBe("setup_blocked");
    expect(status.missingEnvKeys).toEqual([
      "HELPSCOUT_APP_ID",
      "HELPSCOUT_APP_SECRET",
      "HELPSCOUT_INBOX_ID",
    ]);
    expect(status.supportEmail).toBe("help@kouchd.com");
  });

  it("verifies Mintlify repository docs.json navigation and .mintignore without claiming live deployment", () => {
    const mintlify = getMintlifyOpsStatus();
    expect(mintlify.canonicalDocsUrl).toBe("https://help.kouchd.com");
    expect(mintlify.docsJsonValid).toBe(true);
    expect(mintlify.mintignorePresent).toBe(true);
    expect(mintlify.navigationGroupsCount).toBeGreaterThanOrEqual(7);
    expect(mintlify.totalConfiguredPages).toBeGreaterThanOrEqual(16);
    expect(mintlify.missingPageFiles).toEqual([]);
    expect(mintlify.deploymentVerificationState).toBe("unverified_in_console");
  });
});
