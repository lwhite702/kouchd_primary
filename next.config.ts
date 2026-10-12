import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

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

