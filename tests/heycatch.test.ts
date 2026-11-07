import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { cspDirectives } from "../lib/security/csp";
import { trackEvent } from "../lib/analytics/track";
import { ANALYTICS_EVENTS } from "../lib/analytics/events";
import { analytics } from "@heycatch/sdk";

const root = join(__dirname, "..");

describe("HeyCatch Analytics Integration", () => {
  it("initializes HeyCatch in instrumentation-client.ts with the exact project key and install metadata", () => {
    const file = readFileSync(join(root, "instrumentation-client.ts"), "utf8");
    expect(file).toContain("analytics.init({");
    expect(file).toContain('projectKey: "hck_pk_vTnA-QIqNwJkDomxrPzeV7q7FubOu6pI"');
    expect(file).toContain('framework: "nextjs"');
    expect(file).toContain('frameworkVersion: "16"');
  });

  it("permits https://in.heycatch.ai in script-src and connect-src CSP directives", () => {
    expect(cspDirectives["script-src"]).toContain("https://in.heycatch.ai");
    expect(cspDirectives["connect-src"]).toContain("https://in.heycatch.ai");
  });

  it("defines single-character short-link redirect in next.config.ts", () => {
    const file = readFileSync(join(root, "next.config.ts"), "utf8");
    expect(file).toContain("redirects()");
    expect(file).toContain("source: \"/:l([a-z0-9])\"");
    expect(file).toContain("destination: \"/?utm_source=heycatch&utm_campaign=:l\"");
  });

  it("forwards trackEvent calls to HeyCatch analytics.trackEvent", () => {
    const trackSpy = vi.spyOn(analytics, "trackEvent").mockImplementation(() => {});
    trackEvent(ANALYTICS_EVENTS.CHECK_IN_SUBMITTED, {
      stayId: "stay_test",
      date: "2026-11-05",
    });
    expect(trackSpy).toHaveBeenCalledWith(
      "check_in_submitted",
      expect.objectContaining({ stayId: "stay_test", date: "2026-11-05" })
    );
    trackSpy.mockRestore();
  });
});
