import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

import { AppProviders } from "./providers";
import "../styles.css";
import "./production.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  metadataBase: new URL("https://kouchd.com"),
  title: { default: "Kouchd", template: "%s | Kouchd" },
  description: "A shared stay without the awkward spreadsheet.",
  openGraph: {
    type: "website",
    siteName: "Kouchd",
    title: "Kouchd | Shared stays, made clear",
    description: "Keep household expectations, contributions, chores, and check-ins in one shared record.",
    url: "https://kouchd.com",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Kouchd, a shared stay without the awkward spreadsheet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kouchd | Shared stays, made clear",
    description: "Keep household expectations, contributions, chores, and check-ins in one shared record.",
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
    <html lang="en" className={manrope.variable}>
      <body>
        <ClerkProvider>
          <AppProviders>{children}</AppProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}
