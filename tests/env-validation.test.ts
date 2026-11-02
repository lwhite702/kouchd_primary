import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("verify-env script", () => {
  const runVerifyEnv = (env: Record<string, string | undefined>) => {
    try {
      const stdout = execFileSync("node", ["scripts/verify-env.mjs"], {
        env: {
          ...process.env,
          ...env,
        },
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { status: 0, stdout, stderr: "" };
    } catch (err: any) {
      return {
        status: err.status,
        stdout: err.stdout?.toString() || "",
        stderr: err.stderr?.toString() || "",
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

  it("passes when all required variables including SUBSCRIPTION_EXPECTED_ENVIRONMENT are present in production", () => {
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
    expect(res.stderr).toContain("SUBSCRIPTION_EXPECTED_ENVIRONMENT must be set to \"production\" or \"sandbox\" in production");
  });

  it("fails in production when SUBSCRIPTION_EXPECTED_ENVIRONMENT is invalid", () => {
    const res = runVerifyEnv({
      ...validBaseEnv,
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: "development",
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("SUBSCRIPTION_EXPECTED_ENVIRONMENT must be set to \"production\" or \"sandbox\" in production");
  });

  it("skips check in local visual/demo mode when CI and VERCEL_ENV are unset", () => {
    const res = runVerifyEnv({
      CI: "",
      VERCEL_ENV: "",
      NODE_ENV: "development",
      NEXT_PUBLIC_CONVEX_URL: undefined,
      SUBSCRIPTION_EXPECTED_ENVIRONMENT: undefined,
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("Environment check skipped for local visual/demo mode.");
  });
});
