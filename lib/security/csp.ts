/**
 * The one Content-Security-Policy for the web app. next.config.ts sends it as a
 * header and proxy.ts hands it to Clerk's middleware. There is no <meta> copy:
 * a proxy in front of the app mangled it and blanked every page (WRE-253).
 *
 * Pages get the policy from proxy.ts: Clerk's strict mode adds a per-request
 * nonce and 'strict-dynamic' to script-src, and that header replaces the static
 * copy from next.config.ts. The static copy only reaches paths the proxy skips
 * (_next assets, /.well-known, public files), none of which run inline script.
 * script-src has no 'unsafe-inline': only nonce-tagged scripts and the hosts
 * below load. Clerk's strict mode still appends its own 'unsafe-inline' default
 * as a fallback for pre-nonce (CSP1) browsers; every current browser ignores it
 * when a nonce is present, so it does not allow injected inline scripts.
 * style-src keeps 'unsafe-inline' because Next, Clerk and next/font inject
 * inline styles.
 *
 * PostHog traffic goes through the same-origin /ingest proxy, so 'self' covers
 * it; the PostHog hosts stay listed for clients that load before the proxy is
 * deployed.
 */
const isDevelopment = process.env.NODE_ENV === "development";

export const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://clerk.kouchd.com",
    "https://*.clerk.accounts.dev",
    "https://challenges.cloudflare.com",
    "https://*.protect.clerk.com",
    "https://va.vercel-scripts.com",
    "https://us.i.posthog.com",
    "https://us-assets.i.posthog.com",
    "https://connect.facebook.net",
    "https://in.heycatch.ai",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://img.clerk.com",
    "https://*.googleusercontent.com",
    "https://images.unsplash.com",
    "https://www.facebook.com",
  ],
  "connect-src": [
    "'self'",
    "https://clerk.kouchd.com",
    "https://*.clerk.accounts.dev",
    "https://challenges.cloudflare.com",
    // Any port on purpose: Clerk's bot protection was blocked here without it (Replay QA, pinned by its test).
    "https://*.protect.clerk.com:*",
    "https://*.convex.cloud",
    "wss://*.convex.cloud",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://us.i.posthog.com",
    "https://vitals.vercel-insights.com",
    "https://api.knock.app",
    "wss://api.knock.app",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    "https://in.heycatch.ai",
  ],
  "frame-src": [
    "'self'",
    "https://challenges.cloudflare.com",
    "https://*.protect.clerk.com",
  ],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'", "https://clerk.kouchd.com", "https://*.clerk.accounts.dev"],
  "worker-src": ["'self'", "blob:"],
};

export const contentSecurityPolicy = Object.entries(cspDirectives)
  .map(([name, sources]) => [name, ...sources].join(" "))
  .join("; ");
