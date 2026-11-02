import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { AnalyticsEventName, AnalyticsEventPayloads } from "../../lib/analytics/events";

export interface SchedulePostHogEventArgs {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  stayId?: string;
}

export function schedulePostHogEvent(
  ctx: MutationCtx,
  args: SchedulePostHogEventArgs
): void {
  try {
    void ctx.scheduler.runAfter(0, internal.posthog.captureServerEventAction, args);
  } catch {
    // Fail-open: telemetry never blocks database mutations
  }
}

/**
 * Sends a typed funnel event for the signed-in user once the mutation commits.
 * The distinct ID is the Clerk user ID, the same one the web and iOS clients
 * identify with, so server events join the right PostHog person.
 */
export function trackServerEvent<E extends AnalyticsEventName>(
  ctx: MutationCtx,
  user: Pick<Doc<"users">, "clerkUserId">,
  event: E,
  properties: AnalyticsEventPayloads[E],
  stayId?: string
): void {
  schedulePostHogEvent(ctx, { distinctId: user.clerkUserId, event, properties, stayId });
}
