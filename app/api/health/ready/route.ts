import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CheckResult = "ok" | "fail" | "skipped";

const CHECK_TIMEOUT_MS = 2_500;

/** Fetch with a hard timeout; any network error, timeout or non-2xx counts as a failure. */
async function probe(url: string): Promise<CheckResult> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    return response.ok ? "ok" : "fail";
  } catch {
    return "fail";
  }
}

/**
 * Readiness: can this deployment reach the services it needs to serve a signed-in user?
 * /api/health stays a cheap liveness probe; this one makes bounded external calls.
 */
export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN;

  // A production deployment without these settings cannot serve signed-in users, so missing
  // config is a failure there. Locally they are often unset on purpose, so it is only skipped.
  const missing: CheckResult = process.env.NODE_ENV === "production" ? "fail" : "skipped";

  const [convex, clerk] = await Promise.all([
    convexUrl ? probe(`${convexUrl.replace(/\/$/, "")}/version`) : Promise.resolve(missing),
    clerkIssuer ? probe(`${clerkIssuer.replace(/\/$/, "")}/.well-known/jwks.json`) : Promise.resolve(missing),
  ]);

  const checks = { convex, clerk };
  const ready = Object.values(checks).every((result) => result !== "fail");

  return NextResponse.json(
    { status: ready ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
