"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  House,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  ReceiptText,
  Sparkles,
  Users,
} from "lucide-react";
import { CouchSymbol, KouchdWordmark } from "@/components/brand/kouchd-logo";
import {
  MarketingHeader,
  MarketingStartButton as StartButton,
} from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import "./landing-v21.css";
import "./simplified-landing-page.css";

interface SimplifiedLandingPageProps {
  hasClerk?: boolean;
}

type PreviewTab = "calendar" | "record" | "ledger" | "chores" | "updates";

export function SimplifiedLandingPage({
  hasClerk = true,
}: SimplifiedLandingPageProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("calendar");

  return (
    <main className="landing-v21" id="main-content">
      <a className="marketing-skip-link" href="#v21-hero-title">
        Skip to content
      </a>
      <MarketingHeader hasClerk={hasClerk} />

      {/* Hero Section */}
      <section className="v21-hero" aria-labelledby="v21-hero-title">
        <div className="v21-hero-copy">
          <div className="v21-hero-app-icon" role="img" aria-label="Kouchd app icon">
            <CouchSymbol size={32} color="#fffdf8" />
          </div>
          <p className="v21-eyebrow">
            <span aria-hidden="true" /> A calmer way to share a home
          </p>
          <h1 id="v21-hero-title">Warm shared stays, simply managed</h1>
          <p className="v21-lede">
            Kouchd creates calm, private records for hosts and guests.
          </p>
          <div className="v21-rating-badge" aria-label="Rated 5 out of 5 stars based on 100 reviews">
            <span className="v21-rating-stars" aria-hidden="true">★★★★★</span>
            <span className="v21-rating-count">(100 reviews)</span>
          </div>
          <div className="v21-hero-actions">
            <StartButton hasClerk={hasClerk} />
            <a className="v21-text-link" href="#see-it-in-action">
              See it in action <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="v21-invite-note">
            Already invited? Open the link your host shared with you.
          </p>
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

      {/* See It in Action Section */}
      <section className="v21-product" id="see-it-in-action" aria-labelledby="v21-product-title">
        <div
          className="v21-product-preview"
          aria-label="Interactive example Kouchd stay dashboard preview"
        >
          <div className="v21-preview-window">
            <div className="v21-preview-top">
              <span className="v21-preview-mark">
                <KouchdWordmark size="sm" />
              </span>
              <div
                className="v21-preview-tab-controls"
                role="tablist"
                aria-label="Stay preview views"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "calendar"}
                  className={`v21-tab-btn ${activeTab === "calendar" ? "active" : ""}`}
                  onClick={() => setActiveTab("calendar")}
                >
                  Calendar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "record"}
                  className={`v21-tab-btn ${activeTab === "record" ? "active" : ""}`}
                  onClick={() => setActiveTab("record")}
                >
                  Record
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
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "updates"}
                  className={`v21-tab-btn ${activeTab === "updates" ? "active" : ""}`}
                  onClick={() => setActiveTab("updates")}
                >
                  Updates
                </button>
              </div>
              <span className="v21-preview-avatar" aria-hidden="true">J</span>
            </div>

            <div className="v21-preview-inner">
              <span className="v21-preview-kicker">EXAMPLE STAY · JUNIPER HOUSE</span>

              {activeTab === "calendar" && (
                <>
                  <h3>Stay schedule & dates</h3>
                  <div className="v21-preview-summary">
                    <span><strong>14</strong> nights</span>
                    <span><strong>Oct 10 – 24</strong> scheduled</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house">
                      <CalendarDays size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Check-in</strong>
                      <small>Friday, Oct 10 · 3:00 pm</small>
                    </span>
                    <em className="tag-ready">Upcoming</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house">
                      <House size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Guest bedroom</strong>
                      <small>Private room with shared bath</small>
                    </span>
                    <em className="tag-ready">Ready</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house">
                      <CalendarDays size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Check-out</strong>
                      <small>Friday, Oct 24 · 11:00 am</small>
                    </span>
                    <em className="tag-recorded">Scheduled</em>
                  </div>
                </>
              )}

              {activeTab === "record" && (
                <>
                  <h3>Private shared record</h3>
                  <div className="v21-preview-summary">
                    <span><strong>3</strong> agreed terms</span>
                    <span><strong>Private</strong> to stay</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house">
                      <LockKeyhole size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Quiet hours</strong>
                      <small>10 pm to 7 am on weeknights</small>
                    </span>
                    <em className="tag-ready">Agreed</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house">
                      <Check size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Kitchen clean-up</strong>
                      <small>Wash dishes the same day</small>
                    </span>
                    <em className="tag-ready">Agreed</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house">
                      <Users size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>House visitors</strong>
                      <small>Give host 24 hours notice</small>
                    </span>
                    <em className="tag-ready">Agreed</em>
                  </div>
                </>
              )}

              {activeTab === "ledger" && (
                <>
                  <h3>Contribution records</h3>
                  <div className="v21-preview-summary">
                    <span><strong>$160.00</strong> confirmed</span>
                    <span><strong>Status</strong> Up to date</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-ledger">
                      <ReceiptText size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Weekly contribution</strong>
                      <small>Recorded by Jordan · Oct 10</small>
                    </span>
                    <em className="tag-recorded">$120.00</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-ledger">
                      <ReceiptText size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Shared groceries</strong>
                      <small>Recorded by Sam · Oct 12</small>
                    </span>
                    <em className="tag-recorded">$40.00</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-ledger">
                      <ReceiptText size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Household supplies</strong>
                      <small>Recorded by Alex · Oct 14</small>
                    </span>
                    <em className="tag-due">Pending</em>
                  </div>
                </>
              )}

              {activeTab === "chores" && (
                <>
                  <h3>Shared household chores</h3>
                  <div className="v21-preview-summary">
                    <span><strong>2</strong> open</span>
                    <span><strong>1</strong> completed</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-chore">
                      <Check size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Take out recycling</strong>
                      <small>Jordan · Due Thursday</small>
                    </span>
                    <em className="tag-due">Tomorrow</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-chore">
                      <Check size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Wipe down the kitchen</strong>
                      <small>Shared · Due Friday</small>
                    </span>
                    <em className="tag-due">Friday</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-chore">
                      <Check size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Water the plants</strong>
                      <small>Alex · Done today</small>
                    </span>
                    <em className="tag-ready">Done</em>
                  </div>
                </>
              )}

              {activeTab === "updates" && (
                <>
                  <h3>House announcements & check-ins</h3>
                  <div className="v21-preview-summary">
                    <span><strong>1</strong> update</span>
                    <span><strong>1</strong> check-in</span>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-house">
                      <Megaphone size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Plumber visiting Tuesday</strong>
                      <small>Alex · Side entrance in use</small>
                    </span>
                    <em className="tag-ready">Notice</em>
                  </div>
                  <div className="v21-preview-row">
                    <span className="v21-row-icon row-chore">
                      <MessageCircle size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Weekly check-in</strong>
                      <small>Jordan & Alex · Scheduled Friday</small>
                    </span>
                    <em className="tag-recorded">Active</em>
                  </div>
                </>
              )}
            </div>
          </div>
          <span className="v21-preview-orbit orbit-one" aria-hidden="true" />
          <span className="v21-preview-orbit orbit-two" aria-hidden="true" />
        </div>

        <div className="v21-product-copy">
          <p className="v21-eyebrow">
            <span aria-hidden="true" /> A quick look inside
          </p>
          <h2 id="v21-product-title">See it in action</h2>
          <p>
            Beautiful screenshots showcasing your app&apos;s best features.
          </p>
          <a className="v21-text-link" href="#features">
            Explore features <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Powerful Features Section */}
      <section className="v21-how" id="features" aria-labelledby="powerful-features-title">
        <div className="v21-section-heading">
          <p className="v21-eyebrow">
            <span aria-hidden="true" /> Everything in one place
          </p>
          <h2 id="powerful-features-title">Powerful features</h2>
          <p className="v21-lede" style={{ margin: "14px 0 0" }}>
            Everything you need to get things done.
          </p>
        </div>

        <div className="v21-steps">
          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <h3>Shared stay calendar</h3>
            <p>Keep dates visible and calm for hosts and guests alike.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <LockKeyhole size={18} />
            </span>
            <h3>Private shared record</h3>
            <p>One quiet space for expectations and notes, fully private.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <ReceiptText size={18} />
            </span>
            <h3>Shared contributions</h3>
            <p>Track shared costs and gifts without awkwardness or stress.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <ClipboardList size={18} />
            </span>
            <h3>Chore flow</h3>
            <p>Agree on tasks so everyone feels respected and capable.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <Megaphone size={18} />
            </span>
            <h3>House announcements</h3>
            <p>Share updates gently in a warm, welcoming tone.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <MessageCircle size={18} />
            </span>
            <h3>Check-ins</h3>
            <p>Stay connected with relaxed updates that ease coordination.</p>
          </article>
        </div>

        <p className="v21-feature-disclaimer">
          Contributions are shared records. Kouchd does not collect, hold, transfer, or process payments.
        </p>
      </section>

      {/* Bottom CTA Section */}
      <section className="v21-cta" aria-labelledby="v21-cta-title">
        <Sparkles size={52} className="v21-cta-sparkle" aria-hidden="true" />
        <KouchdWordmark size="md" theme="cream" />
        <h2 id="v21-cta-title">Start your next stay on the same page.</h2>
        <p>Set up a stay, share the details, and keep records and chores together.</p>
        <StartButton hasClerk={hasClerk} />
      </section>

      <MarketingFooter hasClerk={hasClerk} />
    </main>
  );
}
