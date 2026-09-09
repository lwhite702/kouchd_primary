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
            <span>MAKE ROOM FOR CLARITY</span>
          </div>

          <h1 className="landing-hero-title">
            <span>A shared stay.</span>
            <span>A softer landing.</span>
          </h1>

          <p className="landing-hero-desc">
            Dates, contributions, chores, and expectations. One private place to
            keep the practical stuff clear—and the welcome warm.
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
          <h3 className="landing-trust-banner-title">Your stay. Your shared record.</h3>
          <p className="landing-trust-banner-desc">
            Invite the person you’re staying with. Keep your dates, expectations, and
            contributions in a private shared space.
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
            <p>Make room for clarity.</p>
            <p>Kouchd records shared expectations; it does not replace applicable housing rights.</p>
          </div>
        </footer>
      </section>
    </div>
  );
}

