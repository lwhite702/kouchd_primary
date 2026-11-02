import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// RevenueCat's PostHog integration attributes purchase, renewal and
// cancellation events to the RevenueCat app user ID. They only land on the
// right PostHog person while both SDKs are given the same Clerk user ID.
describe("RevenueCat and PostHog identity", () => {
  it("identifies the web PostHog person and RevenueCat customer with the Clerk user ID", () => {
    expect(read("components/posthog-provider.tsx")).toMatch(/posthog\.identify\(userId\b/);
    expect(read("components/billing/paywall-modal.tsx")).toMatch(/appUserId: userId\b/);
  });

  it("identifies the iOS PostHog person and RevenueCat customer with the Clerk user ID", () => {
    const app = read("ios/Kouchd/KouchdApp.swift");
    expect(app).toContain("onChange(of: clerk.user?.id) { _, userID in handleAnalyticsUserChange(userID) }");
    expect(app).toContain("onChange(of: clerk.user?.id, initial: true) { _, userID in handleSessionUserChange(userID) }");
    expect(app).toContain("billing.updateIdentity(userID)");
    expect(read("ios/Kouchd/Billing.swift")).toContain("purchases.logIn(userID)");
  });

  it("leaves purchase outcomes to RevenueCat so the web paywall does not double count them", () => {
    const paywall = read("components/billing/paywall-modal.tsx");
    expect(paywall).not.toContain("ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED");
    expect(paywall).not.toContain("ANALYTICS_EVENTS.CHECKOUT_STARTED");
  });
});
