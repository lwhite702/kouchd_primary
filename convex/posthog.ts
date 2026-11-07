"use node";

import { analytics } from "@heycatch/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

analytics.init({ projectKey: "hck_pk_vTnA-QIqNwJkDomxrPzeV7q7FubOu6pI" });

// RevenueCat already sends to PostHog directly; this action avoids duplicating it.
export const captureHeyCatchEventAction = internalAction({
  args: {
    distinctId: v.string(),
    event: v.string(),
    properties: v.any(),
    plan: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, { distinctId, event, properties, plan }) => {
    if (plan !== undefined) await analytics.setIdentity(distinctId, { plan });
    await analytics.trackEvent(event, properties, { userId: distinctId });
    return null;
  },
});

export const captureServerEventAction = internalAction({
  args: {
    distinctId: v.string(),
    event: v.string(),
    properties: v.optional(v.any()),
    stayId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (_ctx, { distinctId, event, properties = {}, stayId }) => {
    // These actions run after the database transaction commits. Await the SDK
    // so the action cannot finish before ingest responds, even without PostHog.
    await analytics.trackEvent(event, properties, { userId: distinctId });
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    if (!apiKey) return false;

    try {
      const payload: Record<string, unknown> = {
        api_key: apiKey,
        distinct_id: distinctId,
        event,
        properties: {
          ...(typeof properties === "object" && properties !== null ? properties : {}),
          $lib: "convex-backend",
          ...(stayId ? { $groups: { stay: stayId } } : {}),
        },
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(`${host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return res.ok;
    } catch {
      return false;
    }
  },
});
