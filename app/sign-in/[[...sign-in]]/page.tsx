import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { SignInFormGuard } from "@/components/sign-in-form-guard";

export const metadata: Metadata = {
  title: "Sign in",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="route-state">Clerk is not connected yet.</main>;
  return (
    <main className="clerk-page">
      <SignInFormGuard>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      </SignInFormGuard>
    </main>
  );
}
