"use client";

import { useQuery } from "convex/react";
import { useFeatureFlagEnabled } from "posthog-js/react";
import { type ReactNode, useMemo } from "react";

import { api } from "@/convex/_generated/api";
import { FEATURE_FLAGS_REGISTRY, type FeatureFlagKey } from "@/lib/flags/config";
import { getLocalDevOverride } from "@/lib/flags/client";

/**
 * React hook to evaluate a feature flag across the multi-tier hierarchy:
 * 1. Local / URL Dev override (?flag:key=true or localStorage)
 * 2. Convex Database override (Platform Console kill switch)
 * 3. PostHog remote targeting / percentage rollout
 * 4. Typesafe code default
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const meta = FEATURE_FLAGS_REGISTRY[key];
  const posthogFlag = useFeatureFlagEnabled(key);
  const dbOverrides = useQuery(api.flags.list);

  return useMemo(() => {
    // 1. Local dev / URL query param override
    const devOverride = getLocalDevOverride(key);
    if (devOverride !== null) {
      return devOverride;
    }

    // 2. Database override (emergency kill switch)
    if (dbOverrides) {
      const match = dbOverrides.find((entry) => entry.key === key);
      if (match?.override === "enabled") return true;
      if (match?.override === "disabled") return false;
    }

    // 3. PostHog remote flag (boolean)
    if (typeof posthogFlag === "boolean") {
      return posthogFlag;
    }

    // 4. Code baseline default
    return meta?.defaultValue ?? true;
  }, [key, meta, posthogFlag, dbOverrides]);
}

export interface FeatureGateProps {
  flag: FeatureFlagKey;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Component that renders children only when the specified feature flag is enabled.
 */
export function FeatureGate({ flag, fallback = null, children }: FeatureGateProps) {
  const isEnabled = useFeatureFlag(flag);
  return <>{isEnabled ? children : fallback}</>;
}

/**
 * Inverse component that renders children only when the specified feature flag is disabled.
 */
export function FeatureGateDisabled({ flag, fallback = null, children }: FeatureGateProps) {
  const isEnabled = useFeatureFlag(flag);
  return <>{!isEnabled ? children : fallback}</>;
}
