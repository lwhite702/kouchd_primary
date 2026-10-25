"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const captureServerEventAction = internalAction({
  args: {
    distinctId: v.string(),
    event: v.string(),
    properties: v.optional(v.any()),
    stayId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (_ctx, { distinctId, event, properties = {}, stayId }) => {
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
