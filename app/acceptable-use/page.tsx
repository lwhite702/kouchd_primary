import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { ShieldAlert } from "lucide-react";
import { acceptableUsePolicy, legalMeta } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | Kouchd",
  description:
    "Acceptable Use Policy and Community Guidelines for Kouchd, operated by Wrelik Brands LLC.",
  alternates: { canonical: "/acceptable-use" },
};

export default function AcceptableUsePage() {
  return (
    <LegalPageLayout activeRoute="acceptable-use">
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <ShieldAlert size={28} color="var(--kouchd-forest, #184f3a)" />
            <h1
              style={{
                fontSize: "2.25rem",
                fontWeight: 800,
                color: "var(--kouchd-forest, #184f3a)",
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              Acceptable Use Policy
            </h1>
          </div>
          <p style={{ margin: 0, color: "var(--kouchd-muted, #59675f)", fontSize: "0.9rem" }}>
            Effective Date: {legalMeta.effectiveDate} &middot; Last updated: {legalMeta.lastUpdated} &middot; Brand: <strong>{legalMeta.provider}</strong> (operating <strong>Kouchd</strong>)
          </p>
        </div>

        {/* Overview Box */}
        <div
          style={{
            background: "#f7faf7",
            border: "1px solid #b8d2c1",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            margin: "1.75rem 0",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--kouchd-ink, #17251f)" }}>
            {acceptableUsePolicy.summary}
          </p>
        </div>

        {/* Sections */}
        {acceptableUsePolicy.sections.map((section, idx) => (
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
          </section>
        ))}

        {/* Navigation */}
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
          <Link href="/terms" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none" }}>
            &rarr; View Terms &amp; Conditions
          </Link>
          <Link href="/cookies" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none" }}>
            &rarr; View Cookie Policy
          </Link>
        </div>
      </article>
    </LegalPageLayout>
  );
}
