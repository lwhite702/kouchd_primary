"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";

interface LandingPageProps {
  hasClerk?: boolean;
}

export function LandingPage({ hasClerk = true }: LandingPageProps) {
  return (
    <div className="landing-page-root">
      {/* 13:39 Navigation */}
      <header className="landing-nav-bar">
        <Link href="/" className="landing-brand-link">
          <KouchdWordmark size="md" />
        </Link>

        <nav className="landing-nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#hosts-and-guests">For hosts &amp; guests</a>
          <a href="#trust">What’s next</a>
          <a href="https://help.kouchd.com" target="_blank" rel="noopener noreferrer">Docs</a>
        </nav>

        <div className="landing-nav-actions">
          {hasClerk ? (
            <SignInButton mode="modal">
              <button type="button" className="landing-btn-secondary">
                Sign in
              </button>
            </SignInButton>
          ) : (
            <Link href="/?preview=true" className="landing-btn-secondary">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* 13:50 Hero */}
      <section className="landing-hero-section">
        <div className="landing-hero-content">
          <div className="landing-status-pill">
            <span>COORDINATION &middot; CLARITY &middot; MUTUAL RESPECT</span>
          </div>

          <h1 className="landing-hero-title">
            <span>A shared stay.</span>
            <span>A softer landing.</span>
          </h1>

          <p className="landing-hero-desc">
            Kouchd is a friendly communication and organization tool for hosts and guests. 
            Keep track of dates, household contributions, chore rotations, and shared expectations in one comfortable space—so everyone stays on the same page.
          </p>

          <div className="landing-hero-action-group">
            {hasClerk ? (
              <SignUpButton mode="modal">
                <button type="button" className="landing-btn-primary">
                  Start a shared stay
                </button>
              </SignUpButton>
            ) : (
              <Link href="/?preview=true" className="landing-btn-primary">
                Start a shared stay
              </Link>
            )}
            <p className="landing-hero-hint">
              Already invited? Open your invitation link.
            </p>
          </div>
        </div>

        {/* 13:59 Authentic Hero Room Vector Artwork */}
        <div className="landing-hero-visual" data-name="A room with space for everyone">
          <Image
            src="/hero-illustration.svg"
            alt="A room with space for everyone — Kouchd illustration"
            width={648}
            height={464}
            priority
            className="landing-hero-img"
          />
        </div>
      </section>

      {/* 13:121 Product preview */}
      <section className="landing-preview-section">
        <h2 className="landing-preview-title">
          <span>Less guessing.</span>
          <span>More feeling at home.</span>
        </h2>

        <div className="landing-preview-grid">
          {/* Stay Card (9:63) */}
          <div className="landing-preview-card landing-card-stay">
            <h3 className="landing-card-heading">Your stay at Jordan’s</h3>
            <p className="landing-card-subtext">Sep 1 – Sep 21 · Shared with Alex</p>
            <div className="landing-card-rule" />
            <p className="landing-card-meta">Dates and expectations, agreed together</p>
          </div>

          {/* Contribution summary (13:129) */}
          <div className="landing-preview-card landing-card-contrib">
            <span className="landing-card-label">Next contribution</span>
            <div className="landing-card-big-price">$200</div>
            <p className="landing-card-subtext">Due Sep 8 · Recorded outside Kouchd</p>
          </div>

          {/* Chores preview (13:133) */}
          <div className="landing-preview-card landing-card-chores">
            <h3 className="landing-card-heading-dark">A little give and take.</h3>
            <div className="landing-card-chores-list">
              <p>Kitchen reset · Alex</p>
              <p>Bins on Tuesday · Jordan</p>
              <p>Sunday check-in · Together</p>
            </div>
          </div>
        </div>

        <p className="landing-preview-footnote">
          Illustrative product preview. Kouchd currently records contributions; it does not move money.
        </p>
        {/* Communication & Neutral Tool Clarification */}
        <div style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "24px 28px",
          backgroundColor: "#fbf8f2",
          border: "1px solid var(--kouchd-line, #ded8ce)",
          borderRadius: "var(--kouchd-radius-24, 24px)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          textAlign: "left"
        }}>
          <div style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--kouchd-forest, #184f3a)"
          }}>
            A tool for communication, not friction
          </div>
          <h3 style={{
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "var(--kouchd-ink, #17251f)",
            lineHeight: 1.35
          }}>
            Designed to support relationships, never to disparage or single anyone out.
          </h3>
          <p style={{
            margin: 0,
            fontSize: "0.95rem",
            lineHeight: 1.6,
            color: "var(--kouchd-muted, #59675f)"
          }}>
            Opening your home or staying with friends, family, or colleagues shouldn’t come with awkward guesswork. Kouchd isn’t a landlord app or an enforcement mechanism—it is simply a shared notebook where both host and guest communicate openly, organize household responsibilities, and celebrate contributions with mutual respect.
          </p>
        </div>

      </section>

      {/* 14:52 How it works */}
      <section id="how-it-works" className="landing-how-section">
        <h2 className="landing-how-title">
          <span>A good stay starts</span>
          <span>with the same page.</span>
        </h2>

        <div className="landing-steps-grid">
          <div className="landing-step-box">
            <span className="landing-step-num">01</span>
            <h3 className="landing-step-heading">Make a little room.</h3>
            <p className="landing-step-desc">
              Set the dates, contribution rhythm, and house expectations.
            </p>
          </div>

          <div className="landing-step-box">
            <span className="landing-step-num">02</span>
            <h3 className="landing-step-heading">Bring your guest in.</h3>
            <p className="landing-step-desc">
              Send a private invitation. Review and accept the same version together.
            </p>
          </div>

          <div className="landing-step-box">
            <span className="landing-step-num">03</span>
            <h3 className="landing-step-heading">Keep it comfortable.</h3>
            <p className="landing-step-desc">
              Record contributions, share chores, and make time for a check-in.
            </p>
          </div>
        </div>

        {/* 14:67 For both sides of the stay */}
        <div id="hosts-and-guests" className="landing-both-sides-grid">
          <div className="landing-side-box landing-side-host">
            <h3 className="landing-side-heading">For the person making room.</h3>
            <p className="landing-side-desc">
              Keep dates, contributions, and boundaries organized without repeating yourself.
            </p>
          </div>

          <div className="landing-side-box landing-side-guest">
            <h3 className="landing-side-heading">For the person settling in.</h3>
            <p className="landing-side-desc">
              Know what’s expected, see your own record, and have a voice in the agreement.
            </p>
          </div>
        </div>
      </section>

      {/* 14:96 Trust and next steps */}
      <section id="trust" className="landing-trust-section">
        <div className="landing-trust-banner">
          <h3 className="landing-trust-banner-title">A shared record built on mutual trust.</h3>
          <p className="landing-trust-banner-desc">
            Kouchd provides an organized platform for communication, agreement clarity, and task organization. Private financial scoping protects privacy, and both host and guest maintain a clear voice in every expectation set.
          </p>
        </div>

        <div className="landing-coming-soon-box">
          <div className="landing-status-pill-sky">
            <span>Coming soon</span>
          </div>
          <h3 className="landing-coming-soon-heading">More room to grow.</h3>
          <div className="landing-coming-soon-desc">
            <p>Multiple stays and guests. In-app payments. Native iOS and Android apps.</p>
            <p>We’re designing the next chapter of Kouchd.</p>
          </div>
        </div>

        <h3 className="landing-faq-title">A few things to know.</h3>

        <div className="landing-faq-stack">
          <div className="landing-faq-entry">
            <h4 className="landing-faq-query">Is Kouchd an enforcement or collection tool?</h4>
            <p className="landing-faq-response">
              No. Kouchd is strictly an organizational and communication tool. It is never meant to be offensive, punitive, or disparaging. It simply gives hosts and guests a neutral, positive place to keep track of shared dates, household contributions, chores, and boundaries so nothing falls through the cracks.
            </p>
            <div className="landing-faq-sep" />
          </div>

          <div className="landing-faq-entry">
            <h4 className="landing-faq-query">Can I find a place to stay here?</h4>
            <p className="landing-faq-response">
              Kouchd helps people who already know where they’re staying. There are no public listings or bookings.
            </p>
            <div className="landing-faq-sep" />
          </div>

          <div className="landing-faq-entry">
            <h4 className="landing-faq-query">Does Kouchd collect payments?</h4>
            <p className="landing-faq-response">
              Not currently. You can record payments made elsewhere and other agreed contributions in your shared record.
            </p>
            <div className="landing-faq-sep" />
          </div>

          <div className="landing-faq-entry">
            <h4 className="landing-faq-query">What if our plans change?</h4>
            <p className="landing-faq-response">
              Review updated expectations together. The shared record keeps the details easy to refer back to.
            </p>
            <div className="landing-faq-sep" />
          </div>
        </div>

        {/* 14:118 Final Call to Action */}
        <div className="landing-final-banner">
          <h3 className="landing-final-banner-title">
            <span>Make room for</span>
            <span>a better stay.</span>
          </h3>

          <div>
            {hasClerk ? (
              <SignUpButton mode="modal">
                <button type="button" className="landing-btn-secondary-large">
                  Start a shared stay
                </button>
              </SignUpButton>
            ) : (
              <Link href="/?preview=true" className="landing-btn-secondary-large">
                Start a shared stay
              </Link>
            )}
          </div>
        </div>

        {/* 14:122 Footer */}
        <footer className="landing-page-footer">
          <Link href="/" className="landing-brand-link">
            <KouchdWordmark size="md" />
          </Link>
          <div className="landing-page-footer-copy">
            <p style={{ marginBottom: 8 }}>
              <Link href="/privacy" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none", marginRight: 16 }}>Privacy Policy</Link>
              <Link href="/terms" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none", marginRight: 16 }}>Terms &amp; Conditions</Link>
              <Link href="/sms-opt-in" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 700, textDecoration: "none", marginRight: 16 }}>SMS Acceptance</Link>
              <a href="https://help.kouchd.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--kouchd-muted, #59675f)", textDecoration: "none" }}>Help Center &rarr;</a>
            </p>
            <p style={{ marginBottom: 4 }}>Make room for clarity.</p>
            <p style={{ marginBottom: 4 }}>Kouchd records shared expectations; it does not replace applicable housing rights.</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--kouchd-muted, #59675f)" }}>&copy; {new Date().getFullYear()} Wrelik Brands LLC. All rights reserved.</p>
          </div>
        </footer>
      </section>
    </div>
  );
}

