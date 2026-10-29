import type { Metadata } from "next";
import { AboutKouchdPage } from "@/components/about-kouchd-page";

const description =
  "Why we built Kouchd: clear stay expectations, contribution records, and household responsibilities for the people sharing a home.";

export const metadata: Metadata = {
  title: { absolute: "About Kouchd | Sharing a home should be easier" },
  description,
  alternates: { canonical: "https://kouchd.com/about" },
  openGraph: {
    type: "website",
    siteName: "Kouchd",
    title: "About Kouchd | Sharing a home should be easier",
    description,
    url: "https://kouchd.com/about",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "About Kouchd: Making shared living work better for everyone.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Kouchd | Sharing a home should be easier",
    description,
    images: ["/opengraph-image"],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kouchd",
  url: "https://kouchd.com",
  logo: "https://kouchd.com/brand/kouchd-logo-horizontal.svg",
  parentOrganization: {
    "@type": "Organization",
    name: "Wrelik Brands LLC",
  },
  description:
    "Private shared living made easier to coordinate. Stay agreements, house details, contribution records, and chores.",
};

export default function AboutPage() {
  const hasClerk = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <AboutKouchdPage hasClerk={hasClerk} />
    </>
  );
}
