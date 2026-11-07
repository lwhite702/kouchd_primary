import type { Metadata } from "next";
import { LegalPageHeader } from "@/components/legal/legal-article";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { SmsOptInForm } from "@/components/sms/sms-opt-in-form";

export const metadata: Metadata = {
  title: "Text Message Opt-In & Acceptance Form | Kouchd",
  description:
    "Official SMS notification acceptance and opt-in form for Kouchd, operated by Wrelik Brands LLC.",
  alternates: {
    canonical: "/sms-opt-in",
  },
};

export default function SmsOptInPage() {
  const servicesConfigured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  return (
    <LegalPageLayout activeRoute="sms-opt-in">
      <LegalPageHeader
        eyebrow={<>Wrelik Brands LLC &middot; Carrier 10DLC Compliance</>}
        title={<>Text Message Opt-In &amp; Acceptance Form</>}
        titleSize="2.1rem"
        meta={
          <>
            Registered Brand: <strong>Wrelik Brands LLC</strong> &middot; Product: <strong>Kouchd</strong>
          </>
        }
      />

      {servicesConfigured ? (
        <SmsOptInForm />
      ) : (
        <p role="status">Account and notification services are not connected yet. SMS enrollment is unavailable.</p>
      )}
    </LegalPageLayout>
  );
}
