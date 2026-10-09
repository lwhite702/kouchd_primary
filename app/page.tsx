import { AuthenticatedHome } from "@/components/authenticated-home";
import { LandingPage } from "@/components/landing-page";
import { KouchdWorkspace } from "@/components/kouchd-workspace";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAppHost } from "@/lib/app-domain";

export default async function HomePage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? requestHeaders.get("x-forwarded-host");
  const servicesConfigured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  if (!servicesConfigured) return <KouchdWorkspace servicesConfigured={false} />;

  if (!isAppHost(host)) return <LandingPage hasClerk />;

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <AuthenticatedHome />;
}
