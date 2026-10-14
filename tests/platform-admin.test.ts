import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { requirePlatformEntryKey } from "../lib/platform/console";

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

describe("Convex Platform Admin Backend Authorization", () => {
  const adminEmail = "operator@kouchd.com";

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = adminEmail;
  });

  it("denies access to non-admin users", async () => {
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
    await expect(standardUser.query(api.admin.listUsers, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
    await expect(standardUser.query(api.admin.listStays, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
    await expect(standardUser.query(api.admin.listSmsComplianceEvents, {})).rejects.toThrow(
      "Unauthorized: Platform admin grant required"
    );
  });

  it("grants access to authorized platform admins and returns system metrics", async () => {
    const t = convexTest(schema, modules);

    // Create a standard user (host) and a stay
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

    // Create platform admin
    const admin = t.withIdentity({
      subject: "admin-user",
      name: "Platform Operator",
      email: adminEmail,
    });
    await admin.mutation(api.users.syncCurrent, {});

    // Overview stats query
    const stats = await admin.query(api.admin.getOverviewStats, {});
    expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
    expect(stats.totalStays).toBeGreaterThanOrEqual(1);
    expect(stats.pendingStays).toBe(1);

    // List users
    const users = await admin.query(api.admin.listUsers, { searchTerm: "Sarah" });
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Host Sarah");
    expect(users[0].roles).toContain("host");

    // List stays
    const stays = await admin.query(api.admin.listStays, { statusFilter: "pending" });
    expect(stays.length).toBeGreaterThanOrEqual(1);
    expect(stays.some((s: { _id: string }) => s._id === stayId)).toBe(true);

    // Stay detail
    const stayDetail = await admin.query(api.admin.getStayDetail, { stayId });
    expect(stayDetail).not.toBeNull();
    expect(stayDetail?.host?.name).toBe("Host Sarah");

    // Toggle admin mutation
    const targetUser = users[0];
    const toggleResult = await admin.mutation(api.admin.toggleAdmin, {
      userId: targetUser._id,
      isAdmin: true,
    });
    expect(toggleResult.isAdmin).toBe(true);

    // Now verify the promoted user also has admin access via DB flag
    const promotedUser = t.withIdentity({
      subject: "host-user",
      name: "Host Sarah",
      email: "host@example.com",
    });
    const promotedStats = await promotedUser.query(api.admin.getOverviewStats, {});
    expect(promotedStats.totalStays).toBeGreaterThanOrEqual(1);
  });
});
