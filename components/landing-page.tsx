"use client";

import React from "react";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";

interface LandingPageProps {
  hasClerk?: boolean;
}

export function LandingPage({ hasClerk = true }: LandingPageProps) {
  return (
    <div className="landing-container" style={{ background: "var(--kouchd-paper, #f5f0e8)", minHeight: "100vh", color: "var(--kouchd-ink, #17251f)" }}>
      {/* Navigation */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 36px",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <KouchdWordmark size="md" />
        <nav
          style={{
            display: "none",
            gap: "28px",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--kouchd-muted, #59675f)",
          }}
          className="desktop-nav"
        >
          <a href="#how-it-works" style={{ color: "inherit", textDecoration: "none" }}>How it works</a>
          <a href="#for-hosts-and-guests" style={{ color: "inherit", textDecoration: "none" }}>For hosts & guests</a>
          <a href="#trust" style={{ color: "inherit", textDecoration: "none" }}>Privacy</a>
        </nav>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {hasClerk ? (
            <>
              <SignInButton mode="modal">
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--kouchd-line, #ded8ce)",
                    padding: "10px 18px",
                    borderRadius: "var(--kouchd-radius-999, 999px)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "var(--kouchd-ink, #17251f)",
                  }}
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  style={{
                    background: "var(--kouchd-forest, #184f3a)",
                    border: 0,
                    padding: "10px 20px",
                    borderRadius: "var(--kouchd-radius-999, 999px)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  Get started
                </button>
              </SignUpButton>
            </>
          ) : (
            <Link
              href="/?preview=true"
              style={{
                background: "var(--kouchd-forest, #184f3a)",
                padding: "10px 20px",
                borderRadius: "var(--kouchd-radius-999, 999px)",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "#ffffff",
                textDecoration: "none",
              }}
            >
              Open Workspace
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "48px 36px 72px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "48px",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: "600px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "var(--kouchd-radius-999, 999px)",
              background: "var(--kouchd-sage, #e5edde)",
              color: "var(--kouchd-forest, #184f3a)",
              fontWeight: 700,
              fontSize: "0.82rem",
              marginBottom: "24px",
            }}
          >
            <Sparkles size={14} /> Make room for clarity
          </div>
          <h1
            style={{
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "var(--kouchd-forest, #184f3a)",
              marginBottom: "20px",
            }}
          >
            A shared stay.<br />A softer landing.
          </h1>
          <p
            style={{
              fontSize: "1.15rem",
              lineHeight: 1.55,
              color: "var(--kouchd-muted, #59675f)",
              marginBottom: "32px",
            }}
          >
            Dates, contributions, chores, and expectations. One private place to keep everyone on the same page without the awkward spreadsheet.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", marginBottom: "20px" }}>
            {hasClerk ? (
              <SignUpButton mode="modal">
                <button
                  type="button"
                  style={{
                    background: "var(--kouchd-forest, #184f3a)",
                    border: 0,
                    padding: "14px 28px",
                    borderRadius: "var(--kouchd-radius-16, 16px)",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Create your stay <ArrowRight size={18} />
                </button>
              </SignUpButton>
            ) : null}
            <a
              href="#how-it-works"
              style={{
                background: "var(--kouchd-surface, #fffdf8)",
                border: "1px solid var(--kouchd-line, #ded8ce)",
                padding: "14px 24px",
                borderRadius: "var(--kouchd-radius-16, 16px)",
                fontWeight: 700,
                fontSize: "1.05rem",
                color: "var(--kouchd-ink, #17251f)",
                textDecoration: "none",
              }}
            >
              See how it works
            </a>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--kouchd-muted, #59675f)" }}>
            Already invited? Open the invitation link sent by your host.
          </p>
        </div>

        {/* Hero Illustration / Preview Graphic */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--kouchd-surface, #fffdf8) 0%, #edf3eb 100%)",
            border: "1px solid var(--kouchd-line, #ded8ce)",
            borderRadius: "var(--kouchd-radius-32, 32px)",
            padding: "36px",
            boxShadow: "0 24px 60px rgba(24, 79, 58, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--kouchd-forest, #184f3a)" }}>
              Maple House
            </span>
            <span
              style={{
                background: "var(--kouchd-lime, #dff25e)",
                color: "var(--kouchd-forest, #184f3a)",
                padding: "4px 10px",
                borderRadius: "var(--kouchd-radius-999, 999px)",
                fontSize: "0.75rem",
                fontWeight: 800,
              }}
            >
              ACTIVE STAY
            </span>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "var(--kouchd-radius-16, 16px)",
              padding: "20px",
              border: "1px solid var(--kouchd-line, #ded8ce)",
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--kouchd-muted, #59675f)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Next contribution
            </div>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", margin: "4px 0" }}>
              $200
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--kouchd-muted, #59675f)" }}>
              Due Tuesday, Sep 8 · Recorded outside Kouchd
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div
              style={{
                background: "#ffffff",
                borderRadius: "var(--kouchd-radius-16, 16px)",
                padding: "16px",
                border: "1px solid var(--kouchd-line, #ded8ce)",
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--kouchd-muted, #59675f)", marginBottom: "6px" }}>
                Chores
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700 }}>Kitchen reset</div>
              <div style={{ fontSize: "0.76rem", color: "var(--kouchd-forest, #184f3a)" }}>Alex (Guest)</div>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "var(--kouchd-radius-16, 16px)",
                padding: "16px",
                border: "1px solid var(--kouchd-line, #ded8ce)",
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--kouchd-muted, #59675f)", marginBottom: "6px" }}>
                Expectations
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700 }}>Quiet after 10:30 PM</div>
              <div style={{ fontSize: "0.76rem", color: "var(--kouchd-muted, #59675f)" }}>Mutually accepted</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" style={{ background: "var(--kouchd-surface, #fffdf8)", padding: "80px 36px", borderTop: "1px solid var(--kouchd-line, #ded8ce)", borderBottom: "1px solid var(--kouchd-line, #ded8ce)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 60px" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              How it works
            </p>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", letterSpacing: "-0.03em" }}>
              A good stay starts with the same page.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div style={{ background: "var(--kouchd-paper, #f5f0e8)", borderRadius: "var(--kouchd-radius-24, 24px)", padding: "32px", border: "1px solid var(--kouchd-line, #ded8ce)" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", marginBottom: "14px" }}>01</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "10px" }}>Make a little room.</h3>
              <p style={{ color: "var(--kouchd-muted, #59675f)", lineHeight: 1.5, fontSize: "0.95rem" }}>
                Set the dates, contribution rhythm, and house expectations clearly from the start.
              </p>
            </div>

            <div style={{ background: "var(--kouchd-paper, #f5f0e8)", borderRadius: "var(--kouchd-radius-24, 24px)", padding: "32px", border: "1px solid var(--kouchd-line, #ded8ce)" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", marginBottom: "14px" }}>02</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "10px" }}>Bring your guest in.</h3>
              <p style={{ color: "var(--kouchd-muted, #59675f)", lineHeight: 1.5, fontSize: "0.95rem" }}>
                Send a single-use private link. Both parties review and accept the exact same terms version together.
              </p>
            </div>

            <div style={{ background: "var(--kouchd-paper, #f5f0e8)", borderRadius: "var(--kouchd-radius-24, 24px)", padding: "32px", border: "1px solid var(--kouchd-line, #ded8ce)" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", marginBottom: "14px" }}>03</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "10px" }}>Keep it comfortable.</h3>
              <p style={{ color: "var(--kouchd-muted, #59675f)", lineHeight: 1.5, fontSize: "0.95rem" }}>
                Record contributions, assign household chores, and maintain an immutable, shared history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Hosts & Guests */}
      <section id="for-hosts-and-guests" style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>
          <div
            style={{
              background: "var(--kouchd-surface, #fffdf8)",
              border: "1px solid var(--kouchd-line, #ded8ce)",
              borderRadius: "var(--kouchd-radius-24, 24px)",
              padding: "36px",
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", textTransform: "uppercase" }}>
              For Hosts
            </span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", margin: "8px 0 14px" }}>
              For the person making room.
            </h3>
            <p style={{ color: "var(--kouchd-muted, #59675f)", lineHeight: 1.6, marginBottom: "20px" }}>
              Keep dates, contributions, and boundaries organized without repeating yourself or sending awkward reminder texts.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.92rem" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={16} color="var(--kouchd-forest, #184f3a)" /> Daily or weekly contribution tracking
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={16} color="var(--kouchd-forest, #184f3a)" /> Automatic discount & late-fee calculations
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={16} color="var(--kouchd-forest, #184f3a)" /> Two-party contribution confirmation
              </li>
            </ul>
          </div>

          <div
            style={{
              background: "var(--kouchd-surface, #fffdf8)",
              border: "1px solid var(--kouchd-line, #ded8ce)",
              borderRadius: "var(--kouchd-radius-24, 24px)",
              padding: "36px",
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", textTransform: "uppercase" }}>
              For Guests
            </span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", margin: "8px 0 14px" }}>
              For the person settling in.
            </h3>
            <p style={{ color: "var(--kouchd-muted, #59675f)", lineHeight: 1.6, marginBottom: "20px" }}>
              Know what’s expected, see your own verifiable record, and have an equal voice in agreed house terms and chores.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.92rem" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={16} color="var(--kouchd-forest, #184f3a)" /> Mutual terms acceptance before stay begins
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={16} color="var(--kouchd-forest, #184f3a)" /> Non-cash contribution logging (groceries, labor)
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={16} color="var(--kouchd-forest, #184f3a)" /> Transparent shared balance anytime
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Trust and Privacy Footer */}
      <footer id="trust" style={{ background: "var(--kouchd-forest, #184f3a)", color: "var(--kouchd-paper, #f5f0e8)", padding: "64px 36px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "24px" }}>
            <div>
              <KouchdWordmark size="md" theme="cream" />
              <p style={{ color: "rgba(245, 240, 232, 0.75)", fontSize: "0.92rem", marginTop: "12px", maxWidth: "420px" }}>
                A private, shared household record for host and guest. No automated money movement, no public space listings, and no advertising.
              </p>
            </div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              {hasClerk ? (
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    style={{
                      background: "var(--kouchd-lime, #dff25e)",
                      color: "var(--kouchd-forest, #184f3a)",
                      border: 0,
                      padding: "12px 24px",
                      borderRadius: "var(--kouchd-radius-999, 999px)",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                    }}
                  >
                    Get started
                  </button>
                </SignUpButton>
              ) : null}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(245, 240, 232, 0.15)", paddingTop: "24px", display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "rgba(245, 240, 232, 0.6)", flexWrap: "wrap", gap: "12px" }}>
            <div>&copy; {new Date().getFullYear()} Kouchd. All rights reserved.</div>
            <div>Built for trust, clarity, and comfort.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
