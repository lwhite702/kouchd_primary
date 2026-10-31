"use client";

import { useQuery } from "convex/react";
import { useFeatureFlagEnabled, usePostHog } from "posthog-js/react";
import { type ReactNode, useEffect, useState } from "react";

import { api } from "@/convex/_generated/api";
import { FEATURE_FLAGS_REGISTRY, type FeatureFlagKey } from "@/lib/flags/config";
import { getLocalDevOverride } from "@/lib/flags/client";
import { resolveFlag } from "@/lib/flags/resolve";

/** How long to wait for PostHog flags before falling back to registry defaults. */
const POSTHOG_FLAG_TIMEOUT_MS = 2500;

function usePostHogFlagsSettled(): boolean {
  const posthog = usePostHog();
  const configured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  const [settled, setSettled] = useState(
    () => !configured || Boolean(posthog?.featureFlags?.hasLoadedFlags),
  );

  useEffect(() => {
    if (settled || !posthog) return;
    const stop = posthog.onFeatureFlags(() => setSettled(true));
    // Blocked or failed flag requests must not hide default-on features forever.
    const timer = window.setTimeout(() => setSettled(true), POSTHOG_FLAG_TIMEOUT_MS);
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, [posthog, settled]);

  return settled;
}

/**
 * Evaluates a feature flag. See resolveFlag (lib/flags/resolve.ts) for the
 * order: dev/preview override, Convex kill switch, PostHog, registry default.
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const posthogFlag = useFeatureFlagEnabled(key);
  const posthogSettled = usePostHogFlagsSettled();
  const dbOverrides = useQuery(api.flags.list);

  return resolveFlag({
    devOverride: getLocalDevOverride(key),
    dbOverride: dbOverrides === undefined ? undefined : (dbOverrides.find((entry) => entry.key === key)?.override ?? null),
    posthogFlag,
    posthogSettled,
    defaultValue: FEATURE_FLAGS_REGISTRY[key]?.defaultValue ?? true,
  });
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
