import { AuthenticatedHome } from "@/components/authenticated-home";
import { KouchdWorkspace } from "@/components/kouchd-workspace";

export default function HomePage() {
  const servicesConfigured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  return servicesConfigured ? <AuthenticatedHome /> : <KouchdWorkspace servicesConfigured={false} />;
}
