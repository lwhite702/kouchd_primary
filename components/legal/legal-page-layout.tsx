import Link from "next/link";
import React from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

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

      {/* Organized Multi-Column Footer */}
      <footer className="legal-organized-footer">
        <div className="legal-footer-inner">
          <div className="legal-footer-grid">
            {/* Brand Column */}
            <div className="legal-footer-col-brand">
              <Link href="/" aria-label="Kouchd home" style={{ display: "inline-flex", textDecoration: "none" }}>
                <KouchdWordmark size="sm" />
              </Link>
              <p className="legal-footer-tagline">
                A calmer way to share a home. Keep house rules, contributions, chores, and check-ins in one private, shared record.
              </p>
              <div className="legal-footer-status">
                <span className="legal-footer-status-dot" aria-hidden="true" />
                <span>Private stay coordination</span>
              </div>
            </div>

            {/* Trust & Legal Column */}
            <div>
              <h4 className="legal-footer-col-title">Trust &amp; Legal</h4>
              <ul className="legal-footer-links">
                <li>
                  <Link href="/privacy" style={{ fontWeight: activeRoute === "privacy" ? 800 : 600 }}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" style={{ fontWeight: activeRoute === "terms" ? 800 : 600 }}>
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" style={{ fontWeight: activeRoute === "cookies" ? 800 : 600 }}>
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/acceptable-use" style={{ fontWeight: activeRoute === "acceptable-use" ? 800 : 600 }}>
                    Acceptable Use
                  </Link>
                </li>
                <li>
                  <Link href="/sms-opt-in" style={{ fontWeight: activeRoute === "sms-opt-in" ? 800 : 600 }}>
                    SMS Acceptance
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="legal-footer-col-title">Resources</h4>
              <ul className="legal-footer-links">
                <li>
                  <a href="https://help.kouchd.com" target="_blank" rel="noopener noreferrer">
                    <span>Help Center &amp; Guides</span>
                    <ArrowUpRight size={12} style={{ opacity: 0.6 }} />
                  </a>
                </li>
                <li>
                  <a href="https://help.kouchd.com/help/hosts/getting-started" target="_blank" rel="noopener noreferrer">
                    <span>Host Setup Guide</span>
                    <ArrowUpRight size={12} style={{ opacity: 0.6 }} />
                  </a>
                </li>
                <li>
                  <a href="https://help.kouchd.com/help/guests/joining-a-stay" target="_blank" rel="noopener noreferrer">
                    <span>Guest Handbook</span>
                    <ArrowUpRight size={12} style={{ opacity: 0.6 }} />
                  </a>
                </li>
                <li>
                  <a href="https://help.kouchd.com/help/legal-trust/stay-agreements" target="_blank" rel="noopener noreferrer">
                    <span>Living Agreements</span>
                    <ArrowUpRight size={12} style={{ opacity: 0.6 }} />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Payment Disclaimer */}
          <div className="legal-footer-bottom">
            <p className="legal-footer-copy">
              &copy; {new Date().getFullYear()} Wrelik Brands LLC. All rights reserved.
            </p>
            <p className="legal-footer-disclaimer">
              Contributions are recorded in Kouchd; payment happens separately between people. Kouchd does not collect or process money and does not replace applicable housing rights.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
