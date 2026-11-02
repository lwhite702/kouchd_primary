import React from "react";
import Link from "next/link";
import type { LegalSection } from "@/lib/legal";

interface LegalArticleProps {
  children: React.ReactNode;
}

export function LegalArticle({ children }: LegalArticleProps) {
  return (
    <article className="legal-article" style={{ lineHeight: 1.75 }}>
      {children}
    </article>
  );
}

interface LegalSectionListProps {
  sections: LegalSection[];
}

export function LegalSectionList({ sections }: LegalSectionListProps) {
  return (
    <>
      {sections.map((section, idx) => (
        <section key={idx} style={{ marginBottom: "2.25rem" }}>
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: 800,
              color: "var(--kouchd-ink, #17251f)",
              marginBottom: "0.75rem",
            }}
          >
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
                  {b.label && (
                    <strong style={{ color: "var(--kouchd-ink, #17251f)" }}>{b.label}: </strong>
                  )}
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
          )}
          {section.numbered && section.numbered.length > 0 && (
            <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
              {section.numbered.map((n, nIdx) => (
                <p
                  key={nIdx}
                  style={{ fontSize: "0.92rem", color: "var(--kouchd-muted, #59675f)", margin: 0 }}
                >
                  {n.label && <strong>{n.label}: </strong>}
                  {n.text}
                </p>
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

interface LegalAddendumProps {
  title: string;
  description: string;
  sections: LegalSection[];
}

export function LegalAddendum({ title, description, sections }: LegalAddendumProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div
      style={{
        borderTop: "2px dashed var(--kouchd-line, #ded8ce)",
        paddingTop: "2rem",
        marginTop: "3rem",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "var(--kouchd-forest, #184f3a)",
            display: "inline-block",
            marginBottom: "0.25rem",
          }}
        >
          Product-Specific Terms
        </span>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--kouchd-forest, #184f3a)",
            margin: "0 0 0.5rem",
          }}
        >
          {title}
        </h2>
        <p style={{ fontSize: "0.92rem", color: "var(--kouchd-muted, #59675f)", margin: 0 }}>
          {description}
        </p>
      </div>

      <LegalSectionList sections={sections} />
    </div>
  );
}

export function LegalCrossLinks({
  currentRoute,
}: {
  currentRoute: "privacy" | "terms" | "cookies" | "acceptable-use" | "sms-opt-in";
}) {
  const links = [
    { href: "/privacy", label: "View Privacy Policy", key: "privacy" },
    { href: "/terms", label: "View Terms & Conditions", key: "terms" },
    { href: "/cookies", label: "View Cookie Policy", key: "cookies" },
    { href: "/acceptable-use", label: "View Acceptable Use Policy", key: "acceptable-use" },
    { href: "/sms-opt-in", label: "View SMS Opt-In Form", key: "sms-opt-in" },
  ];

  return (
    <nav
      aria-label="Legal documents"
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
      {links
        .filter((l) => l.key !== currentRoute)
        .map((l) => (
          <Link
            key={l.key}
            href={l.href}
            style={{
              color: "var(--kouchd-forest, #184f3a)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            &rarr; {l.label}
          </Link>
        ))}
    </nav>
  );
}
