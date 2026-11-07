import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("verify-env script", () => {
  // The script always reads ../release/feature-lock.json beside itself, so lock
  // scenarios run a copy of the script next to a fixture lock file.
  const scriptWithLock = (enabled: boolean) => {
    const root = mkdtempSync(join(tmpdir(), "kouchd-lock-"));
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "release"));
    copyFileSync("scripts/verify-env.mjs", join(root, "scripts", "verify-env.mjs"));
    writeFileSync(join(root, "release", "feature-lock.json"), JSON.stringify({ enabled }));
    return join(root, "scripts", "verify-env.mjs");
  };

  const runVerifyEnv = (
    env: Record<string, string | undefined>,
    script = "scripts/verify-env.mjs",
  ) => {
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
      const stdout = execFileSync("node", [script], {
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

  it("fails when a secret-looking name carries the NEXT_PUBLIC_ prefix", () => {
    const res = runVerifyEnv({ ...validBaseEnv, NEXT_PUBLIC_STRIPE_SECRET_KEY: "sk_live_dummy" });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("NEXT_PUBLIC_STRIPE_SECRET_KEY");
    expect(res.stderr).toContain("exposed to the browser");
  });

  it("allows the public keys the app ships on purpose", () => {
    const res = runVerifyEnv({
      ...validBaseEnv,
      NEXT_PUBLIC_KNOCK_PUBLIC_API_KEY: "pk_dummy",
      NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: "rcb_dummy",
      NEXT_PUBLIC_SENTRY_DSN: "https://dummy@sentry.io/1",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_dummy",
    });
    expect(res.status).toBe(0);
  });

  it("allows sandbox on Vercel production while the feature lock is off", () => {
    const res = runVerifyEnv({
      ...validBaseEnv,
      VERCEL_ENV: "production",
      SENTRY_AUTH_TOKEN: "sentry_dummy",
    }, scriptWithLock(false));
    expect(res.status).toBe(0);
  });

  it("requires SUBSCRIPTION_EXPECTED_ENVIRONMENT=production on Vercel production once the feature lock is on", () => {
    const vercelProdEnv = {
      ...validBaseEnv,
      VERCEL_ENV: "production",
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: "production",
      SENTRY_AUTH_TOKEN: "sentry_dummy",
    };
    const script = scriptWithLock(true);
    const validRes = runVerifyEnv(vercelProdEnv, script);
    expect(validRes.status).toBe(0);

    const sandboxRes = runVerifyEnv({
      ...vercelProdEnv,
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: "sandbox",
    }, script);
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
