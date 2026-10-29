import { ConvexError } from "convex/values";

/** Shown to a guest whose join was refused: no prices and no Plus wording. */
export const STAY_FULL_MESSAGE = "This stay is full right now. Ask your host to make room.";

/** Data the backend attaches to a plan-limit refusal (convex/lib/planCapacity.ts). */
export type PlanLimitError = {
  code: "plan_limit";
  dimension: "stay" | "guest";
  plan: "free" | "plus";
  limit: number;
  atHighestPlan: boolean;
  message: string;
};

export function planLimitError(reason: unknown): PlanLimitError | null {
  if (!(reason instanceof ConvexError)) return null;
  const data = reason.data as Partial<PlanLimitError> | undefined;
  return data && typeof data === "object" && data.code === "plan_limit" ? (data as PlanLimitError) : null;
}
