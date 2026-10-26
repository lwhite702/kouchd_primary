import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { ShieldCheck, Lock, Users, Smartphone, FileText } from "lucide-react";
import { privacyPolicy, legalMeta } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | Kouchd",
  description:
    "Privacy Policy for Kouchd, operated by Wrelik Brands LLC. Learn how your data, household ledgers, and SMS communications are protected.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout activeRoute="privacy">
      <article className="legal-article" style={{ lineHeight: 1.75 }}>
        {/* Header Block */}
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
            Privacy Policy
          </h1>
          <p style={{ margin: 0, color: "var(--kouchd-muted, #59675f)", fontSize: "0.9rem" }}>
            Effective Date: {legalMeta.effectiveDate} &middot; Last updated: {legalMeta.lastUpdated} &middot; Brand: <strong>{legalMeta.provider}</strong> (operating <strong>Kouchd</strong>)
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
              Strict SMS Privacy &amp; Data Protection Commitment
            </strong>
            <p style={{ margin: "0 0 0.4rem", fontWeight: 700, color: "#184f3a", fontSize: "0.98rem" }}>
              We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.
            </p>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#2d4438" }}>
              Text messaging originator opt-in data and consent are strictly excluded from any sharing with third parties, affiliates, or external partners for marketing or promotional purposes.
            </p>
          </div>
        </div>

        {/* Static Carrier-Mandated Headings & Content */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            What Data We Collect
          </h2>
          <p>We collect only the information necessary to provide, coordinate, and safeguard your household stay agreements and shared records:</p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Account &amp; Profile Information:</strong> Name, email address, profile avatar, and authentication identifiers through our secure authentication partner (Clerk).
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Phone Number &amp; SMS Communication Data:</strong> Mobile phone number, delivery status timestamps, and message history for transactional coordination when you opt in.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Household Stay &amp; Agreement Details:</strong> Dates of stay, living agreements, room or space nicknames, house rules, quiet hours, and logistics (WiFi, door codes, trash schedules).
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Household Ledger &amp; Contribution Records:</strong> Contribution amounts, dates, categories, notes, receipt images, and chore point redemptions. <em>Note: Kouchd is an agreement and bookkeeping ledger; we do not store credit card numbers, process payments, or custody funds.</em>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Technical &amp; Usage Telemetry:</strong> Browser or app version, operating system, IP address, and limited product-usage events. For signed-in sessions, analytics may use a pseudonymous account identifier and a generic screen or page category. We do not send names, email addresses, household text, invite tokens, or contribution amounts to product analytics.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)", marginBottom: "0.75rem" }}>
            How We Use Your Data
          </h2>
          <p>Wrelik Brands LLC uses the collected data strictly for operational, non-marketing purposes:</p>
          <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Household Coordination &amp; Shared Records:</strong> Establishing mutual stay agreements, managing versioned terms, and maintaining partitioned household ledgers.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Transactional SMS Notifications &amp; Alerts:</strong> Delivering real-time stay alerts, chore due date reminders, check-in logistics, stay amendment requests, and ledger updates.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Account Security &amp; Fraud Prevention:</strong> Verifying user identity, safeguarding invite token hashes, and maintaining immutable audit logs of stay modifications.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Customer Support:</strong> Responding to user inquiries, resolving technical issues, and maintaining system availability.
            </li>
          </ul>
        </section>

        {/* Master Policy Sections */}
        {privacyPolicy.sections.map((section, idx) => (
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
        {privacyPolicy.addendum.length > 0 && (
          <div
            style={{
              borderTop: "2px dashed var(--kouchd-line, #ded8ce)",
              paddingTop: "2rem",
              marginTop: "2.5rem",
            }}
          >
            {privacyPolicy.addendum.map((addendum, aIdx) => (
              <section key={aIdx} style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <Lock size={22} color="var(--kouchd-forest, #184f3a)" />
                  <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", margin: 0 }}>
                    {addendum.title}
                  </h2>
                </div>
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

        {/* Cross-navigation Links */}
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
          <Link href="/terms" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none" }}>
            &rarr; View Terms &amp; Conditions
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
