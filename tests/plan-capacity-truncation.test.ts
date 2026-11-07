import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { assertPlanCapacity } from "../convex/lib/planCapacity";
import schema from "../convex/schema";

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

describe("plan capacity scan bound", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("refuses and logs a structured warning when an account has more stays than the scan reads", async () => {
    process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT = "production";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const now = Date.now();
      const hostUserId = await ctx.db.insert("users", { clerkUserId: "bulk-host", name: "Bulk Host", createdAt: now, updatedAt: now });
      for (let i = 0; i < 51; i++) {
        await ctx.db.insert("stays", { hostUserId, status: "active", timezone: "America/New_York", createdAt: now, updatedAt: now } as never);
      }

      await expect(assertPlanCapacity(ctx, hostUserId, "stay")).rejects.toThrow(/capacity review/);
      const logged = warn.mock.calls.map(([line]) => String(line)).find((line) => line.includes("plan_capacity.scan_truncated"));
      expect(logged).toBeDefined();
      expect(JSON.parse(logged!)).toMatchObject({ event: "plan_capacity.scan_truncated", dimension: "stay", ownerUserId: hostUserId, scanLimit: 50 });
    });
  });
});
