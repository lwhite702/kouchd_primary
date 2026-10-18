import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";

import { KouchdWordmark } from "@/components/brand/kouchd-logo";

interface LegalPageLayoutProps {
  children: React.ReactNode;
  activeRoute?: "privacy" | "terms" | "sms-opt-in" | "cookies" | "acceptable-use";
}

export function LegalPageLayout({ children, activeRoute }: LegalPageLayoutProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--kouchd-paper, #f5f0e8)",
        color: "var(--kouchd-ink, #17251f)",
        fontFamily: "var(--font-manrope), sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          borderBottom: "1px solid var(--kouchd-line, #ded8ce)",
          background: "var(--kouchd-surface, #fffdf8)",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ display: "inline-flex", textDecoration: "none" }} aria-label="Kouchd home">
            <KouchdWordmark size="sm" />
          </Link>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
          <Link
            href="/privacy"
            style={{
              fontSize: "0.88rem",
              fontWeight: activeRoute === "privacy" ? 800 : 600,
              color: activeRoute === "privacy" ? "var(--kouchd-forest, #184f3a)" : "var(--kouchd-muted, #59675f)",
              textDecoration: "none",
            }}
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            style={{
              fontSize: "0.88rem",
              fontWeight: activeRoute === "terms" ? 800 : 600,
              color: activeRoute === "terms" ? "var(--kouchd-forest, #184f3a)" : "var(--kouchd-muted, #59675f)",
              textDecoration: "none",
            }}
          >
            Terms &amp; Conditions
          </Link>
          <Link
            href="/cookies"
            style={{
              fontSize: "0.88rem",
              fontWeight: activeRoute === "cookies" ? 800 : 600,
              color: activeRoute === "cookies" ? "var(--kouchd-forest, #184f3a)" : "var(--kouchd-muted, #59675f)",
              textDecoration: "none",
            }}
          >
            Cookies
          </Link>
          <Link
            href="/acceptable-use"
            style={{
              fontSize: "0.88rem",
              fontWeight: activeRoute === "acceptable-use" ? 800 : 600,
              color: activeRoute === "acceptable-use" ? "var(--kouchd-forest, #184f3a)" : "var(--kouchd-muted, #59675f)",
              textDecoration: "none",
            }}
          >
            Acceptable Use
          </Link>
          <Link
            href="/sms-opt-in"
            style={{
              fontSize: "0.88rem",
              fontWeight: activeRoute === "sms-opt-in" ? 800 : 600,
              color: activeRoute === "sms-opt-in" ? "var(--kouchd-forest, #184f3a)" : "var(--kouchd-muted, #59675f)",
              textDecoration: "none",
            }}
          >
            SMS Acceptance
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--kouchd-forest, #184f3a)",
              textDecoration: "none",
              background: "rgba(24, 79, 58, 0.08)",
              padding: "6px 12px",
              borderRadius: "8px",
            }}
          >
            <ArrowLeft size={16} /> Back to App
          </Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="legal-main">
        <div className="legal-card screen-transition">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--kouchd-line, #ded8ce)",
          background: "var(--kouchd-surface, #fffdf8)",
          padding: "1.75rem 1.5rem",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "var(--kouchd-muted, #59675f)",
        }}
      >
        <p style={{ margin: "0 0 0.5rem" }}>
          <strong>Kouchd</strong> is operated by <strong>Wrelik Brands LLC</strong>.
        </p>
        <p style={{ margin: "0 0 0.75rem", display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ color: "var(--kouchd-forest, #184f3a)", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link href="/terms" style={{ color: "var(--kouchd-forest, #184f3a)", textDecoration: "none" }}>
            Terms &amp; Conditions
          </Link>
          <Link href="/cookies" style={{ color: "var(--kouchd-forest, #184f3a)", textDecoration: "none" }}>
            Cookie Policy
          </Link>
          <Link href="/acceptable-use" style={{ color: "var(--kouchd-forest, #184f3a)", textDecoration: "none" }}>
            Acceptable Use
          </Link>
          <Link href="/sms-opt-in" style={{ color: "var(--kouchd-forest, #184f3a)", textDecoration: "none" }}>
            SMS Opt-In
          </Link>
          <Link href="/brand" style={{ color: "var(--kouchd-forest, #184f3a)", textDecoration: "none" }}>
            Brand &amp; Design System
          </Link>
        </p>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--kouchd-muted, #59675f)" }}>
          &copy; {new Date().getFullYear()} Wrelik Brands LLC. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
