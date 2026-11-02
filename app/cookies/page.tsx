import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LegalHeader, LegalSectionsRenderer } from "@/components/legal/legal-article";
import { cookiePolicy } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy | Kouchd",
  description:
    "Cookie and Tracking Policy for Kouchd, operated by Wrelik Brands LLC. Learn how cookies and local storage are used.",
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout activeRoute="cookies">
      <article className="legal-article" style={{ lineHeight: 1.75 }}>
        {/* Header */}
        <LegalHeader
          title="Cookie Policy"
          effectiveDate={cookiePolicy.effectiveDate}
          lastUpdated={cookiePolicy.lastUpdated}
        />

        {/* Overview Box */}
        <div className="legal-callout-box">
          <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--kouchd-ink, #17251f)" }}>
            {cookiePolicy.summary}
          </p>
        </div>

        {/* Sections */}
        <LegalSectionsRenderer sections={cookiePolicy.sections} />

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
          <Link href="/acceptable-use" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none" }}>
            &rarr; View Acceptable Use Policy
          </Link>
        </div>
      </article>
    </LegalPageLayout>
  );
}
