import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
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
    expect(file).toContain('agent: "codex"');
    expect(file).not.toContain('site: "landing"');
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

const modules = import.meta.glob([
  "../convex/**/*.ts",
  "!../convex/lib/**",
  "!../convex/schema.ts",
  "!../convex/auth.config.ts",
]);

describe("HeyCatch server delivery", () => {
  it("awaits delivery with the Clerk ID even when PostHog is unconfigured", async () => {
    const t = convexTest(schema, modules);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const spy = vi.mocked(analytics.trackEvent).mockImplementationOnce(() => pending);
    let finished = false;
    const action = t.action(internal.posthog.captureServerEventAction, {
      distinctId: "user_synthetic", event: "user_signed_up", properties: {},
    }).then(() => { finished = true; });
    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith(
      "user_signed_up", {}, { userId: "user_synthetic" },
    ));
    expect(finished).toBe(false);
    release();
    await action;
    expect(finished).toBe(true);
  });

  it("updates subscription identity and awaits the outcome without sending to PostHog", async () => {
    const t = convexTest(schema, modules);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network"));
    try {
      await t.action(internal.posthog.captureHeyCatchEventAction, {
        distinctId: "user_synthetic", event: "subscription_initial_purchase",
        properties: { plan: "plus" }, plan: "plus",
      });
      expect(analytics.setIdentity).toHaveBeenCalledWith("user_synthetic", { plan: "plus" });
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        "subscription_initial_purchase", { plan: "plus" }, { userId: "user_synthetic" },
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
