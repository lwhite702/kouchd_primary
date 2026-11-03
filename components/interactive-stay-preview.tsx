"use client";

import { useState, type KeyboardEvent } from "react";
import {
  CalendarDays,
  Check,
  House,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  ReceiptText,
  Users,
} from "lucide-react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";

type PreviewTab = "calendar" | "record" | "ledger" | "chores" | "updates";

const PREVIEW_TABS: PreviewTab[] = ["calendar", "record", "ledger", "chores", "updates"];

export function InteractiveStayPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("calendar");

  // Roving tabindex: only the selected tab is in the Tab order, so arrow keys,
  // Home, and End move between tabs (WAI-ARIA tabs pattern).
  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Leave browser and OS shortcuts such as Alt+Left alone.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const index = PREVIEW_TABS.indexOf(activeTab);
    const last = PREVIEW_TABS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    const tab = PREVIEW_TABS[next];
    setActiveTab(tab);
    document.getElementById(`v21-tab-${tab}`)?.focus();
  };

  return (
    <div
      className="v21-product-preview"
      role="region"
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
            onKeyDown={handleTabKeyDown}
          >
            <button
              type="button"
              role="tab"
              id="v21-tab-calendar"
              aria-controls="v21-panel-calendar"
              aria-selected={activeTab === "calendar"}
              tabIndex={activeTab === "calendar" ? 0 : -1}
              className={`v21-tab-btn ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              Calendar
            </button>
            <button
              type="button"
              role="tab"
              id="v21-tab-record"
              aria-controls="v21-panel-record"
              aria-selected={activeTab === "record"}
              tabIndex={activeTab === "record" ? 0 : -1}
              className={`v21-tab-btn ${activeTab === "record" ? "active" : ""}`}
              onClick={() => setActiveTab("record")}
            >
              Record
            </button>
            <button
              type="button"
              role="tab"
              id="v21-tab-ledger"
              aria-controls="v21-panel-ledger"
              aria-selected={activeTab === "ledger"}
              tabIndex={activeTab === "ledger" ? 0 : -1}
              className={`v21-tab-btn ${activeTab === "ledger" ? "active" : ""}`}
              onClick={() => setActiveTab("ledger")}
            >
              Ledger
            </button>
            <button
              type="button"
              role="tab"
              id="v21-tab-chores"
              aria-controls="v21-panel-chores"
              aria-selected={activeTab === "chores"}
              tabIndex={activeTab === "chores" ? 0 : -1}
              className={`v21-tab-btn ${activeTab === "chores" ? "active" : ""}`}
              onClick={() => setActiveTab("chores")}
            >
              Chores
            </button>
            <button
              type="button"
              role="tab"
              id="v21-tab-updates"
              aria-controls="v21-panel-updates"
              aria-selected={activeTab === "updates"}
              tabIndex={activeTab === "updates" ? 0 : -1}
              className={`v21-tab-btn ${activeTab === "updates" ? "active" : ""}`}
              onClick={() => setActiveTab("updates")}
            >
              Updates
            </button>
          </div>
          <span className="v21-preview-avatar" aria-hidden="true">
            J
          </span>
        </div>

        <div className="v21-preview-inner">
          <span className="v21-preview-kicker">EXAMPLE STAY · JUNIPER HOUSE</span>

          {activeTab === "calendar" && (
            <div
              role="tabpanel"
              id="v21-panel-calendar"
              aria-labelledby="v21-tab-calendar"
              tabIndex={0}
            >
              <strong className="v21-preview-title">Stay schedule & dates</strong>
              <div className="v21-preview-summary">
                <span>
                  <strong>14</strong> nights
                </span>
                <span>
                  <strong>Oct 10 – 24</strong> scheduled
                </span>
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
            </div>
          )}

          {activeTab === "record" && (
            <div
              role="tabpanel"
              id="v21-panel-record"
              aria-labelledby="v21-tab-record"
              tabIndex={0}
            >
              <strong className="v21-preview-title">Private shared record</strong>
              <div className="v21-preview-summary">
                <span>
                  <strong>3</strong> agreed terms
                </span>
                <span>
                  <strong>Private</strong> to stay
                </span>
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
            </div>
          )}

          {activeTab === "ledger" && (
            <div
              role="tabpanel"
              id="v21-panel-ledger"
              aria-labelledby="v21-tab-ledger"
              tabIndex={0}
            >
              <strong className="v21-preview-title">Contribution records</strong>
              <div className="v21-preview-summary">
                <span>
                  <strong>$160.00</strong> confirmed
                </span>
                <span>
                  <strong>Status</strong> Up to date
                </span>
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
            </div>
          )}

          {activeTab === "chores" && (
            <div
              role="tabpanel"
              id="v21-panel-chores"
              aria-labelledby="v21-tab-chores"
              tabIndex={0}
            >
              <strong className="v21-preview-title">Shared household chores</strong>
              <div className="v21-preview-summary">
                <span>
                  <strong>2</strong> open
                </span>
                <span>
                  <strong>1</strong> completed
                </span>
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
            </div>
          )}

          {activeTab === "updates" && (
            <div
              role="tabpanel"
              id="v21-panel-updates"
              aria-labelledby="v21-tab-updates"
              tabIndex={0}
            >
              <strong className="v21-preview-title">House announcements & check-ins</strong>
              <div className="v21-preview-summary">
                <span>
                  <strong>1</strong> update
                </span>
                <span>
                  <strong>1</strong> check-in
                </span>
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
            </div>
          )}
        </div>
      </div>
      <span className="v21-preview-orbit orbit-one" aria-hidden="true" />
      <span className="v21-preview-orbit orbit-two" aria-hidden="true" />
    </div>
  );
}
