import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const root = join(__dirname, "..");

describe("Content-Security-Policy", () => {
  it("serves pages through Clerk's strict (nonce + strict-dynamic) policy", () => {
    // The nonce is what neutralises 'unsafe-inline' for scripts; losing strict mode would reopen inline XSS.
    const proxy = readFileSync(join(root, "proxy.ts"), "utf8");
    expect(proxy).toMatch(/contentSecurityPolicy:\s*{\s*strict:\s*true/);
    expect(proxy).toContain("directives: cspDirectives");
  });

  it("never ships 'unsafe-eval' outside development", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const { cspDirectives, contentSecurityPolicy } = await import("../lib/security/csp");
    expect(cspDirectives["script-src"]).not.toContain("'unsafe-eval'");
    expect(contentSecurityPolicy).not.toContain("'unsafe-eval'");
    vi.unstubAllEnvs();
  });

  it("keeps framing, plugins and base-uri locked down", async () => {
    const { cspDirectives } = await import("../lib/security/csp");
    expect(cspDirectives["frame-ancestors"]).toEqual(["'none'"]);
    expect(cspDirectives["object-src"]).toEqual(["'none'"]);
    expect(cspDirectives["base-uri"]).toEqual(["'self'"]);
  });
});
