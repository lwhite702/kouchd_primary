import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/health/ready/route";

describe("GET /api/health/ready", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    process.env.CLERK_JWT_ISSUER_DOMAIN = "https://clerk.example.com";
  });

  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
  });

  it("returns 200 when Convex and Clerk both answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", checks: { convex: "ok", clerk: "ok" } });
    expect(fetchMock).toHaveBeenCalledWith("https://example.convex.cloud/version", expect.anything());
    expect(fetchMock).toHaveBeenCalledWith("https://clerk.example.com/.well-known/jwks.json", expect.anything());
  });

  it("returns 503 and names Convex when Convex is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) =>
      url.includes("convex") ? Promise.reject(new TypeError("fetch failed")) : Promise.resolve(new Response("ok"))
    ));

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "degraded", checks: { convex: "fail", clerk: "ok" } });
  });

  it("returns 503 when Clerk answers with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) =>
      Promise.resolve(new Response("x", { status: url.includes("clerk") ? 500 : 200 }))
    ));

    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).checks).toEqual({ convex: "ok", clerk: "fail" });
  });

  it.each([
    ["NEXT_PUBLIC_CONVEX_URL", "convex"],
    ["CLERK_JWT_ISSUER_DOMAIN", "clerk"],
  ] as const)("fails readiness in production when %s is missing", async (envVar, check) => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env[envVar];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));

    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).checks[check]).toBe("fail");
    vi.unstubAllEnvs();
  });

  it.each([
    ["NEXT_PUBLIC_CONVEX_URL", "convex"],
    ["CLERK_JWT_ISSUER_DOMAIN", "clerk"],
  ] as const)("only skips a missing %s outside production", async (envVar, check) => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env[envVar];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));

    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).checks[check]).toBe("skipped");
    vi.unstubAllEnvs();
  });

  it("fails readiness when a configured Convex is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) =>
      url.includes("convex") ? Promise.reject(new TypeError("fetch failed")) : Promise.resolve(new Response("ok"))
    ));

    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).checks.convex).toBe("fail");
  });

  it("uses a bounded timeout on every probe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await GET();
    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
    }
  });
});
