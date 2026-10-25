import posthog from "posthog-js";
import type { AnalyticsEventName, AnalyticsEventPayloads } from "./events";

export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventPayloads[E]
): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  try {
    posthog.capture(event, properties);
  } catch (err) {
    console.warn("[PostHog] Event capture failed:", err);
  }
}

export function setStayGroup(
  stayId: string,
  properties?: { name?: string; status?: string; role?: string; memberCount?: number }
): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  try {
    posthog.group("stay", stayId, properties);
  } catch (err) {
    console.warn("[PostHog] Group set failed:", err);
  }
}

export function resetStayGroup(): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  try {
    posthog.resetGroups();
  } catch (err) {
    console.warn("[PostHog] Group reset failed:", err);
  }
}
