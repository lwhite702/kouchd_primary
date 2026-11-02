import React from "react";
import Link from "next/link";
import type { LegalSection } from "@/lib/legal";
import "./legal.css";

export function LegalHeader({
  eyebrow = "Wrelik Brands LLC · Legal Documentation",
  title,
  effectiveDate,
  lastUpdated,
  provider = "Wrelik Brands LLC",
  brand = "Kouchd",
}: {
  eyebrow?: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  provider?: string;
  brand?: string;
}) {
  return (
    <div className="legal-header-block">
      <p className="legal-eyebrow">{eyebrow}</p>
      <h1 className="legal-title">{title}</h1>
      <p className="legal-meta-text">
        Effective Date: {effectiveDate} &middot; Last updated: {lastUpdated} &middot; Brand:{" "}
        <strong>{provider}</strong> (operating <strong>{brand}</strong>)
      </p>
    </div>
  );
}

export function LegalCallout({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-callout-box">
      {icon && <div style={{ flexShrink: 0, marginTop: "0.15rem" }}>{icon}</div>}
      <div>
        <h2 className="legal-callout-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function LegalSectionsRenderer({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((section, idx) => (
        <section key={idx} className="legal-section-block">
          <h2 className="legal-section-heading">{section.title}</h2>
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
            <ol style={{ paddingLeft: "1.25rem", margin: "0.75rem 0 1rem" }}>
              {section.numbered.map((n, nIdx) => (
                <li key={nIdx} style={{ marginBottom: "0.5rem" }}>
                  {n.label && <strong style={{ color: "var(--kouchd-ink, #17251f)" }}>{n.label}: </strong>}
                  <span>{n.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </>
  );
}

export function LegalFooterNav({
  activeRoute,
}: {
  activeRoute: "privacy" | "terms" | "cookies" | "acceptable-use" | "sms-opt-in";
}) {
  return (
    <nav className="legal-nav-footer-box" aria-label="Legal document navigation">
      <Link
        href="/privacy"
        style={{
          fontWeight: activeRoute === "privacy" ? 800 : 500,
          color: "var(--kouchd-forest, #184f3a)",
          textDecoration: "none",
        }}
      >
        Privacy Policy &rarr;
      </Link>
      <Link
        href="/terms"
        style={{
          fontWeight: activeRoute === "terms" ? 800 : 500,
          color: "var(--kouchd-forest, #184f3a)",
          textDecoration: "none",
        }}
      >
        Terms &amp; Conditions &rarr;
      </Link>
      <Link
        href="/cookies"
        style={{
          fontWeight: activeRoute === "cookies" ? 800 : 500,
          color: "var(--kouchd-forest, #184f3a)",
          textDecoration: "none",
        }}
      >
        Cookie Policy &rarr;
      </Link>
      <Link
        href="/acceptable-use"
        style={{
          fontWeight: activeRoute === "acceptable-use" ? 800 : 500,
          color: "var(--kouchd-forest, #184f3a)",
          textDecoration: "none",
        }}
      >
        Acceptable Use &rarr;
      </Link>
    </nav>
  );
}
