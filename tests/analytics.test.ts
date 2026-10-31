import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ANALYTICS_EVENTS, type AnalyticsEventPayloads } from "../lib/analytics/events";
import { trackEvent, setStayGroup, resetStayGroup } from "../lib/analytics/track";
import posthog from "posthog-js";

interface GlobalScope {
  window?: { origin: string };
}

interface LoadedPostHog {
  __loaded?: boolean;
}

describe("Analytics Event Taxonomy & Types", () => {
  it("defines canonical events across all core domains", () => {
    expect(ANALYTICS_EVENTS.STAY_CREATED).toBe("stay_created");
    expect(ANALYTICS_EVENTS.STAY_SWITCHED).toBe("stay_switched");
    expect(ANALYTICS_EVENTS.INVITE_CREATED).toBe("invite_created");
    expect(ANALYTICS_EVENTS.TERMS_ACCEPTED).toBe("terms_accepted");
    expect(ANALYTICS_EVENTS.CONTRIBUTION_RECORDED).toBe("contribution_recorded");
    expect(ANALYTICS_EVENTS.CHORE_COMPLETED).toBe("chore_completed");
    expect(ANALYTICS_EVENTS.SHOPPING_ITEM_ADDED).toBe("shopping_item_added");
    expect(ANALYTICS_EVENTS.CHECK_IN_SUBMITTED).toBe("check_in_submitted");
    expect(ANALYTICS_EVENTS.PAYWALL_VIEWED).toBe("paywall_viewed");
    expect(ANALYTICS_EVENTS.USER_SIGNED_UP).toBe("user_signed_up");
  });

  it("constructs type-safe event payloads matching expectations", () => {
    const payload: AnalyticsEventPayloads[typeof ANALYTICS_EVENTS.STAY_CREATED] = {
      stayId: "stay_123",
      cadence: "weekly",
      rateCents: 25000,
    };
    expect(payload.stayId).toBe("stay_123");
    expect(payload.cadence).toBe("weekly");
    expect(payload.rateCents).toBe(25000);
  });
});

describe("Client Telemetry Dispatcher (track.ts)", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.window = originalWindow;
  });

  it("safely handles capture when window is defined and posthog is loaded", () => {
    (globalThis as unknown as GlobalScope).window = { origin: "https://kouchd.com" };
    const captureSpy = vi.spyOn(posthog, "capture").mockImplementation(() => {});
    (posthog as unknown as LoadedPostHog).__loaded = true;

    trackEvent(ANALYTICS_EVENTS.SHOPPING_ITEM_ADDED, {
      stayId: "stay_abc",
      itemId: "item_xyz",
    });

    expect(captureSpy).toHaveBeenCalledWith("shopping_item_added", {
      stayId: "stay_abc",
      itemId: "item_xyz",
    });
  });

  it("silently no-ops during server-side rendering (window undefined)", () => {
    (globalThis as unknown as GlobalScope).window = undefined;
    const captureSpy = vi.spyOn(posthog, "capture").mockImplementation(() => {});
    (posthog as unknown as LoadedPostHog).__loaded = true;

    trackEvent(ANALYTICS_EVENTS.CHECK_IN_SUBMITTED, {
      stayId: "stay_abc",
      date: "2026-10-25",
    });

    expect(captureSpy).not.toHaveBeenCalled();
  });

  it("silently no-ops when posthog is not loaded", () => {
    (globalThis as unknown as GlobalScope).window = { origin: "https://kouchd.com" };
    const captureSpy = vi.spyOn(posthog, "capture").mockImplementation(() => {});
    (posthog as unknown as LoadedPostHog).__loaded = false;

    trackEvent(ANALYTICS_EVENTS.CHECK_IN_SUBMITTED, {
      stayId: "stay_abc",
      date: "2026-10-25",
    });

    expect(captureSpy).not.toHaveBeenCalled();
  });

  it("handles group registration and reset in browser environment", () => {
    (globalThis as unknown as GlobalScope).window = { origin: "https://kouchd.com" };
    const groupSpy = vi.spyOn(posthog, "group").mockImplementation(() => {});
    const resetGroupsSpy = vi.spyOn(posthog, "resetGroups").mockImplementation(() => {});
    (posthog as unknown as LoadedPostHog).__loaded = true;

    setStayGroup("stay_456", { name: "Maple House", status: "active", role: "host" });
    expect(groupSpy).toHaveBeenCalledWith("stay", "stay_456", {
      name: "Maple House",
      status: "active",
      role: "host",
    });

    resetStayGroup();
    expect(resetGroupsSpy).toHaveBeenCalled();
  });
});

describe("Event coverage", () => {
  // Defined for planned work; remove from this list when a call site lands.
  const NOT_YET_SENT = new Set([
    "STAY_RENAMED",
    "HOUSE_INFO_UPDATED",
    "AGREEMENT_VIEWED",
    "TERMS_UPDATED",
    "ADHOC_CHARGE_CREATED",
    "PAYMENT_METHOD_ADDED",
    "GUIDED_TOUR_ACTION",
    "PAYWALL_VIEWED",
    "CUSTOMER_CENTER_OPENED",
  ]);

  it("sends every defined event from at least one call site", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const root = new URL("..", import.meta.url).pathname;
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (name === "_generated" || name === "node_modules") continue;
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name)) sources.push(readFileSync(path, "utf8"));
      }
    };
    for (const dir of ["app", "components", "convex"]) walk(join(root, dir));
    const code = sources.join("\n");

    const unsent = Object.keys(ANALYTICS_EVENTS).filter(
      (key) => !NOT_YET_SENT.has(key) && !code.includes(`ANALYTICS_EVENTS.${key}`)
    );
    expect(unsent).toEqual([]);
    const nowSent = [...NOT_YET_SENT].filter((key) => code.includes(`ANALYTICS_EVENTS.${key}`));
    expect(nowSent).toEqual([]);
  });
});
