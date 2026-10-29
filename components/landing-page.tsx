"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CircleHelp,
  ClipboardList,
  HeartHandshake,
  House,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { appVersion } from "@/lib/version";
import { HELP_LINKS } from "@/lib/help-links";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { MarketingHeader, MarketingStartButton as StartButton } from "@/components/marketing/marketing-header";
import "./landing-v21.css";

interface LandingPageProps {
  hasClerk?: boolean;
}

type PreviewTab = "overview" | "guide" | "ledger" | "chores";

export function LandingPage({ hasClerk = true }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("overview");
  const [guideSceneTab, setGuideSceneTab] = useState<"overview" | "guide" | "updates">("overview");

  return (
    <main className="landing-v21" id="main-content">
      <a className="marketing-skip-link" href="#v21-hero-title">
        Skip to content
      </a>
      <MarketingHeader hasClerk={hasClerk} />

      {/* Hero Section */}
      <section className="v21-hero" aria-labelledby="v21-hero-title">
        <div className="v21-hero-copy">
          <p className="v21-eyebrow">
            <span aria-hidden="true" /> A calmer way to share a home
          </p>
          <h1 id="v21-hero-title">Your space. Your people. Everyone on the same page.</h1>
          <p className="v21-lede">
            Whether someone is staying for a few nights or a few months, Kouchd brings stay agreements,
            house details, contribution records, and chores together so hosts and guests can see what
            was agreed and what needs attention next.
          </p>
          <div className="v21-hero-actions">
            <StartButton hasClerk={hasClerk} />
            <a className="v21-text-link" href="#how-it-works">
              See how it works <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="v21-invite-note">Already invited? Open the link your host shared with you.</p>
        </div>
        <div className="v21-hero-art" aria-label="Illustration of a welcoming shared living room">
          <Image
            src="/landing-v21/room.svg"
            alt="A sunlit living room with a green sofa and a small table"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 54vw"
            className="v21-room-desktop"
          />
          <Image
            src="/landing-v21/room-mobile.svg"
            alt="A warm, welcoming shared living room"
            fill
            priority
            sizes="100vw"
            className="v21-room-mobile"
          />
          <div className="v21-art-note">
            <span className="v21-note-icon" aria-hidden="true">
              <House size={16} />
            </span>
            <span>
              <strong>One shared stay space</strong>
              <small>Details, records, and to-dos together</small>
            </span>
          </div>
        </div>
      </section>

      {/* Proof Grid Section */}
      <section className="v21-proof" aria-labelledby="v21-proof-title">
        <div className="v21-proof-heading">
          <p className="v21-eyebrow v21-eyebrow-light">A clearer picture for everyone</p>
          <h2 id="v21-proof-title">
            Your shared stay,<br className="v21-desktop-break" /> all in one place.
          </h2>
          <p>See who is coming, what everyone agreed to, and what needs attention next.</p>
        </div>
        <div className="v21-proof-grid">
          <article className="v21-proof-card">
            <span className="v21-proof-icon" aria-hidden="true">
              <Users size={19} />
            </span>
            <span className="v21-proof-label">Guests</span>
            <strong>5</strong>
            <small>3 confirmed · 2 pending</small>
          </article>
          <article className="v21-proof-card">
            <span className="v21-proof-icon" aria-hidden="true">
              <ClipboardList size={19} />
            </span>
            <span className="v21-proof-label">Contributions</span>
            <strong className="v21-proof-word">Recorded</strong>
            <small>Payment happens separately</small>
          </article>
          <article className="v21-proof-card">
            <span className="v21-proof-icon" aria-hidden="true">
              <Check size={19} />
            </span>
            <span className="v21-proof-label">Chores</span>
            <strong>3</strong>
            <small>1 needs an owner</small>
          </article>
          <article className="v21-proof-card">
            <span className="v21-proof-icon" aria-hidden="true">
              <Sparkles size={19} />
            </span>
            <span className="v21-proof-label">Next check-in</span>
            <strong className="v21-proof-word">Friday</strong>
            <small>Scheduled by the host</small>
          </article>
        </div>

        {/* Credibility Trust Bar */}
        <div className="v21-proof-trust-bar" aria-label="Key privacy and product principles">
          <span><ShieldCheck size={15} aria-hidden="true" /> 100% Private household stays</span>
          <span><LockKeyhole size={15} aria-hidden="true" /> Zero payment processing or escrow fees</span>
          <span><House size={15} aria-hidden="true" /> No forced app download for guests</span>
        </div>
        <p className="v21-preview-disclaimer">Illustrative preview · Example details, not live household data</p>
      </section>

      {/* Interactive Product Preview Section */}
      <section className="v21-product" aria-labelledby="v21-product-title">
        <div className="v21-product-preview" aria-label="Interactive example Kouchd stay dashboard preview">
          <div className="v21-preview-window">
            <div className="v21-preview-top">
              <span className="v21-preview-mark">
                <KouchdWordmark size="sm" />
              </span>
              <div className="v21-preview-tab-controls" role="tablist" aria-label="Stay preview views">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "overview"}
                  className={`v21-tab-btn ${activeTab === "overview" ? "active" : ""}`}
                  onClick={() => setActiveTab("overview")}
                >
                  Overview
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "guide"}
                  className={`v21-tab-btn ${activeTab === "guide" ? "active" : ""}`}
                  onClick={() => setActiveTab("guide")}
                >
                  House Guide
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "ledger"}
                  className={`v21-tab-btn ${activeTab === "ledger" ? "active" : ""}`}
                  onClick={() => setActiveTab("ledger")}
                >
                  Ledger
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "chores"}
                  className={`v21-tab-btn ${activeTab === "chores" ? "active" : ""}`}
                  onClick={() => setActiveTab("chores")}
                >
                  Chores
                </button>
              </div>
              <span className="v21-preview-avatar" aria-hidden="true">J</span>
            </div>

            <div className="v21-preview-inner">
              <span className="v21-preview-kicker">EXAMPLE STAY · JUNIPER HOUSE</span>

              {activeTab === "overview" && (
                <>
                  <h3>Everything that needs attention</h3>
                  <div className="v21-preview-summary">
                    <span><strong>3</strong> confirmed</span>
                    <span><strong>2</strong> due</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house"><House size={17} aria-hidden="true" /></span>
                    <span><strong>House guide</strong><small>Parking, Wi-Fi, quiet hours</small></span>
                    <em className="tag-ready">Ready</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-ledger"><ClipboardList size={17} aria-hidden="true" /></span>
                    <span><strong>Contribution</strong><small>Your share · recorded in Kouchd</small></span>
                    <em className="tag-recorded">Recorded</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-chore"><Check size={17} aria-hidden="true" /></span>
                    <span><strong>Groceries</strong><small>Assigned to guest</small></span>
                    <em className="tag-due">Due today</em>
                  </div>
                </>
              )}

              {activeTab === "guide" && (
                <>
                  <h3>House information & rules</h3>
                  <div className="v21-preview-summary">
                    <span><strong>Wi-Fi</strong> JuniperGuest</span>
                    <span><strong>Quiet</strong> 10 pm – 8 am</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house"><House size={17} aria-hidden="true" /></span>
                    <span><strong>Entry instructions</strong><small>Keypad code shared in private stay details</small></span>
                    <em className="tag-ready">Active</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house"><Users size={17} aria-hidden="true" /></span>
                    <span><strong>Trash & Recycling</strong><small>Bins go to curb on Wednesday night</small></span>
                    <em className="tag-ready">Weekly</em>
                  </div>
                </>
              )}

              {activeTab === "ledger" && (
                <>
                  <h3>Contribution records</h3>
                  <div className="v21-preview-summary">
                    <span><strong>Oct total</strong> $120.50</span>
                    <span><strong>Status</strong> Up to date</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-ledger"><ClipboardList size={17} aria-hidden="true" /></span>
                    <span><strong>Shared utilities</strong><small>Oct 8 · Recorded contribution</small></span>
                    <em className="tag-recorded">$84.00</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-ledger"><Check size={17} aria-hidden="true" /></span>
                    <span><strong>Shared pantry & milk</strong><small>Oct 7 · Recorded contribution</small></span>
                    <em className="tag-recorded">$36.50</em>
                  </div>
                </>
              )}

              {activeTab === "chores" && (
                <>
                  <h3>Shared household responsibilities</h3>
                  <div className="v21-preview-summary">
                    <span><strong>2</strong> open</span>
                    <span><strong>1</strong> completed</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-chore"><Check size={17} aria-hidden="true" /></span>
                    <span><strong>Take bins to the curb</strong><small>Alex · Due Thursday</small></span>
                    <em className="tag-due">Tomorrow</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-chore"><Check size={17} aria-hidden="true" /></span>
                    <span><strong>Restock coffee shelf</strong><small>Jordan · Done today</small></span>
                    <em className="tag-ready">Done</em>
                  </div>
                </>
              )}
            </div>
          </div>
          <span className="v21-preview-orbit orbit-one" aria-hidden="true" />
          <span className="v21-preview-orbit orbit-two" aria-hidden="true" />
        </div>
        <div className="v21-product-copy">
          <p className="v21-eyebrow">A look inside Kouchd</p>
          <h2 id="v21-product-title">The details of a shared stay, in one place.</h2>
          <p>House details and updates, contribution records, chores, and check-ins—all in one clear view.</p>
          <a className="v21-text-link" href="#how-it-works">
            See how it works <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Feature Tour */}
      <section className="v21-feature-tour" id="features" aria-labelledby="v21-feature-title">
        <div className="v21-feature-intro">
          <p className="v21-eyebrow">A shared place to come back to</p>
          <h2 id="v21-feature-title">The details, the ledger, and the to-dos.</h2>
          <p className="v21-feature-description">
            Kouchd brings the practical parts of sharing a stay together—so everyone can find the right
            information and know what is next.
          </p>
          <p className="v21-feature-disclaimer">The screens below use illustrative example content.</p>
        </div>

        {/* Feature 01: House Guide */}
        <article className="v21-feature-row" aria-labelledby="v21-feature-guide-title">
          <div className="v21-feature-copy">
            <span className="v21-feature-index">01 <span>Stay information</span></span>
            <h3 id="v21-feature-guide-title">Keep the house guide and updates close at hand.</h3>
            <p>Share the details people need before and during a stay, then post updates in the same place guests already use to check their plans.</p>
            <ul>
              <li><Check size={16} aria-hidden="true" /> House details guests can look up again</li>
              <li><Check size={16} aria-hidden="true" /> Stay updates alongside the shared context</li>
              <li><Check size={16} aria-hidden="true" /> Guest list and scheduled check-in date in view</li>
            </ul>
          </div>
          <div className="v21-feature-scene scene-guide" aria-label="Interactive house guide scene">
            <div className="v21-scene-window">
              <div className="v21-scene-top">
                <span><i className="scene-dot" aria-hidden="true" /> JUNIPER HOUSE</span>
                <span className="scene-date">OCT 10—13</span>
              </div>
              <div className="scene-tabs" role="tablist" aria-label="Guide views">
                <button
                  type="button"
                  className={guideSceneTab === "overview" ? "selected" : ""}
                  onClick={() => setGuideSceneTab("overview")}
                >
                  Overview
                </button>
                <button
                  type="button"
                  className={guideSceneTab === "guide" ? "selected" : ""}
                  onClick={() => setGuideSceneTab("guide")}
                >
                  House guide
                </button>
                <button
                  type="button"
                  className={guideSceneTab === "updates" ? "selected" : ""}
                  onClick={() => setGuideSceneTab("updates")}
                >
                  Updates
                </button>
              </div>

              {guideSceneTab === "overview" && (
                <>
                  <div className="scene-welcome">
                    <span className="scene-house-icon" aria-hidden="true"><House size={17} /></span>
                    <div>
                      <strong>Welcome to the house</strong>
                      <small>The useful details, all together</small>
                    </div>
                  </div>
                  <div className="scene-info-grid">
                    <div><span>WI-FI</span><strong>JuniperGuest</strong><small>Ask Maya for password</small></div>
                    <div><span>QUIET HOURS</span><strong>10 pm – 8 am</strong><small>Thanks for keeping it cozy</small></div>
                  </div>
                </>
              )}

              {guideSceneTab === "guide" && (
                <div className="scene-info-grid">
                  <div><span>PARKING</span><strong>Driveway right side</strong><small>Leave space for garbage truck</small></div>
                  <div><span>KITCHEN</span><strong>Shared shelves 1 & 2</strong><small>Label your container</small></div>
                </div>
              )}

              {guideSceneTab === "updates" && (
                <div className="scene-update">
                  <span className="scene-avatar" aria-hidden="true">M</span>
                  <div>
                    <strong>Update from Maya <small>Today</small></strong>
                    <p>Use the side entrance after 8. The porch light is on.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Feature 02: Ledger */}
        <article className="v21-feature-row v21-feature-row-reverse" aria-labelledby="v21-feature-ledger-title">
          <div className="v21-feature-copy">
            <span className="v21-feature-index">02 <span>Contribution ledger</span></span>
            <h3 id="v21-feature-ledger-title">Keep a clear record of shared costs.</h3>
            <p>Give each contribution a place in the stay record, with its note, status, and date easy to review.</p>
            <ul>
              <li><Check size={16} aria-hidden="true" /> Entries stay connected to the household</li>
              <li><Check size={16} aria-hidden="true" /> Notes give each record useful context</li>
              <li><Check size={16} aria-hidden="true" /> A shared record helps everyone stay oriented</li>
            </ul>
            <p className="v21-feature-note">
              Kouchd records contributions; payment is arranged separately between people.
            </p>
          </div>
          <div className="v21-feature-scene scene-ledger" aria-label="Contribution ledger preview">
            <div className="v21-scene-window">
              <div className="scene-ledger-head">
                <div>
                  <span className="scene-section-label">JUNIPER HOUSE · LEDGER</span>
                  <strong>Contribution records</strong>
                </div>
                <span className="scene-filter">This stay <ArrowDown size={12} aria-hidden="true" /></span>
              </div>
              <div className="scene-ledger-summary">
                <span>RECENT ACTIVITY</span>
                <strong>Shared costs, clearly noted</strong>
                <small>Illustrative entries · recorded only</small>
              </div>
              <div className="scene-ledger-row">
                <span className="scene-ledger-icon" aria-hidden="true"><House size={16} /></span>
                <div><strong>Utilities</strong><small>Oct 8 · Shared expense</small></div>
                <div className="scene-amount"><strong>$84.00</strong><small>Recorded</small></div>
              </div>
              <div className="scene-ledger-row">
                <span className="scene-ledger-icon grocery-icon" aria-hidden="true"><Check size={16} /></span>
                <div><strong>Shared groceries</strong><small>Oct 7 · Shared expense</small></div>
                <div className="scene-amount"><strong>$36.50</strong><small>Recorded</small></div>
              </div>
              <div className="scene-ledger-foot">
                <ClipboardList size={15} aria-hidden="true" />
                <span>Entries are a shared record—not a payment transfer.</span>
              </div>
            </div>
          </div>
        </article>

        {/* Feature 03: Chores */}
        <article className="v21-feature-row" aria-labelledby="v21-feature-tasks-title">
          <div className="v21-feature-copy">
            <span className="v21-feature-index">03 <span>Chores and check-ins</span></span>
            <h3 id="v21-feature-tasks-title">Make shared responsibilities easier to follow.</h3>
            <p>Put a name and a due date beside a task, and keep the host-scheduled check-in date in view.</p>
            <ul>
              <li><Check size={16} aria-hidden="true" /> See what needs doing and who owns it</li>
              <li><Check size={16} aria-hidden="true" /> Keep due dates from getting buried in a chat</li>
              <li><Check size={16} aria-hidden="true" /> Keep the scheduled check-in date easy to find</li>
            </ul>
          </div>
          <div className="v21-feature-scene scene-tasks" aria-label="Chores and tasks preview">
            <div className="v21-scene-window">
              <div className="scene-tasks-heading">
                <div>
                  <span className="scene-section-label">JUNIPER HOUSE · TOGETHER</span>
                  <strong>Things to take care of</strong>
                </div>
                <span className="scene-task-count">2 open</span>
              </div>
              <div className="scene-task-row">
                <span className="scene-check" aria-hidden="true" />
                <div><strong>Take the bins to the curb</strong><small>Alex · Due Thursday</small></div>
                <span className="scene-due">Tomorrow</span>
              </div>
              <div className="scene-task-row">
                <span className="scene-check done" aria-hidden="true"><Check size={12} /></span>
                <div><strong>Restock the coffee shelf</strong><small>Jordan · Done today</small></div>
                <span className="scene-done">Done</span>
              </div>
              <div className="scene-checkin">
                <span className="scene-checkin-icon" aria-hidden="true"><Users size={16} /></span>
                <div>
                  <span className="scene-section-label">NEXT CHECK-IN</span>
                  <strong>Scheduled check-in</strong>
                  <small>Friday · Set by the host</small>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* How it works */}
      <section className="v21-how" id="how-it-works" aria-labelledby="v21-how-title">
        <div className="v21-section-heading">
          <p className="v21-eyebrow">Simple from the start</p>
          <h2 id="v21-how-title">Start with the details everyone needs.</h2>
        </div>
        <div className="v21-steps">
          <article>
            <span className="v21-step-number" aria-hidden="true">01</span>
            <h3>Set up the stay</h3>
            <p>Add the people, dates, house details, and contribution schedule.</p>
          </article>
          <article>
            <span className="v21-step-number" aria-hidden="true">02</span>
            <h3>Agree on expectations</h3>
            <p>Share the terms and house rules so everyone can review them.</p>
          </article>
          <article>
            <span className="v21-step-number" aria-hidden="true">03</span>
            <h3>Keep things organized</h3>
            <p>Record contributions and coordinate chores as the stay unfolds.</p>
          </article>
        </div>
      </section>

      {/* Persona Callouts */}
      <section className="v21-people" aria-label="For hosts and guests">
        <article className="v21-people-card">
          <span className="v21-people-symbol" aria-hidden="true"><House size={20} /></span>
          <div>
            <p className="v21-eyebrow">For hosts</p>
            <h2>Share the details once.</h2>
            <p>Keep house information, agreements, and the stay’s moving pieces together for everyone.</p>
          </div>
          <span className="v21-people-art host-art" aria-hidden="true">
            <House size={76} strokeWidth={1.1} />
          </span>
        </article>
        <article className="v21-people-card guest-card">
          <span className="v21-people-symbol" aria-hidden="true"><HeartHandshake size={20} /></span>
          <div>
            <p className="v21-eyebrow">For guests</p>
            <h2>Know what to expect.</h2>
            <p>Review the current agreement, find the house details, and keep track of your own contribution records and assigned chores.</p>
          </div>
          <span className="v21-people-art guest-art" aria-hidden="true">
            <Sparkles size={74} strokeWidth={1.1} />
          </span>
        </article>
      </section>

      {/* Story Preview */}
      <section className="v21-story-preview" aria-labelledby="v21-story-title">
        <div>
          <p className="v21-eyebrow">Why we built Kouchd</p>
          <h2 id="v21-story-title">A little clarity makes room for a better stay.</h2>
        </div>
        <div>
          <p>Hosts deserve to feel comfortable at home. Guests deserve to feel welcome, respected, and informed. We’re building practical tools that help both sides know where they stand.</p>
          <Link className="v21-text-link" href="/about">
            Read our story <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Privacy & Newsletter */}
      <section className="v21-privacy" id="privacy" aria-labelledby="v21-privacy-title">
        <div className="v21-privacy-copy">
          <p className="v21-eyebrow">Private by design</p>
          <h2 id="v21-privacy-title">A shared space for the people in the stay.</h2>
          <p>
            Kouchd is built around private households. Hosts and guests see the information relevant to
            their stay, with contributions recorded clearly for everyone involved.
          </p>
          <div className="v21-privacy-points">
            <span><LockKeyhole size={17} aria-hidden="true" /> Private household access</span>
            <span><MessageCircle size={17} aria-hidden="true" /> Updates and house details</span>
          </div>
        </div>
        <div className="v21-coming-card">
          <span className="v21-coming-icon" aria-hidden="true"><Sparkles size={18} /></span>
          <p className="v21-eyebrow">Clear records</p>
          <h3>Your contribution record, between you and your host.</h3>
          <p>Guests can review their own Ledger without seeing another guest’s financial details.</p>
          <small>Contributions are recorded in Kouchd; payment happens separately between people.</small>
          <div className="newsletter-divider" aria-hidden="true" />
          <h4>Keep in the loop</h4>
          <p className="newsletter-intro">Get occasional notes when there’s something new to share.</p>
          <NewsletterSignup />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="v21-faq" id="faq" aria-labelledby="v21-faq-title">
        <div className="v21-faq-heading">
          <p className="v21-eyebrow">
            <CircleHelp size={16} aria-hidden="true" /> A few common questions
          </p>
          <h2 id="v21-faq-title">Good to know.</h2>
        </div>
        <div className="v21-faq-list">
          <details>
            <summary>What is Kouchd?</summary>
            <p>
              A shared-stay workspace for agreements, house details, contribution records, and chores.
              It gives hosts and guests one calm place to coordinate expectations and keep track of daily details.
            </p>
          </details>
          <details>
            <summary>Does Kouchd move, hold, or process money?</summary>
            <p>
              No. Kouchd is not a payment processor, bank, or escrow service. Kouchd provides the shared
              Ledger where you record agreed contributions. You can settle payments separately using whatever
              method you prefer—cash, Zelle, Venmo, or direct bank transfer—with zero transaction fees from Kouchd.
            </p>
          </details>
          <details>
            <summary>Is this an official lease or legal tenancy agreement?</summary>
            <p>
              No. Kouchd records shared household expectations, rules, and mutual understandings between
              hosts and guests. It does not replace applicable local housing rights, formal residential leases,
              or landlord-tenant laws.
            </p>
          </details>
          <details>
            <summary>Who can see the contribution records and house details?</summary>
            <p>
              Kouchd is built strictly around private household boundaries. Only invited guests and hosts in
              a specific stay can access that stay’s information. Guests only see their own contribution ledger
              and the shared house guidelines.
            </p>
          </details>
          <details>
            <summary>How does inviting a guest work?</summary>
            <p>
              The host creates the stay and shares a private invite link with the guest. Guests can open the link
              directly in their browser to view the house guide, agreements, and chores—without being forced to
              download an app.
            </p>
          </details>
          <details>
            <summary>Is Kouchd a chat app?</summary>
            <p>
              Kouchd keeps stay-related details and updates organized in one place. It is not a general-purpose
              messaging app, so you can continue using whatever messaging tools you and your guests already prefer.
            </p>
          </details>
          <details>
            <summary>Are iOS and Android apps available?</summary>
            <p>
              You can use Kouchd today as a responsive web app on any smartphone, tablet, or computer. Native
              app releases will be announced when ready.
            </p>
          </details>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="v21-cta">
        <KouchdWordmark size="md" theme="cream" />
        <h2>Make the next stay feel easier.</h2>
        <p>Bring the people, details, and shared responsibilities together.</p>
        <StartButton hasClerk={hasClerk} />
        <span className="v21-cta-sparkle" aria-hidden="true">
          <Sparkles size={50} strokeWidth={1} />
        </span>
      </section>

      {/* Structured Marketing Footer */}
      <footer className="v21-footer" aria-label="Site footer">
        <div className="v21-footer-top">
          <div className="v21-footer-brand-col">
            <Link href="/" className="v21-footer-brand" aria-label="Kouchd home">
              <KouchdWordmark size="sm" />
            </Link>
            <p className="v21-footer-tagline">
              Your space. Your people. Everyone on the same page.
            </p>
            <p className="v21-footer-subtext">
              Private shared living made easier to coordinate. Stay agreements, house details, contribution records, and chores.
            </p>
          </div>

          <nav className="v21-footer-nav-col" aria-label="Product and support">
            <strong className="v21-footer-col-title">Product</strong>
            <ul>
              <li><Link href="/about">About Kouchd</Link></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li>
                <a href={HELP_LINKS.home} target="_blank" rel="noopener noreferrer">
                  Help center
                </a>
              </li>
            </ul>
          </nav>

          <nav className="v21-footer-nav-col" aria-label="Media and company">
            <strong className="v21-footer-col-title">Company & Media</strong>
            <ul>
              <li><Link href="/brand">Brand</Link></li>
              <li><a href="mailto:support@kouchd.com">Email support</a></li>
              <li><Link href="/sms-opt-in">SMS opt-in</Link></li>
            </ul>
          </nav>

          <nav className="v21-footer-nav-col" aria-label="Trust and legal">
            <strong className="v21-footer-col-title">Trust & Legal</strong>
            <ul>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/acceptable-use">Acceptable use</Link></li>
              <li><Link href="/cookies">Cookie policy</Link></li>
            </ul>
          </nav>
        </div>

        <div className="v21-footer-bottom">
          <small className="v21-footer-legal">
            © {new Date().getFullYear()} Wrelik Brands LLC. Kouchd records shared expectations; it does not replace applicable housing rights.
          </small>
          <span className="v21-footer-version">v{appVersion}</span>
        </div>
      </footer>
    </main>
  );
}
