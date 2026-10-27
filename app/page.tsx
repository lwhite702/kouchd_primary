import { AuthenticatedHome } from "@/components/authenticated-home";
import { KouchdWorkspace } from "@/components/kouchd-workspace";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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

export default async function HomePage() {
  const servicesConfigured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  if (!servicesConfigured) return <KouchdWorkspace servicesConfigured={false} />;

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <AuthenticatedHome />;
}


