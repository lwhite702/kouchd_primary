import { clerkMiddleware } from "@clerk/nextjs/server";

const vercelOrigin = process.env.VERCEL_URL
  ? process.env.VERCEL_URL.startsWith("http")
    ? process.env.VERCEL_URL
    : `https://${process.env.VERCEL_URL}`
  : null;

export default clerkMiddleware({
  authorizedParties: [
    "https://kouchd.com",
    "https://www.kouchd.com",
    "https://app.kouchd.com",
    ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
    ...(vercelOrigin ? [vercelOrigin] : []),
  ],
  contentSecurityPolicy: {
    directives: {
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
      ],
      "frame-src": ["'self'", "https://challenges.cloudflare.com"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'", "https://clerk.kouchd.com", "https://*.clerk.accounts.dev"],
      "worker-src": ["'self'", "blob:"],
    },
  },
});

export const config = {
  matcher: [
    "/((?!_next|\\.well-known|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
