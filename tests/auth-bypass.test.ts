import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAuthBypassEnabled } from "../lib/adapters/auth/server";

describe("isAuthBypassEnabled", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns false when AUTH_BYPASS_ENABLED is not set", () => {
    delete process.env.AUTH_BYPASS_ENABLED;
    expect(isAuthBypassEnabled()).toBe(false);
  });

  it("returns false unconditionally when NODE_ENV is production even if AUTH_BYPASS_ENABLED is true", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.AUTH_BYPASS_ENABLED = "true";
    expect(isAuthBypassEnabled()).toBe(false);
  });

  it("returns false unconditionally when VERCEL_ENV is production even if AUTH_BYPASS_ENABLED is true", () => {
    process.env.VERCEL_ENV = "production";
    process.env.AUTH_BYPASS_ENABLED = "true";
    expect(isAuthBypassEnabled()).toBe(false);
  });

  it("returns true and logs a warning when AUTH_BYPASS_ENABLED is true in non-production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    process.env.AUTH_BYPASS_ENABLED = "true";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(isAuthBypassEnabled()).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[AUTH] Authentication bypass is ENABLED")
    );
  });

  it("ignores deprecated bypass flags like NEXT_PUBLIC_DISABLE_AUTH or BYPASS_AUTH", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.AUTH_BYPASS_ENABLED;
    (process.env as Record<string, string>)["NEXT_PUBLIC_DISABLE_AUTH"] = "true";
    (process.env as Record<string, string>)["BYPASS_AUTH"] = "true";

    expect(isAuthBypassEnabled()).toBe(false);
  });
});
