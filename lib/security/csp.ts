/**
 * The one Content-Security-Policy for the web app. next.config.ts sends it as a
 * header and proxy.ts hands it to Clerk's middleware. There is no <meta> copy:
 * a proxy in front of the app mangled it and blanked every page (WRE-253).
 *
 * Two copies reach the browser, and it enforces both. proxy.ts passes these
 * directives to Clerk's strict mode, which adds a per-request nonce and
 * 'strict-dynamic' to script-src; with a nonce present, browsers ignore
 * 'unsafe-inline' for scripts, so an injected inline script is blocked on every
 * page the proxy serves. The static copy from next.config.ts has no nonce, and
 * keeps 'unsafe-inline' only so Next's own nonce-tagged inline scripts also pass
 * it. Removing it there blocks those scripts and blanks the site.
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
    "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://clerk.kouchd.com",
    "https://*.clerk.accounts.dev",
    "https://challenges.cloudflare.com",
    "https://*.protect.clerk.com",
    "https://va.vercel-scripts.com",
    "https://us.i.posthog.com",
    "https://us-assets.i.posthog.com",
    "https://connect.facebook.net",
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
