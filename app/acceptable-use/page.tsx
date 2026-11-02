import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LegalHeader, LegalSectionsRenderer } from "@/components/legal/legal-article";
import { acceptableUsePolicy } from "@/lib/legal";

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
        <LegalHeader
          title="Acceptable Use Policy"
          effectiveDate={acceptableUsePolicy.effectiveDate}
          lastUpdated={acceptableUsePolicy.lastUpdated}
        />

        {/* Overview Box */}
        <div className="legal-callout-box">
          <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--kouchd-ink, #17251f)" }}>
            {acceptableUsePolicy.summary}
          </p>
        </div>

        {/* Sections */}
        <LegalSectionsRenderer sections={acceptableUsePolicy.sections} />

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
