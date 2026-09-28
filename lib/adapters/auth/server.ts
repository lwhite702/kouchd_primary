import "server-only";

/**
 * Returns true if an authentication bypass is currently enabled.
 * If bypass is enabled, platform console discovery and access must strictly fail closed.
 */
export function isAuthBypassEnabled(): boolean {
  return (
    process.env.AUTH_BYPASS_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_DISABLE_AUTH === "true" ||
    process.env.BYPASS_AUTH === "true"
  );
}
