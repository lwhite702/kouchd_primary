import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { MessageSquare, ShieldCheck, Scale } from "lucide-react";
import { termsOfUse, legalMeta } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions | Kouchd",
  description:
    "Terms and Conditions for Kouchd, operated by Wrelik Brands LLC. Includes our full SMS Terms of Service.",
  alternates: { canonical: "/terms" },
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPageLayout activeRoute="terms">
      <article className="legal-article" style={{ lineHeight: 1.75 }}>
        {/* Header */}
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
              fontSize: "2.25rem",
              fontWeight: 800,
              color: "var(--kouchd-forest, #184f3a)",
              margin: "0 0 0.5rem",
              letterSpacing: "-0.5px",
            }}
          >
            Terms &amp; Conditions
          </h1>
          <p style={{ margin: 0, color: "var(--kouchd-muted, #59675f)", fontSize: "0.9rem" }}>
            Effective Date: {legalMeta.effectiveDate} &middot; Last updated: {legalMeta.lastUpdated} &middot; Brand: <strong>{legalMeta.provider}</strong> (operating <strong>Kouchd</strong>)
          </p>
        </div>

        {/* Platform Role Overview */}
        <div
          style={{
            background: "#f7faf7",
            border: "1px solid #b8d2c1",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            margin: "1.75rem 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <Scale size={22} color="var(--kouchd-forest, #184f3a)" />
            <strong style={{ color: "var(--kouchd-forest, #184f3a)", fontSize: "1.05rem" }}>
              Collaborative Stay Agreements &amp; Ledger Tool
            </strong>
          </div>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.93rem", color: "var(--kouchd-ink, #17251f)" }}>
            Kouchd provides collaborative living agreements, chore coordination, and shared household bookkeeping records between hosts and temporary houseguests.
          </p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0 0", fontSize: "0.9rem", color: "var(--kouchd-muted, #59675f)" }}>
            <li style={{ marginBottom: "0.35rem" }}>
              <strong>Not a Landlord or Property Manager:</strong> Wrelik Brands LLC and Kouchd are not landlords, real estate brokers, tenant agencies, or property managers. Kouchd records shared agreements between private individuals; it does not replace local housing law, lease agreements, or legal advice.
            </li>
            <li style={{ marginBottom: "0.35rem" }}>
              <strong>No Payment Custody:</strong> Kouchd is an informational bookkeeping ledger. We do not hold, escrow, custody, transfer, or process user payments. Any financial settlement is conducted externally between stay members.
            </li>
            <li>
              <strong>Mutual Agreement:</strong> Stay terms and adjustments require mutual confirmation by host and guest to remain active and transparent.
            </li>
          </ul>
        </div>

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

        {/* Master Terms Sections */}
        {termsOfUse.sections.map((section, idx) => (
          <section key={idx} style={{ marginBottom: "2.25rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
              {section.title}
            </h2>
            {section.paragraphs?.map((p, pIdx) => (
              <p key={pIdx} style={{ marginBottom: "0.75rem", whiteSpace: "pre-line" }}>
                {p}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0 1rem" }}>
                {section.bullets.map((b, bIdx) => (
                  <li key={bIdx} style={{ marginBottom: "0.5rem" }}>
                    {b.label && <strong style={{ color: "var(--kouchd-ink, #17251f)" }}>{b.label}: </strong>}
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.numbered && section.numbered.length > 0 && (
              <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
                {section.numbered.map((n, nIdx) => (
                  <p key={nIdx} style={{ fontSize: "0.92rem", color: "var(--kouchd-muted, #59675f)", margin: 0 }}>
                    {n.label && <strong>{n.label}: </strong>}
                    {n.text}
                  </p>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Kouchd Specific Addendum */}
        {termsOfUse.addendum.length > 0 && (
          <div
            style={{
              borderTop: "2px dashed var(--kouchd-line, #ded8ce)",
              paddingTop: "2rem",
              marginTop: "2.5rem",
            }}
          >
            {termsOfUse.addendum.map((addendum, aIdx) => (
              <section key={aIdx} style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", marginBottom: "0.75rem" }}>
                  {addendum.title}
                </h2>
                {addendum.paragraphs?.map((p, pIdx) => (
                  <p key={pIdx} style={{ marginBottom: "0.75rem", color: "var(--kouchd-muted, #59675f)" }}>
                    {p}
                  </p>
                ))}
                {addendum.numbered && addendum.numbered.length > 0 && (
                  <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                    {addendum.numbered.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        style={{
                          background: "var(--kouchd-surface, #fffdf8)",
                          padding: "1rem 1.25rem",
                          borderRadius: "10px",
                          border: "1px solid var(--kouchd-line, #ded8ce)",
                        }}
                      >
                        {item.label && (
                          <strong style={{ display: "block", color: "var(--kouchd-forest, #184f3a)", marginBottom: "0.25rem" }}>
                            {item.label}
                          </strong>
                        )}
                        <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--kouchd-ink, #17251f)" }}>
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Contact and Navigation */}
        <div
          style={{
            borderTop: "1px solid var(--kouchd-line, #ded8ce)",
            paddingTop: "1.5rem",
            marginTop: "2rem",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            fontSize: "0.9rem",
          }}
        >
          <Link href="/privacy" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none" }}>
            &rarr; View Privacy Policy
          </Link>
          <Link href="/cookies" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none" }}>
            &rarr; View Cookie Policy
          </Link>
          <Link href="/acceptable-use" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none" }}>
            &rarr; View Acceptable Use Policy
          </Link>
          <Link href="/sms-opt-in" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none" }}>
            &rarr; View SMS Opt-In Form
          </Link>
        </div>
      </article>
    </LegalPageLayout>
  );
}
