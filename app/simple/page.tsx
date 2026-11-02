import type { Metadata } from "next";
import { SimplifiedLandingPage } from "@/components/simplified-landing-page";

const title = "Kouchd | Warm shared stays, simply managed";
const description = "Kouchd creates calm, private records for hosts and guests.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "https://kouchd.com/simple" },
  // Keep out of search indexes until this page is approved for public launch (WRE-243).
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    siteName: "Kouchd",
    title,
    description,
    url: "https://kouchd.com/simple",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Kouchd: Warm shared stays, simply managed." }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
};

export default function SimpleLandingRoute() {
  const hasClerk = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  return <SimplifiedLandingPage hasClerk={hasClerk} />;
}
