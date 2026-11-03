import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("verify-env script", () => {
  const writeLock = (enabled: boolean) => {
    const file = join(mkdtempSync(join(tmpdir(), "kouchd-lock-")), "feature-lock.json");
    writeFileSync(file, JSON.stringify({ enabled }));
    return file;
  };

  const runVerifyEnv = (env: Record<string, string | undefined>) => {
    // Only pass minimal safe system variables (PATH, SYSTEMROOT, etc.) so host environment variables do not pollute test
    const cleanEnv: Record<string, string> = {
      PATH: process.env.PATH || "",
      NODE_PATH: process.env.NODE_PATH || "",
    };
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        cleanEnv[key] = value;
      }
    }

    try {
      const stdout = execFileSync("node", ["scripts/verify-env.mjs"], {
        env: cleanEnv as NodeJS.ProcessEnv,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { status: 0, stdout, stderr: "" };
    } catch (err: unknown) {
      const execError = err as {
        status?: number;
        stdout?: Buffer | string;
        stderr?: Buffer | string;
      };
      return {
        status: execError.status ?? 1,
        stdout: execError.stdout?.toString() || "",
        stderr: execError.stderr?.toString() || "",
      };
    }
  };

  const validBaseEnv = {
    CI: "true",
    NODE_ENV: "production",
    NEXT_PUBLIC_CONVEX_URL: "https://dummy.convex.cloud",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_dummy",
    CLERK_SECRET_KEY: "sk_test_dummy",
    CLERK_JWT_ISSUER_DOMAIN: "https://dummy.clerk.accounts.dev",
    SUBSCRIPTION_EXPECTED_ENVIRONMENT: "sandbox",
  };

  it("passes when all required variables including SUBSCRIPTION_EXPECTED_ENVIRONMENT are present in non-vercel production", () => {
    const res = runVerifyEnv(validBaseEnv);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("Required deployment environment variables are present");
  });

  it("fails in production when SUBSCRIPTION_EXPECTED_ENVIRONMENT is missing", () => {
    const res = runVerifyEnv({
      ...validBaseEnv,
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: undefined,
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("SUBSCRIPTION_EXPECTED_ENVIRONMENT must be set to \"production\" or \"sandbox\"");
  });

  it("fails in production when SUBSCRIPTION_EXPECTED_ENVIRONMENT is invalid", () => {
    const res = runVerifyEnv({
      ...validBaseEnv,
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: "development",
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("SUBSCRIPTION_EXPECTED_ENVIRONMENT must be set to \"production\" or \"sandbox\"");
  });

  it("allows sandbox on Vercel production while the feature lock is off", () => {
    const res = runVerifyEnv({
      ...validBaseEnv,
      VERCEL_ENV: "production",
      SENTRY_AUTH_TOKEN: "sentry_dummy",
      KOUCHD_FEATURE_LOCK_PATH: writeLock(false),
    });
    expect(res.status).toBe(0);
  });

  it("requires SUBSCRIPTION_EXPECTED_ENVIRONMENT=production on Vercel production once the feature lock is on", () => {
    const vercelProdEnv = {
      ...validBaseEnv,
      VERCEL_ENV: "production",
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: "production",
      SENTRY_AUTH_TOKEN: "sentry_dummy",
      KOUCHD_FEATURE_LOCK_PATH: writeLock(true),
    };
    const validRes = runVerifyEnv(vercelProdEnv);
    expect(validRes.status).toBe(0);

    const sandboxRes = runVerifyEnv({
      ...vercelProdEnv,
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: "sandbox",
    });
    expect(sandboxRes.status).toBe(1);
    expect(sandboxRes.stderr).toContain("SUBSCRIPTION_EXPECTED_ENVIRONMENT must be set to \"production\" for Vercel production deployments");
  });

  it("skips check in local visual/demo mode when CI and VERCEL_ENV are unset", () => {
    const res = runVerifyEnv({
      CI: undefined,
      VERCEL_ENV: undefined,
      NODE_ENV: "development",
      NEXT_PUBLIC_CONVEX_URL: undefined,
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: undefined,
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("Environment check skipped for local visual/demo mode.");
  });
});
