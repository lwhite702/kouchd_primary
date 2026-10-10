import { describe, expect, it } from "vitest";
import { isAppHost } from "../lib/app-domain";

describe("isAppHost", () => {
  it("matches the app subdomain regardless of case or port", () => {
    expect(isAppHost("app.kouchd.com")).toBe(true);
    expect(isAppHost("APP.KOUCHD.COM:443")).toBe(true);
  });

  it("uses the first forwarded host and rejects lookalike hosts", () => {
    expect(isAppHost("app.kouchd.com, proxy.internal")).toBe(true);
    expect(isAppHost("not-app.kouchd.com")).toBe(false);
    expect(isAppHost("app.kouchd.com.attacker.test")).toBe(false);
    expect(isAppHost(null)).toBe(false);
  });
});
