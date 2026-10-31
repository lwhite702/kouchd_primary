export type FlagOverride = "enabled" | "disabled" | "default" | undefined;

export interface FlagInputs {
  /** Development/preview override from the URL or localStorage; null when absent. */
  devOverride: boolean | null;
  /** Convex row for this key; undefined while the Convex query is loading. */
  dbOverride: FlagOverride | null;
  /** PostHog's answer; undefined when PostHog has no value for the key. */
  posthogFlag: boolean | undefined;
  /** False until PostHog has returned flags (or given up waiting). */
  posthogSettled: boolean;
  defaultValue: boolean;
}

/**
 * Resolution order: dev override, Convex kill switch or force-on, PostHog,
 * registry default. While Convex or PostHog are still loading the answer is
 * `false`, so a feature that is switched off never flashes on first render.
 */
export function resolveFlag(inputs: FlagInputs): boolean {
  if (inputs.devOverride !== null) return inputs.devOverride;
  if (inputs.dbOverride === undefined) return false;
  if (inputs.dbOverride === "enabled") return true;
  if (inputs.dbOverride === "disabled") return false;
  if (!inputs.posthogSettled) return false;
  if (typeof inputs.posthogFlag === "boolean") return inputs.posthogFlag;
  return inputs.defaultValue;
}
