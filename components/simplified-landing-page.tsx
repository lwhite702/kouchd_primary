"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  Info,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { CouchSymbol, KouchdWordmark } from "@/components/brand/kouchd-logo";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { APP_ORIGIN } from "@/lib/app-domain";
import "./landing-v21.css";
import "./simplified-landing-page.css";

type PreviewTab = "calendar" | "record" | "ledger" | "chores" | "updates";

const previewTabs: { id: PreviewTab; label: string; icon: LucideIcon }[] = [
  { id: "calendar", label: "Stay dates", icon: CalendarDays },
  { id: "record", label: "Shared record", icon: LockKeyhole },
  { id: "ledger", label: "Ledger", icon: ReceiptText },
  { id: "chores", label: "Chores", icon: ClipboardCheck },
  { id: "updates", label: "Updates", icon: Megaphone },
];

const features: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: CalendarDays, title: "Shared stay calendar", body: "Keep dates visible and calm for hosts and guests alike." },
  { icon: LockKeyhole, title: "Private shared record", body: "One quiet place for expectations and notes, kept between the people in the stay." },
  { icon: ReceiptText, title: "Shared contributions", body: "Record shared costs and gifts without awkwardness or stress. A contribution is a shared record. Kouchd never moves money." },
  { icon: ClipboardCheck, title: "Chore flow", body: "Agree on tasks so everyone feels respected and capable." },
  { icon: Megaphone, title: "House announcements", body: "Share updates gently, in a warm and welcoming tone." },
  { icon: MessageCircle, title: "Check-ins", body: "Stay connected with relaxed updates that make coordination easier." },
];

/* Synthetic sample data only. */
const stayDays = Array.from({ length: 28 }, (_, i) => i + 1);
const stayStart = 9;
const stayEnd = 22;

function StartButton({ hasClerk, className = "simple-btn-lime" }: { hasClerk: boolean; className?: string }) {
  return (
    <Link className={className} href={hasClerk ? `${APP_ORIGIN}/sign-up` : "/?preview=true"}>
      Start a stay <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

function PreviewScreen({ tab }: { tab: PreviewTab }) {
  if (tab === "calendar") {
    return (
      <>
        <div className="simple-screen-header">
          <div>
            <h3 className="simple-screen-title">Jordan’s stay</h3>
            <p className="simple-screen-desc">Dates everyone can see at a glance.</p>
          </div>
          <span className="simple-screen-pill"><CalendarDays size={14} aria-hidden="true" /> 14 nights</span>
        </div>
        <div className="calendar-grid-card">
          <div className="calendar-info-panel">
            <h4>Stay details</h4>
            <div className="calendar-stay-meta">
              <div className="calendar-meta-row"><span>Arrives</span><span>Mar 9</span></div>
              <div className="calendar-meta-row"><span>Leaves</span><span>Mar 22</span></div>
              <div className="calendar-meta-row"><span>Room</span><span>Guest room</span></div>
            </div>
          </div>
          <div className="calendar-mini-grid" aria-label="Sample calendar showing a stay from March 9 to March 22">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span className="calendar-day-label" key={`${d}-${i}`} aria-hidden="true">{d}</span>
            ))}
            {stayDays.map((day) => {
              const edge = day === stayStart || day === stayEnd;
              const inRange = day > stayStart && day < stayEnd;
              return (
                <span
                  key={day}
                  aria-hidden="true"
                  className={`calendar-day-cell${edge ? " active-stay" : inRange ? " stay-range" : ""}`}
                >
                  {day}
                </span>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  if (tab === "record") {
    const items = [
      ["Quiet hours", "10 pm to 7 am on weeknights", "Agreed"],
      ["Kitchen", "Wash your own dishes the same day", "Agreed"],
      ["Visitors", "Let the host know a day ahead", "Agreed"],
    ];
    return (
      <>
        <div className="simple-screen-header">
          <div>
            <h3 className="simple-screen-title">Shared record</h3>
            <p className="simple-screen-desc">What everyone agreed to, in one place.</p>
          </div>
          <span className="simple-screen-pill"><LockKeyhole size={14} aria-hidden="true" /> Host and guest</span>
        </div>
        <div className="records-list">
          {items.map(([title, sub, status]) => (
            <div className="record-item-card" key={title}>
              <div className="record-item-info">
                <span className="record-icon-box"><Check size={18} aria-hidden="true" /></span>
                <div>
                  <p className="record-item-title">{title}</p>
                  <p className="record-item-sub">{sub}</p>
                </div>
              </div>
              <span className="record-status-pill">{status}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (tab === "ledger") {
    const rows = [
      ["Weekly contribution", "Mar 10 · Recorded by Jordan · Confirmed", "$120.00"],
      ["Groceries", "Mar 12 · Recorded by Sam · Confirmed", "$40.00"],
      ["Household supplies", "Mar 14 · Recorded by Alex · Awaiting review", "$15.00"],
    ];
    return (
      <>
        <div className="simple-screen-header">
          <div>
            <h3 className="simple-screen-title">Ledger</h3>
            <p className="simple-screen-desc">Every contribution, recorded together.</p>
          </div>
          <span className="simple-screen-pill"><ReceiptText size={14} aria-hidden="true" /> Add contribution</span>
        </div>
        <div className="ledger-preview-box">
          <div className="ledger-summary-bar">
            <span className="ledger-total-label">Confirmed this stay</span>
            <span className="ledger-total-amount">$160.00</span>
          </div>
          <div className="ledger-rows">
            {rows.map(([title, meta, amount]) => (
              <div className="ledger-row" key={title}>
                <div>
                  <div className="ledger-row-title">{title}</div>
                  <div className="ledger-row-meta">{meta}</div>
                </div>
                <span className="ledger-row-amount">{amount}</span>
              </div>
            ))}
          </div>
          <p className="ledger-disclaimer">
            <Info size={14} aria-hidden="true" /> Contributions are shared records. Kouchd does not collect, hold, transfer, or process payments.
          </p>
        </div>
      </>
    );
  }

  if (tab === "chores") {
    const chores = [
      ["Take out recycling", "Due Thursday", "Jordan", true],
      ["Wipe down the kitchen", "Due Friday", "Shared", false],
      ["Water the plants", "Due Sunday", "Alex", false],
    ] as const;
    return (
      <>
        <div className="simple-screen-header">
          <div>
            <h3 className="simple-screen-title">Chores</h3>
            <p className="simple-screen-desc">Who’s taking care of what this week.</p>
          </div>
          <span className="simple-screen-pill"><ClipboardCheck size={14} aria-hidden="true" /> 1 of 3 done</span>
        </div>
        <div className="chores-board">
          {chores.map(([title, due, who, done]) => (
            <div className="chore-card" key={title}>
              <span className={`chore-check${done ? " done" : ""}`} aria-hidden="true">
                {done && <Check size={14} />}
              </span>
              <div className="chore-info">
                <h5>{title}</h5>
                <p>{due}{done ? " · Done" : ""}</p>
                <span className="chore-assignee">{who}</span>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="simple-screen-header">
        <div>
          <h3 className="simple-screen-title">House updates</h3>
          <p className="simple-screen-desc">Gentle notes for everyone in the stay.</p>
        </div>
        <span className="simple-screen-pill"><Megaphone size={14} aria-hidden="true" /> 2 new</span>
      </div>
      <div className="announcements-stack">
        <div className="announcement-box">
          <h5><Megaphone size={16} aria-hidden="true" /> Plumber visiting Tuesday · Alex</h5>
          <p>Someone will check the upstairs sink around 10 am. The bathroom may be busy for an hour.</p>
        </div>
        <div className="checkin-row">
          <span><strong>Weekly check-in</strong> · How is everything going this week? · Jordan & Alex</span>
          <span className="record-status-pill">Shared</span>
        </div>
      </div>
    </>
  );
}

export function SimplifiedLandingPage({ hasClerk }: { hasClerk: boolean }) {
  const [tab, setTab] = useState<PreviewTab>("calendar");

  return (
    <main className="landing-v21 simple-landing" id="main-content">
      <a className="simple-skip-link" href="#simple-hero-title">Skip to content</a>

      <div className="simple-wrap">
        <header className="simple-header">
          <Link href="/" aria-label="Kouchd home" className="simple-header-brand"><KouchdWordmark size="md" /></Link>
          <div className="simple-header-actions">
            {hasClerk && <Link href={`${APP_ORIGIN}/sign-in`} className="simple-sign-in-link">Sign in</Link>}
            <StartButton hasClerk={hasClerk} />
          </div>
        </header>
      </div>

      <section className="simple-hero simple-wrap" aria-labelledby="simple-hero-title">
        <div className="simple-app-icon-wrap">
          <span className="simple-app-icon" role="img" aria-label="Kouchd app icon">
            <CouchSymbol size={44} color="#fffdf8" />
          </span>
        </div>
        <h1 id="simple-hero-title">Warm shared stays, simply managed</h1>
        <p className="simple-hero-lede">Kouchd creates calm, private records for hosts and guests.</p>
        <div className="simple-hero-actions">
          <StartButton hasClerk={hasClerk} />
          <a className="simple-btn-ghost" href="#see-it">See it in action</a>
        </div>
        <p className="simple-hero-note">Already invited? Open the link your host shared with you.</p>
      </section>

      <section className="simple-action-section" id="see-it" aria-labelledby="simple-see-title">
        <div className="simple-wrap">
          <div className="simple-section-header">
            <h2 id="simple-see-title">See it in action</h2>
            <p>A quick look at the screens hosts and guests use every day.</p>
          </div>
          <div className="simple-tabs-nav" role="tablist" aria-label="Product previews">
            {previewTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`simple-tab-${id}`}
                aria-selected={tab === id}
                aria-controls="simple-preview-panel"
                className={`simple-tab-btn${tab === id ? " active" : ""}`}
                onClick={() => setTab(id)}
              >
                <Icon size={15} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
          <div className="simple-mockup-frame">
            <div className="simple-mockup-topbar">
              <span className="simple-mockup-dots" aria-hidden="true">
                <span className="simple-mockup-dot" /><span className="simple-mockup-dot" /><span className="simple-mockup-dot" />
              </span>
              <span className="simple-mockup-title">Kouchd</span>
              <span className="simple-mockup-badge">Sample data</span>
            </div>
            <div
              className="simple-mockup-content"
              id="simple-preview-panel"
              role="tabpanel"
              aria-labelledby={`simple-tab-${tab}`}
            >
              <PreviewScreen tab={tab} />
            </div>
          </div>
        </div>
      </section>

      <section className="simple-features-section" aria-labelledby="simple-features-title">
        <div className="simple-wrap">
          <div className="simple-section-header">
            <h2 id="simple-features-title">Everything a shared stay needs</h2>
            <p>Simple tools that keep everyone on the same page.</p>
          </div>
          <div className="simple-features-grid">
            {features.map(({ icon: Icon, title, body }) => (
              <article className="simple-feature-card" key={title}>
                <span className="simple-feature-icon-wrap"><Icon size={24} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="simple-cta-section" aria-labelledby="simple-cta-title">
        <div className="simple-wrap">
          <div className="simple-cta-box">
            <h2 id="simple-cta-title">Make yourself at home, together</h2>
            <p>Set up a stay, invite your guest, and keep the details in one calm place.</p>
            <div className="simple-cta-actions">
              <StartButton hasClerk={hasClerk} />
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
