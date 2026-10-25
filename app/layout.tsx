import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { VercelAnalytics } from "../components/vercel-analytics";
import { SECURITY_RUNTIME_INLINE_SCRIPT } from "../lib/security-runtime";

import { AppProviders } from "./providers";
import "../styles.css";
import "./production.css";
import "./brand-system.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.kouchd.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  alternates: {
    canonical: "/",
  },
  title: { default: "Kouchd", template: "%s | Kouchd" },
  description: "Stay agreements, house details, contribution records, and chores for the people sharing a home.",
  openGraph: {
    type: "website",
    siteName: "Kouchd",
    title: "Kouchd | Shared stays, made clear",
    description: "Stay agreements, house details, contribution records, and chores for the people sharing a home.",
    url: appUrl,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Kouchd: Your space. Your people. Everyone on the same page." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kouchd | Shared stays, made clear",
    description: "Stay agreements, house details, contribution records, and chores for the people sharing a home.",
    images: ["/opengraph-image"],
  },
  applicationName: "Kouchd",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kouchd",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f0e8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.kouchd.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com https://us.i.posthog.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://img.clerk.com https://*.googleusercontent.com https://images.unsplash.com; connect-src 'self' https://clerk.kouchd.com https://*.clerk.accounts.dev https://*.convex.cloud wss://*.convex.cloud https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://us.i.posthog.com https://vitals.vercel-insights.com https://api.knock.app wss://api.knock.app; frame-src 'self' https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self' https://clerk.kouchd.com https://*.clerk.accounts.dev; worker-src 'self' blob:;"
        />
        <link
          rel="preload"
          as="script"
          href="https://clerk.kouchd.com/npm/@clerk/ui@1.41.2/dist/vendors_ui_e564da_1.41.2.js"
          integrity="sha384-n1qf8LZfE2TLHN1Eh3B3t0LvQVqZYr/WKDzGzK1VwkhfLYrZRFinzvauGI4mHpFu"
          crossOrigin="anonymous"
        />
        <script
          id="kouchd-security-runtime"
          dangerouslySetInnerHTML={{ __html: SECURITY_RUNTIME_INLINE_SCRIPT }}
        />
      </head>
      <body>
        <ClerkProvider>
          <AppProviders>{children}</AppProviders>
        </ClerkProvider>
        <VercelAnalytics />
      </body>
    </html>
  );
}
