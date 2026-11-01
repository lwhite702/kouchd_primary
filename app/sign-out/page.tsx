import type { Metadata } from "next";
import { SignOutRedirect } from "@/components/sign-out-redirect";

export const metadata: Metadata = {
  title: "Signing out",
  robots: {
    index: false,
    follow: false,
  },
};

/** /sign-out used to 404 (WRE-261). It now signs the person out and returns to /sign-in. */
export default function SignOutPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="route-state">Clerk is not connected yet.</main>;
  }

  return <SignOutRedirect />;
}
