import { AuthenticatedHome } from "@/components/authenticated-home";
import { LandingPage } from "@/components/landing-page";
import { KouchdWorkspace } from "@/components/kouchd-workspace";
import { auth } from "@clerk/nextjs/server";

export default async function HomePage() {
  const servicesConfigured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  if (!servicesConfigured) return <KouchdWorkspace servicesConfigured={false} />;

  const { userId } = await auth();
  return userId ? <AuthenticatedHome /> : <LandingPage hasClerk />;
}
