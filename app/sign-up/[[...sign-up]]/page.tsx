import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Create an account",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="route-state">Clerk is not connected yet.</main>;
  }

  return (
    <main className="clerk-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem" }}>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />

      {/* SMS & Legal Disclosure Card for New Registrations */}
      <div
        style={{
          marginTop: "1.75rem",
          maxWidth: "400px",
          width: "100%",
          background: "var(--kouchd-surface, #fffdf8)",
          border: "1px solid var(--kouchd-line, #ded8ce)",
          borderRadius: "16px",
          padding: "1.25rem",
          fontSize: "0.82rem",
          color: "var(--kouchd-muted, #59675f)",
          lineHeight: 1.5,
          boxShadow: "0 6px 20px rgba(23, 37, 31, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--kouchd-forest, #184f3a)" }}>
          <MessageSquare size={18} />
          <strong style={{ fontSize: "0.88rem" }}>SMS Notifications &amp; Registration Terms</strong>
        </div>
        <p style={{ margin: "0 0 0.5rem" }}>
          By creating an account, you agree to the{" "}
          <Link href="/terms" target="_blank" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700 }}>
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700 }}>
            Privacy Policy
          </Link>{" "}
          of <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>).
        </p>
        <p style={{ margin: "0 0 0.5rem" }}>
          You may optionally enroll your mobile number in transactional stay notifications (chore reminders, check-in logistics, and ledger updates). <strong>Message and data rates may apply.</strong> Message frequency varies. Reply STOP to cancel at any time, HELP for assistance.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--kouchd-line, #ded8ce)" }}>
          <ShieldCheck size={16} color="var(--kouchd-forest, #184f3a)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.78rem" }}>
            We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.
          </span>
        </div>
        <div style={{ marginTop: "0.6rem", textAlign: "right" }}>
          <Link href="/sms-opt-in" target="_blank" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "underline", fontSize: "0.8rem" }}>
            View Full SMS Acceptance Form &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
