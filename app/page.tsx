import { AuthenticatedHome } from "@/components/authenticated-home";
import { KouchdWorkspace } from "@/components/kouchd-workspace";
import { SimplifiedLandingPage } from "@/components/simplified-landing-page";
import { StartPage } from "@/components/start/start-page";
import { chooseLandingVariant } from "@/lib/landing-variant";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kouchd | Shared stays, made clear",
  description:
    "Stay agreements, house details, contribution records, and chores for the people sharing a home.",
  alternates: {
    canonical: "https://app.kouchd.com/",
  },
  openGraph: {
    type: "website",
    siteName: "Kouchd",
    title: "Kouchd | Shared stays, made clear",
    description:
      "Stay agreements, house details, contribution records, and chores for the people sharing a home.",
    url: "https://app.kouchd.com",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Kouchd: Your space. Your people. Everyone on the same page.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kouchd | Shared stays, made clear",
    description:
      "Stay agreements, house details, contribution records, and chores for the people sharing a home.",
    images: ["/opengraph-image"],
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const servicesConfigured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  if (!servicesConfigured) return <KouchdWorkspace servicesConfigured={false} />;

  const { userId } = await auth();
  if (!userId) {
    return chooseLandingVariant(await searchParams) === "simple" ? (
      <SimplifiedLandingPage hasClerk />
    ) : (
      <StartPage />
    );
  }
  return <AuthenticatedHome />;
}
