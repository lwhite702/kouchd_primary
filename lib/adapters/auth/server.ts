import "server-only";

/**
 * Returns true if an authentication bypass is currently enabled.
 * If bypass is enabled, platform console discovery and access must strictly fail closed.
 */
export function isAuthBypassEnabled(): boolean {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    return false;
  }

  const enabled = process.env.AUTH_BYPASS_ENABLED === "true";
  if (enabled) {
    console.warn(
      "[AUTH] Authentication bypass is ENABLED. Do not use this configuration in production."
    );
  }
  return enabled;
}

