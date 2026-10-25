import { AuthenticatedHome } from "@/components/authenticated-home";
import { KouchdWorkspace } from "@/components/kouchd-workspace";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://app.kouchd.com/",
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

