import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signing you in",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Safety net for OAuth returns that land on the site root (WRE-261).
 *
 * Clerk normally returns to /sign-in/sso-callback or /sign-up/sso-callback, which the
 * catch-all auth pages handle. A Facebook sign-up that Clerk moved over to sign-in was
 * seen returning to /sso-callback instead, which had no page and showed the 404.
 * This finishes the redirect and sends each outcome to the matching auth step.
 */
export default function SsoCallbackPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="route-state">Clerk is not connected yet.</main>;
  }

  return (
    <main className="route-state" aria-busy="true">
      <p>Signing you in…</p>
      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        firstFactorUrl="/sign-in/factor-one"
        secondFactorUrl="/sign-in/factor-two"
        continueSignUpUrl="/sign-up/continue"
        verifyEmailAddressUrl="/sign-up/verify-email-address"
        verifyPhoneNumberUrl="/sign-up/verify-phone-number"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      />
    </main>
  );
}
