import type { Metadata } from "next";
import { AboutKouchdPage } from "@/components/about-kouchd-page";

const description = "Why we built Kouchd: clear stay expectations, contribution records, and household responsibilities for the people sharing a home.";

export const metadata: Metadata = {
  title: { absolute: "About Kouchd | Sharing a home should be easier" },
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Kouchd | Sharing a home should be easier",
    description,
    url: "https://kouchd.com/about",
  },
  twitter: { title: "About Kouchd | Sharing a home should be easier", description },
};

export default function AboutPage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return <AboutKouchdPage hasClerk={hasClerk} />;
}
