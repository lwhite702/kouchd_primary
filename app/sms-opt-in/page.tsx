import type { Metadata } from "next";
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
      <div style={{ borderBottom: "1px solid var(--kouchd-line, #ded8ce)", paddingBottom: "1.25rem", marginBottom: "1.75rem" }}>
        <p
          style={{
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            fontSize: "0.78rem",
            fontWeight: 800,
            color: "var(--kouchd-forest, #184f3a)",
            margin: "0 0 0.5rem",
          }}
        >
          Wrelik Brands LLC &middot; Carrier 10DLC Compliance
        </p>
        <h1
          style={{
            fontSize: "2.1rem",
            fontWeight: 800,
            color: "var(--kouchd-forest, #184f3a)",
            margin: "0 0 0.5rem",
            letterSpacing: "-0.5px",
          }}
        >
          Text Message Opt-In &amp; Acceptance Form
        </h1>
        <p style={{ margin: 0, color: "var(--kouchd-muted, #59675f)", fontSize: "0.9rem" }}>
          Registered Brand: <strong>Wrelik Brands LLC</strong> &middot; Product: <strong>Kouchd</strong>
        </p>
      </div>

      {servicesConfigured ? (
        <SmsOptInForm />
      ) : (
        <p role="status">Account and notification services are not connected yet. SMS enrollment is unavailable.</p>
      )}
    </LegalPageLayout>
  );
}
