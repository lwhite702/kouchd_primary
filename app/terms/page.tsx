import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions | Kouchd",
  description:
    "Terms and Conditions for Kouchd, operated by Wrelik Brands LLC. Includes our full SMS Terms of Service.",
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPageLayout activeRoute="terms">
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
            Terms &amp; Conditions
          </h1>
          <p style={{ margin: 0, color: "var(--kouchd-muted, #59675f)", fontSize: "0.9rem" }}>
            Effective Date: September 17, 2026 &middot; Brand: <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>)
          </p>
        </div>

        {/* 1. Agreement to Terms */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            1. Agreement to Terms
          </h2>
          <p>
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) constitute a legally binding agreement made between you and <strong>Wrelik Brands LLC</strong> (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), concerning your access to and use of the <strong>Kouchd</strong> platform, websites (<a href="https://kouchd.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>kouchd.com</a>), and related notification and messaging services (collectively, the &ldquo;Service&rdquo;).
          </p>
          <p>
            By accessing or using the Service, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree with all of these Terms, you are prohibited from using the Service and must discontinue use immediately.
          </p>
        </section>

        {/* 2. Platform Role & Limitations */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            2. Platform Role &amp; Limitations
          </h2>
          <p>
            Kouchd provides collaborative living agreements, chore coordination, and shared household bookkeeping records between hosts and temporary houseguests.
          </p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Not a Landlord, Tenant Agency, or Property Manager:</strong> Wrelik Brands LLC and Kouchd are not landlords, real estate brokers, tenant agencies, or property managers. Kouchd records shared agreements between private individuals; it does not replace local housing law, lease agreements, or legal advice.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>No Payment Custody:</strong> Kouchd is an informational bookkeeping ledger. We do not hold, escrow, custody, transfer, or process user payments. Any financial settlement is conducted externally between stay members.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Mutual Agreement:</strong> Stay terms and adjustments require mutual confirmation by host and guest to remain active and transparent.
            </li>
          </ul>
        </section>

        {/* DEDICATED SMS TERMS SECTION */}
        <section
          id="sms-terms"
          style={{
            border: "2px solid #b8d2c1",
            borderRadius: "16px",
            padding: "1.75rem",
            background: "#f7faf7",
            marginBottom: "2.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <MessageSquare size={26} color="var(--kouchd-forest, #184f3a)" />
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--kouchd-forest, #184f3a)",
                margin: 0,
              }}
            >
              SMS Terms &amp; Conditions
            </h2>
          </div>
          <p style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "var(--kouchd-muted, #59675f)" }}>
            Please read these SMS Terms carefully. By providing your mobile telephone number and opting into Kouchd text messages, you agree to receive SMS notifications from <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>).
          </p>

          <div style={{ display: "grid", gap: "1.25rem", marginTop: "1rem" }}>
            <div>
              <strong style={{ color: "var(--kouchd-ink, #17251f)", display: "block", marginBottom: "0.25rem" }}>
                1. Program Name &amp; Description
              </strong>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>
                The <strong>Kouchd SMS Notifications</strong> program, operated by <strong>Wrelik Brands LLC</strong>, provides transactional and service-related text alerts to participants of shared household stays. Message types include stay agreement updates, mutual sign-off notices, chore deadline reminders, check-in information, and household ledger updates.
              </p>
            </div>

            <div style={{ background: "#eef6f0", padding: "1rem", borderRadius: "10px", border: "1px solid #b8d2c1" }}>
              <strong style={{ color: "var(--kouchd-forest, #184f3a)", display: "block", marginBottom: "0.25rem" }}>
                2. Rates &amp; Charges Disclosure
              </strong>
              <p style={{ margin: 0, fontWeight: 700, color: "#184f3a", fontSize: "0.95rem" }}>
                Message and data rates may apply.
              </p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "#2d4438" }}>
                Depending on your mobile carrier and telephone plan, standard text messaging fees or data charges may be billed to you by your mobile carrier. Wrelik Brands LLC does not charge additional fees for sending SMS alerts.
              </p>
            </div>

            <div>
              <strong style={{ color: "var(--kouchd-ink, #17251f)", display: "block", marginBottom: "0.25rem" }}>
                3. Message Frequency
              </strong>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>
                Message frequency varies based on your household stay activity and personal notification preferences. Typically, you will receive transactional messages when key events occur (e.g., a chore due today, a stay agreement update, or a ledger credit logged by your host or guest).
              </p>
            </div>

            <div>
              <strong style={{ color: "var(--kouchd-ink, #17251f)", display: "block", marginBottom: "0.25rem" }}>
                4. Opt-Out &amp; Cancellation Instructions
              </strong>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>
                You can cancel the SMS service at any time. Simply text <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, or <strong>QUIT</strong> to any text message you receive from Kouchd. Upon texting STOP, we will send you an SMS message confirming that you have been unsubscribed. After this, you will no longer receive SMS messages from Kouchd.
              </p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--kouchd-muted, #59675f)" }}>
                You may re-subscribe at any time by updating your notification preferences in your dashboard or visiting our <Link href="/sms-opt-in" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700 }}>SMS Acceptance Form</Link>.
              </p>
            </div>

            <div>
              <strong style={{ color: "var(--kouchd-ink, #17251f)", display: "block", marginBottom: "0.25rem" }}>
                5. Help &amp; Support Instructions
              </strong>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>
                If you are experiencing issues with our text messaging program or need assistance, reply with the keyword <strong>HELP</strong> to any message, or contact our support team directly at <a href="mailto:support@wrelik.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>support@wrelik.com</a> or <a href="mailto:support@kouchd.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>support@kouchd.com</a>.
              </p>
            </div>

            <div>
              <strong style={{ color: "var(--kouchd-ink, #17251f)", display: "block", marginBottom: "0.25rem" }}>
                6. Carrier Disclaimer
              </strong>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--kouchd-muted, #59675f)" }}>
                Wireless carriers (including, but not limited to, AT&amp;T, T-Mobile, Verizon, Sprint, and regional mobile carriers) are not liable for delayed or undelivered messages.
              </p>
            </div>

            <div>
              <strong style={{ color: "var(--kouchd-ink, #17251f)", display: "block", marginBottom: "0.25rem" }}>
                7. Privacy Policy
              </strong>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>
                We respect your privacy. <strong>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</strong> For full details on how we protect your personal information, view our complete <Link href="/privacy" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700 }}>Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Account Security & User Conduct */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            3. Account Responsibilities &amp; Acceptable Use
          </h2>
          <p>When using Kouchd, you agree that you will not:</p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0" }}>
            <li style={{ marginBottom: "0.5rem" }}>Provide false, inaccurate, or misleading personal or phone number information.</li>
            <li style={{ marginBottom: "0.5rem" }}>Use the Service for any unlawful, harassing, defamatory, or fraudulent purpose.</li>
            <li style={{ marginBottom: "0.5rem" }}>Attempt to compromise system security, reverse-engineer, or intercept communication tokens.</li>
          </ul>
        </section>

        {/* 4. Limitation of Liability */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            4. Limitation of Liability
          </h2>
          <p style={{ fontSize: "0.92rem", color: "var(--kouchd-muted, #59675f)" }}>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WRELIK BRANDS LLC, ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE, HOUSEHOLD AGREEMENTS, DISPUTES BETWEEN MEMBERS, OR DELAYED/UNDELIVERED COMMUNICATIONS.
          </p>
        </section>

        {/* 5. Contact Information */}
        <section style={{ borderTop: "1px solid var(--kouchd-line, #ded8ce)", paddingTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            5. Contact Information
          </h2>
          <p>For questions or concerns regarding these Terms &amp; Conditions, please contact us at:</p>
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
