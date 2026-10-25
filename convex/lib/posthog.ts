import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

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
