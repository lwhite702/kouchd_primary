import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <head>
        <script
          id="kouchd-security-runtime"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: SECURITY_RUNTIME_INLINE_SCRIPT }}
        />
      </head>
      <body>
        {/* Explicit auth URLs keep Clerk's sign-up → sign-in hand-off under /sign-in and /sign-up (WRE-261). */}
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
          <AppProviders>{children}</AppProviders>
        </ClerkProvider>
        <VercelAnalytics />
      </body>
    </html>
  );
}
