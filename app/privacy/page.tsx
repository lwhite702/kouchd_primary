import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { ShieldCheck, Lock, Bell } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Kouchd",
  description:
    "Privacy Policy for Kouchd, operated by Wrelik Brands LLC. Learn how your data and SMS communications are protected.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout activeRoute="privacy">
      <article className="legal-article" style={{ lineHeight: 1.7 }}>
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
            Wrelik Brands LLC &middot; Legal Documentation
          </p>
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              color: "var(--kouchd-forest, #184f3a)",
              margin: "0 0 0.5rem",
              letterSpacing: "-0.5px",
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ margin: 0, color: "var(--kouchd-muted, #59675f)", fontSize: "0.9rem" }}>
            Effective Date: September 17, 2026 &middot; Brand: <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>)
          </p>
        </div>

        {/* Carrier Compliance Highlight Box */}
        <div
          style={{
            background: "#eaf4ec",
            border: "2px solid #b8d2c1",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            margin: "1.75rem 0",
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <ShieldCheck size={26} color="var(--kouchd-forest, #184f3a)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ color: "var(--kouchd-forest, #184f3a)", display: "block", fontSize: "1.05rem", marginBottom: "0.35rem" }}>
              SMS Privacy &amp; Data Protection Commitment
            </strong>
            <p style={{ margin: 0, fontWeight: 700, color: "#184f3a", fontSize: "0.98rem" }}>
              We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.
            </p>
          </div>
        </div>

        {/* 1. Introduction */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            1. Introduction &amp; Brand Identification
          </h2>
          <p>
            This Privacy Policy explains how <strong>Wrelik Brands LLC</strong> (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), operating the <strong>Kouchd</strong> collaborative stay agreement and household ledger platform (&ldquo;Kouchd&rdquo;), collects, uses, protects, and discloses personal information when you use our website (<a href="https://kouchd.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>kouchd.com</a>), applications, and messaging services.
          </p>
          <p>
            By accessing or using Kouchd, you acknowledge that you have read, understood, and agree to the collection and use of information in accordance with this Privacy Policy and our <Link href="/terms" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700 }}>Terms &amp; Conditions</Link>.
          </p>
        </section>

        {/* 2. What Data We Collect */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            2. What Data We Collect
          </h2>
          <p>We collect only the information necessary to provide, coordinate, and safeguard your household stay agreements and shared records:</p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Account &amp; Profile Information:</strong> When you register an account, we collect your name, email address, profile avatar, and authentication identifiers through our secure authentication partner (Clerk).
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Phone Number &amp; SMS Communication Data:</strong> When you provide your mobile telephone number and opt into SMS alerts or account verification, we collect your mobile phone number, delivery status timestamps, and message history for transactional coordination.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Household Stay &amp; Agreement Details:</strong> Dates of stay, living agreements, room or space nicknames, house rules, quiet hours, and property logistics (such as WiFi network names, door codes, and trash schedules).
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Household Ledger &amp; Contribution Records:</strong> Offline contribution amounts, dates, categories (e.g., groceries, repairs, household supplies, cash payments), notes, receipt images, and chore point redemptions. <em>Note: Kouchd is an agreement and bookkeeping ledger; we do not store credit card numbers, process payments, or custody funds.</em>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Technical &amp; Usage Telemetry:</strong> Browser type, operating system, IP address, and interaction timestamps necessary to prevent fraud and ensure platform reliability.
            </li>
          </ul>
        </section>

        {/* 3. How We Use Your Data */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            3. How We Use Your Data
          </h2>
          <p>Wrelik Brands LLC uses the collected data strictly for operational, non-marketing purposes:</p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Household Coordination &amp; Shared Records:</strong> Establishing mutual stay agreements, managing versioned terms, and maintaining partitioned household ledgers.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Transactional SMS Notifications &amp; Alerts:</strong> Delivering real-time stay alerts, chore due date reminders, check-in logistics, stay amendment requests, and ledger updates to verified stay participants.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Account Security &amp; Fraud Prevention:</strong> Verifying user identity, safeguarding invite token hashes, and maintaining immutable audit logs of stay modifications.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Customer Support:</strong> Responding to user inquiries, resolving technical issues, and maintaining system availability.
            </li>
          </ul>
        </section>

        {/* 4. SMS Privacy & Carrier Compliance */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            4. SMS Privacy &amp; 10DLC Carrier Standards
          </h2>
          <p>
            At <strong>Wrelik Brands LLC</strong>, we maintain strict privacy boundaries for mobile communications:
          </p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</strong>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              Mobile phone numbers collected specifically for SMS opt-in will not be shared with affiliates, third-party marketing companies, or lead generators under any circumstances.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              Text messaging originator opt-in data and consent will not be shared with any third parties except telecommunication carriers and direct SMS aggregation providers (such as Twilio and Knock) solely to transmit your requested transactional alerts.
            </li>
          </ul>
          <p>
            For more details regarding our SMS notification program, frequency, and carrier terms, please consult our <Link href="/terms" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700 }}>Terms &amp; Conditions (SMS Terms)</Link> or visit our <Link href="/sms-opt-in" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700 }}>SMS Acceptance Form</Link>.
          </p>
        </section>

        {/* 5. Data Partitioning & Security */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            5. Data Partitioning &amp; Security
          </h2>
          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <Lock size={20} color="var(--kouchd-forest, #184f3a)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Bilateral Ledger Partitioning:</strong>
                <span style={{ display: "block", color: "var(--kouchd-muted, #59675f)", fontSize: "0.9rem" }}>
                  In Kouchd, financial balances and obligation records are private between the specific guest and the host. Other household guests cannot view your ledger rates or balance.
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <Bell size={20} color="var(--kouchd-forest, #184f3a)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Single-Use Hashed Invitations:</strong>
                <span style={{ display: "block", color: "var(--kouchd-muted, #59675f)", fontSize: "0.9rem" }}>
                  Guest invitation tokens are stored strictly as SHA-256 cryptographic hashes and automatically expire to prevent unauthorized access.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Opt-Out, Preferences & Your Rights */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            6. Opt-Out, Preferences &amp; Your Rights
          </h2>
          <p>
            You maintain full control over your communication preferences and personal information:
          </p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>SMS Opt-Out:</strong> You may opt out of text messages at any time by replying <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, or <strong>QUIT</strong> to any SMS received from Kouchd. You may also disable SMS alerts in your dashboard settings.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>SMS Assistance:</strong> Text <strong>HELP</strong> for customer support information.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Account &amp; Data Deletion:</strong> You may request the deletion of your account and personal data by contacting us at <a href="mailto:support@wrelik.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>support@wrelik.com</a>.
            </li>
          </ul>
        </section>

        {/* 7. Contact Us */}
        <section style={{ borderTop: "1px solid var(--kouchd-line, #ded8ce)", paddingTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            7. Contact Information
          </h2>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our messaging practices, please contact:</p>
          <div style={{ background: "#faf8f5", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--kouchd-line, #ded8ce)" }}>
            <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>Wrelik Brands LLC</p>
            <p style={{ margin: "0 0 0.35rem", color: "var(--kouchd-muted, #59675f)" }}>Product: Kouchd (kouchd.com)</p>
            <p style={{ margin: "0 0 0.35rem", color: "var(--kouchd-muted, #59675f)" }}>
              Email: <a href="mailto:support@wrelik.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>support@wrelik.com</a> / <a href="mailto:support@kouchd.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>support@kouchd.com</a>
            </p>
            <p style={{ margin: 0, color: "var(--kouchd-muted, #59675f)" }}>Website: <a href="https://kouchd.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>https://kouchd.com</a></p>
          </div>
        </section>
      </article>
    </LegalPageLayout>
  );
}
