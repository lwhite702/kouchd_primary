import { type FeatureFlagKey } from "./config";

export type OverrideState = "enabled" | "disabled" | "default";

/**
 * Local overrides are for development and Vercel previews only. In production
 * anyone could otherwise turn on an unreleased feature from the address bar.
 */
export function localOverridesAllowed(): boolean {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv) return vercelEnv !== "production";
  return process.env.NODE_ENV !== "production";
}

/**
 * Checks for a local developer or QA override from URL query param or localStorage.
 * Precedence:
 * 1. URL search params (e.g. ?flag:feature_shopping_list=true or 0)
 * 2. localStorage item (e.g. kouchd_flag_override_feature_shopping_list)
 * Returns boolean if overridden, or null if no local override exists or
 * overrides are not allowed in this environment.
 */
export function getLocalDevOverride(key: FeatureFlagKey): boolean | null {
  if (typeof window === "undefined" || !localOverridesAllowed()) return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const paramVal = params.get(`flag:${key}`);
    if (paramVal === "true" || paramVal === "1") return true;
    if (paramVal === "false" || paramVal === "0") return false;
  } catch {
    // Ignore URL parsing errors
  }

  try {
    const storageVal = window.localStorage.getItem(`kouchd_flag_override_${key}`);
    if (storageVal === "true") return true;
    if (storageVal === "false") return false;
  } catch {
    // Ignore localStorage access errors (e.g. private mode)
  }

  return null;
}

/**
 * Sets or clears a local developer override in localStorage.
 */
export function setLocalDevOverride(key: FeatureFlagKey, value: boolean | null): void {
  if (typeof window === "undefined") return;

  try {
    if (value === null) {
      window.localStorage.removeItem(`kouchd_flag_override_${key}`);
    } else {
      window.localStorage.setItem(`kouchd_flag_override_${key}`, String(value));
    }
  } catch {
    // Ignore localStorage errors
  }
}
