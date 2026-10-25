import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.kouchd.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com https://us.i.posthog.com https://us-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://img.clerk.com https://*.googleusercontent.com https://images.unsplash.com",
  "connect-src 'self' https://clerk.kouchd.com https://*.clerk.accounts.dev https://*.convex.cloud wss://*.convex.cloud https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://us.i.posthog.com https://vitals.vercel-insights.com https://api.knock.app wss://api.knock.app",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://clerk.kouchd.com https://*.clerk.accounts.dev",
  "worker-src 'self' blob:",
];

const contentSecurityPolicy = cspDirectives.join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/dashboard",
        destination: "/",
      },
      {
        source: "/dashboard/:path*",
        destination: "/",
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "wrelik-0y",
  project: "kouchd",
  silent: !process.env.CI,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: "/monitoring-tunnel",
});

