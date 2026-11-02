"use client";

import { useState } from "react";
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

export function InteractiveStayPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("calendar");

  return (
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
          <span className="v21-preview-avatar" aria-hidden="true">
            J
          </span>
        </div>

        <div className="v21-preview-inner">
          <span className="v21-preview-kicker">EXAMPLE STAY · JUNIPER HOUSE</span>

          {activeTab === "calendar" && (
            <>
              <h3>Stay schedule & dates</h3>
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
            </>
          )}

          {activeTab === "record" && (
            <>
              <h3>Private shared record</h3>
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
            </>
          )}

          {activeTab === "ledger" && (
            <>
              <h3>Contribution records</h3>
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
            </>
          )}

          {activeTab === "chores" && (
            <>
              <h3>Shared household chores</h3>
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
            </>
          )}

          {activeTab === "updates" && (
            <>
              <h3>House announcements & check-ins</h3>
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
            </>
          )}
        </div>
      </div>
      <span className="v21-preview-orbit orbit-one" aria-hidden="true" />
      <span className="v21-preview-orbit orbit-two" aria-hidden="true" />
    </div>
  );
}
