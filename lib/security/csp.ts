/**
 * The one Content-Security-Policy for the web app. next.config.ts sends it as a
 * header, proxy.ts hands it to Clerk's middleware, and app/layout.tsx repeats it
 * as a <meta> tag (which cannot carry frame-ancestors).
 *
 * PostHog traffic goes through the same-origin /ingest proxy, so 'self' covers
 * it; the PostHog hosts stay listed for clients that load before the proxy is
 * deployed.
 */
export const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://clerk.kouchd.com",
    "https://*.clerk.accounts.dev",
    "https://challenges.cloudflare.com",
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
  "frame-src": ["'self'", "https://challenges.cloudflare.com"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'", "https://clerk.kouchd.com", "https://*.clerk.accounts.dev"],
  "worker-src": ["'self'", "blob:"],
};

function serialize(skip: string[] = []): string {
  return Object.entries(cspDirectives)
    .filter(([name]) => !skip.includes(name))
    .map(([name, sources]) => [name, ...sources].join(" "))
    .join("; ");
}

export const contentSecurityPolicy = serialize();

/** Browsers ignore frame-ancestors in a <meta> CSP, so it is left out there. */
export const metaContentSecurityPolicy = serialize(["frame-ancestors"]);
