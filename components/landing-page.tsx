"use client";

import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, CircleHelp, ClipboardList, HeartHandshake, House, LockKeyhole, MessageCircle, Sparkles, Users } from "lucide-react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { Tooltip } from "@/components/ui/tooltip";
import { HELP_LINKS } from "@/lib/help-links";
import "./landing-v21.css";

interface LandingPageProps { hasClerk?: boolean }

function StartButton({ hasClerk, secondary = false }: { hasClerk: boolean; secondary?: boolean }) {
  const className = secondary ? "v21-button v21-button-outline" : "v21-button v21-button-lime";
  return hasClerk ? (
    <SignUpButton mode="modal"><button className={className} type="button">Start a stay <ArrowRight size={17} /></button></SignUpButton>
  ) : (
    <Link className={className} href="/?preview=true">Start a stay <ArrowRight size={17} /></Link>
  );
}

export function LandingPage({ hasClerk = true }: LandingPageProps) {
  return (
    <main className="landing-v21">
      <header className="v21-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" aria-label="Kouchd home" className="v21-brand">
            <KouchdWordmark size="md" />
          </Link>
          <Tooltip content="Collaborative stay agreements & bilateral household ledger" position="bottom">
            <span className="v21-header-badge">
              <Sparkles size={13} />
              <span>By Wrelik</span>
            </span>
          </Tooltip>
        </div>
        <nav className="v21-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">FAQ</a>
          <Tooltip content="Explore stay guides, ledger setup & house rules" position="bottom">
            <a href={HELP_LINKS.home} target="_blank" rel="noopener noreferrer" className="v21-nav-help">
              <BookOpen size={15} />
              <span>Guides</span>
              <ArrowUpRight size={13} style={{ opacity: 0.7 }} />
            </a>
          </Tooltip>
        </nav>
        <div className="v21-header-actions">
          {hasClerk && (
            <Tooltip content="Access your stays, ledger, or agreements" position="bottom">
              <SignInButton mode="modal">
                <button type="button" className="v21-sign-in">Sign in</button>
              </SignInButton>
            </Tooltip>
          )}
          <Tooltip content="Create a stay or join an existing household" position="bottom">
            <div style={{ display: "inline-flex" }}>
              <StartButton hasClerk={hasClerk} />
            </div>
          </Tooltip>
        </div>
      </header>

      <section className="v21-hero" aria-labelledby="v21-hero-title">
        <div className="v21-hero-copy">
          <p className="v21-eyebrow"><span /> A calmer way to share a home</p>
          <h1 id="v21-hero-title">Make room for<br className="v21-desktop-break" /> a better stay.</h1>
          <p className="v21-lede">Kouchd brings house details and updates, a contribution ledger, shared chores, and check-ins into one private space for hosts and guests.</p>
          <div className="v21-hero-actions"><StartButton hasClerk={hasClerk} /><a className="v21-text-link" href="#features">Explore the tools <ArrowDown size={16} /></a></div>
          <p className="v21-invite-note">Already invited? Open the link your host shared with you.</p>
        </div>
        <div className="v21-hero-art" aria-label="Illustration of a welcoming shared living room">
          <Image src="/landing-v21/room.svg" alt="A sunlit living room with a green sofa and a small table" fill priority sizes="(max-width: 760px) 100vw, 54vw" className="v21-room-desktop" />
          <Image src="/landing-v21/room-mobile.svg" alt="A warm, welcoming shared living room" fill priority sizes="100vw" className="v21-room-mobile" />
          <div className="v21-art-note"><span className="v21-note-icon"><House size={16} /></span><span><strong>One shared stay space</strong><small>Details, records, and to-dos together</small></span></div>
        </div>
      </section>

      <section className="v21-proof" aria-labelledby="v21-proof-title">
        <div className="v21-proof-heading"><p className="v21-eyebrow v21-eyebrow-light">A clearer picture for everyone</p><h2 id="v21-proof-title">Your shared stay,<br className="v21-desktop-break" /> all in one place.</h2><p>See who is coming, what everyone agreed to, and what needs attention next.</p></div>
        <div className="v21-proof-grid">
          <article className="v21-proof-card"><span className="v21-proof-icon"><Users size={19} /></span><span className="v21-proof-label">Guests</span><strong>5</strong><small>3 confirmed · 2 pending</small></article>
          <article className="v21-proof-card"><span className="v21-proof-icon"><ClipboardList size={19} /></span><span className="v21-proof-label">Contributions</span><strong className="v21-proof-word">Recorded</strong><small>Recorded outside Kouchd</small></article>
          <article className="v21-proof-card"><span className="v21-proof-icon"><Check size={19} /></span><span className="v21-proof-label">Chores</span><strong>3</strong><small>1 needs an owner</small></article>
          <article className="v21-proof-card"><span className="v21-proof-icon"><Sparkles size={19} /></span><span className="v21-proof-label">Check-ins</span><strong className="v21-proof-word">Friday</strong><small>Arrival window confirmed</small></article>
        </div>
        <p className="v21-preview-disclaimer">Illustrative preview · Example details, not live household data</p>
      </section>

      <section className="v21-product" aria-labelledby="v21-product-title">
        <div className="v21-product-preview" aria-label="Example Kouchd stay dashboard preview">
          <div className="v21-preview-window">
            <div className="v21-preview-top"><span className="v21-preview-mark"><KouchdWordmark size="sm" /></span><span className="v21-preview-avatar">J</span></div>
            <div className="v21-preview-inner"><span className="v21-preview-kicker">EXAMPLE STAY</span><h3>Everything that needs attention</h3>
              <div className="v21-preview-summary"><span><strong>3</strong> confirmed</span><span><strong>2</strong> due</span></div>
              <div className="v21-preview-row"><span className="v21-row-icon row-house"><House size={17} /></span><span><strong>House guide</strong><small>Parking, Wi-Fi, quiet hours</small></span><em className="tag-ready">Ready</em></div>
              <div className="v21-preview-row"><span className="v21-row-icon row-ledger"><ClipboardList size={17} /></span><span><strong>Contribution</strong><small>Your share · recorded elsewhere</small></span><em className="tag-recorded">Recorded</em></div>
              <div className="v21-preview-row"><span className="v21-row-icon row-chore"><Check size={17} /></span><span><strong>Groceries</strong><small>Assigned to guest</small></span><em className="tag-due">Due today</em></div>
            </div>
          </div>
          <span className="v21-preview-orbit orbit-one" /><span className="v21-preview-orbit orbit-two" />
        </div>
        <div className="v21-product-copy"><p className="v21-eyebrow">A look inside Kouchd</p><h2 id="v21-product-title">Your shared stay,<br /> clearly organized.</h2><p>House details and updates, contribution records, chores, and check-ins—all in one view.</p><a className="v21-text-link" href="#features">Explore the tools <ArrowRight size={16} /></a></div>
      </section>

      <section className="v21-feature-tour" id="features" aria-labelledby="v21-feature-title">
        <div className="v21-feature-intro">
          <p className="v21-eyebrow">A shared place to come back to</p>
          <h2 id="v21-feature-title">The details, the ledger, and the to-dos.</h2>
          <p>Kouchd brings the practical parts of sharing a stay together—so everyone can find the right information and know what is next.</p>
        </div>

        <article className="v21-feature-row" aria-labelledby="v21-feature-guide-title">
          <div className="v21-feature-copy">
            <span className="v21-feature-index">01 <span>Stay information</span></span>
            <h3 id="v21-feature-guide-title">Keep the house guide and updates close at hand.</h3>
            <p>Share the details people need before and during a stay, then post updates in the same place guests already use to check their plans.</p>
            <ul><li><Check size={16} /> House details guests can look up again</li><li><Check size={16} /> Stay updates alongside the shared context</li><li><Check size={16} /> Guest list and arrival check-ins in view</li></ul>
          </div>
          <div className="v21-feature-scene scene-guide" aria-hidden="true">
            <div className="v21-scene-window">
              <div className="v21-scene-top"><span><i className="scene-dot" /> JUNIPER HOUSE</span><span className="scene-date">OCT 10—13</span></div>
              <div className="scene-tabs"><span className="selected">Overview</span><span>House guide</span><span>Updates</span></div>
              <div className="scene-welcome"><span className="scene-house-icon"><House size={17} /></span><div><strong>Welcome to the house</strong><small>The useful details, all together</small></div></div>
              <div className="scene-info-grid"><div><span>WI-FI</span><strong>JuniperGuest</strong><small>Ask Maya for the password</small></div><div><span>QUIET HOURS</span><strong>10 pm – 8 am</strong><small>Thanks for keeping it cozy</small></div></div>
              <div className="scene-update"><span className="scene-avatar">M</span><div><strong>Update from Maya <small>Today</small></strong><p>Use the side entrance after 8. The porch light is on.</p></div></div>
            </div>
            <span className="scene-caption">Example stay · illustrative content</span>
          </div>
        </article>

        <article className="v21-feature-row v21-feature-row-reverse" aria-labelledby="v21-feature-ledger-title">
          <div className="v21-feature-copy">
            <span className="v21-feature-index">02 <span>Contribution ledger</span></span>
            <h3 id="v21-feature-ledger-title">Keep a clear record of shared costs.</h3>
            <p>Give each contribution a place in the stay record, with who added it, what it was for, and its current status easy to review.</p>
            <ul><li><Check size={16} /> Entries stay connected to the household</li><li><Check size={16} /> Notes give each record useful context</li><li><Check size={16} /> A shared record helps everyone stay oriented</li></ul>
            <p className="v21-feature-note">Kouchd records contributions; payment is arranged separately between people.</p>
          </div>
          <div className="v21-feature-scene scene-ledger" aria-hidden="true">
            <div className="v21-scene-window">
              <div className="scene-ledger-head"><div><span className="scene-section-label">JUNIPER HOUSE · LEDGER</span><strong>Contribution records</strong></div><span className="scene-filter">This stay <ArrowDown size={12} /></span></div>
              <div className="scene-ledger-summary"><span>RECENT ACTIVITY</span><strong>Shared costs, clearly noted</strong><small>Illustrative entries · recorded only</small></div>
              <div className="scene-ledger-row"><span className="scene-ledger-icon"><House size={16} /></span><div><strong>Utilities</strong><small>Added by Maya · Oct 8</small></div><div className="scene-amount"><strong>$84.00</strong><small>Recorded</small></div></div>
              <div className="scene-ledger-row"><span className="scene-ledger-icon grocery-icon"><Check size={16} /></span><div><strong>Shared groceries</strong><small>Added by Jordan · Oct 7</small></div><div className="scene-amount"><strong>$36.50</strong><small>Recorded</small></div></div>
              <div className="scene-ledger-foot"><ClipboardList size={15} /><span>Entries are a shared record—not a payment transfer.</span></div>
            </div>
            <span className="scene-caption">Example stay · illustrative content</span>
          </div>
        </article>

        <article className="v21-feature-row" aria-labelledby="v21-feature-tasks-title">
          <div className="v21-feature-copy">
            <span className="v21-feature-index">03 <span>Chores and check-ins</span></span>
            <h3 id="v21-feature-tasks-title">Make shared responsibilities easier to follow.</h3>
            <p>Put a name and a due date beside a task, then keep simple stay check-ins where the group can find them.</p>
            <ul><li><Check size={16} /> See what needs doing and who owns it</li><li><Check size={16} /> Keep due dates from getting buried in a chat</li><li><Check size={16} /> Share arrival and stay check-ins in context</li></ul>
          </div>
          <div className="v21-feature-scene scene-tasks" aria-hidden="true">
            <div className="v21-scene-window">
              <div className="scene-tasks-heading"><div><span className="scene-section-label">JUNIPER HOUSE · TOGETHER</span><strong>Things to take care of</strong></div><span className="scene-task-count">2 open</span></div>
              <div className="scene-task-row"><span className="scene-check"></span><div><strong>Take the bins to the curb</strong><small>Alex · Due Thursday</small></div><span className="scene-due">Tomorrow</span></div>
              <div className="scene-task-row"><span className="scene-check done"><Check size={12} /></span><div><strong>Restock the coffee shelf</strong><small>Jordan · Done today</small></div><span className="scene-done">Done</span></div>
              <div className="scene-checkin"><span className="scene-checkin-icon"><Users size={16} /></span><div><span className="scene-section-label">NEXT CHECK-IN</span><strong>Arrival plans</strong><small>Friday · Add your arrival window</small></div><ArrowRight size={16} /></div>
            </div>
            <span className="scene-caption">Example stay · illustrative content</span>
          </div>
        </article>
      </section>

      <section className="v21-how" id="how-it-works" aria-labelledby="v21-how-title">
        <div className="v21-section-heading"><p className="v21-eyebrow">Simple from the start</p><h2 id="v21-how-title">Stay details, updates, and to-dos—together.</h2></div>
        <div className="v21-steps">
          <article><span className="v21-step-number">01</span><h3>Set up the stay</h3><p>Add people, dates, and the house details everyone should know.</p></article>
          <article><span className="v21-step-number">02</span><h3>Get on the same page</h3><p>Share expectations and keep updates in one place everyone can return to.</p></article>
          <article><span className="v21-step-number">03</span><h3>Keep things moving</h3><p>Track contributions, chores, and check-ins without another spreadsheet.</p></article>
        </div>
      </section>

      <section className="v21-people" aria-label="For hosts and guests">
        <article className="v21-people-card"><span className="v21-people-symbol"><House size={20} /></span><div><p className="v21-eyebrow">For hosts</p><h2>Share the details once.</h2><p>Keep house information, agreements, and the stay’s moving pieces together for everyone.</p></div><span className="v21-people-art host-art"><House size={76} strokeWidth={1.1} /></span></article>
        <article className="v21-people-card guest-card"><span className="v21-people-symbol"><HeartHandshake size={20} /></span><div><p className="v21-eyebrow">For guests</p><h2>Know what to expect.</h2><p>Find the house guide, your responsibilities, and your contribution record in one private view.</p></div><span className="v21-people-art guest-art"><Sparkles size={74} strokeWidth={1.1} /></span></article>
      </section>

      <section className="v21-privacy" id="privacy" aria-labelledby="v21-privacy-title">
        <div className="v21-privacy-copy"><p className="v21-eyebrow">Private by design</p><h2 id="v21-privacy-title">A shared space for the people in the stay.</h2><p>Kouchd is built around private households. Hosts and guests see the information relevant to their stay, with contributions recorded clearly for everyone involved.</p><div className="v21-privacy-points"><span><LockKeyhole size={17} /> Private household access</span><span><MessageCircle size={17} /> Updates and house details</span></div></div>
        <div className="v21-coming-card"><span className="v21-coming-icon"><Sparkles size={18} /></span><p className="v21-eyebrow">On the horizon</p><h3>More ways to make shared living easier.</h3><ul><li>More household tools <span>Coming soon</span></li><li>In-app payments <span>Coming soon</span></li><li>Native iOS &amp; Android apps <span>Coming soon</span></li></ul><small>Contributions are currently recorded in Kouchd; payment happens separately between people.</small></div>
      </section>

      <section className="v21-faq" id="faq" aria-labelledby="v21-faq-title">
        <div className="v21-faq-heading"><p className="v21-eyebrow"><CircleHelp size={16} /> A few common questions</p><h2 id="v21-faq-title">Good to know.</h2></div>
        <div className="v21-faq-list">
          <details><summary>What is Kouchd?</summary><p>A private shared-stay workspace for house details and updates, contribution records, chores, and check-ins.</p></details>
          <details><summary>Does Kouchd move money?</summary><p>No. Kouchd helps people record contributions. Any payment is arranged and completed separately between the people involved.</p></details>
          <details><summary>Is Kouchd a chat app?</summary><p>Kouchd keeps stay-related details and updates organized. It is not a general-purpose messaging app, so you can keep using the messaging tools you already prefer.</p></details>
          <details><summary>Are iOS and Android apps available?</summary><p>Native apps are planned for the future. For now, Kouchd is available on the web.</p></details>
        </div>
      </section>

      <section className="v21-cta"><KouchdWordmark size="md" theme="cream" /><h2>Make the next stay feel easier.</h2><p>Bring the people, details, and shared responsibilities together.</p><StartButton hasClerk={hasClerk} /><span className="v21-cta-sparkle"><Sparkles size={50} strokeWidth={1} /></span></section>

      <footer className="v21-footer"><Link href="/" className="v21-footer-brand"><KouchdWordmark size="sm" /></Link><p>Shared living, with a little more clarity.</p><div><a href="https://help.kouchd.com" target="_blank" rel="noreferrer">Help center</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/sms-opt-in">SMS opt-in</Link><a href="#faq">FAQ</a></div><small>© {new Date().getFullYear()} Wrelik Brands LLC · Kouchd records shared expectations; it does not replace applicable housing rights.</small></footer>
    </main>
  );
}
