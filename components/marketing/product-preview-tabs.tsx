"use client";

import { useState } from "react";
import { House, ClipboardList, Check, Users } from "lucide-react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";

type PreviewTab = "overview" | "guide" | "ledger" | "chores";

export function ProductPreviewTabs() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("overview");

  return (
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
          <span className="v21-preview-avatar" aria-hidden="true">
            J
          </span>
        </div>

        <div className="v21-preview-inner">
          <span className="v21-preview-kicker">EXAMPLE STAY · JUNIPER HOUSE</span>

          {activeTab === "overview" && (
            <>
              <h3>Everything that needs attention</h3>
              <div className="v21-preview-summary">
                <span>
                  <strong>3</strong> confirmed
                </span>
                <span>
                  <strong>2</strong> due
                </span>
              </div>
              <div className="v21-preview-row">
                <span className="v21-row-icon row-house">
                  <House size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>House guide</strong>
                  <small>Parking, Wi-Fi, quiet hours</small>
                </span>
                <em className="tag-ready">Ready</em>
              </div>
              <div className="v21-preview-row">
                <span className="v21-row-icon row-ledger">
                  <ClipboardList size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>Contribution</strong>
                  <small>Your share · recorded in Kouchd</small>
                </span>
                <em className="tag-recorded">Recorded</em>
              </div>
              <div className="v21-preview-row">
                <span className="v21-row-icon row-chore">
                  <Check size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>Groceries</strong>
                  <small>Assigned to guest</small>
                </span>
                <em className="tag-due">Due today</em>
              </div>
            </>
          )}

          {activeTab === "guide" && (
            <>
              <h3>House information & rules</h3>
              <div className="v21-preview-summary">
                <span>
                  <strong>Wi-Fi</strong> JuniperGuest
                </span>
                <span>
                  <strong>Quiet</strong> 10 pm – 8 am
                </span>
              </div>
              <div className="v21-preview-row">
                <span className="v21-row-icon row-house">
                  <House size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>Entry instructions</strong>
                  <small>Keypad code shared in private stay details</small>
                </span>
                <em className="tag-ready">Active</em>
              </div>
              <div className="v21-preview-row">
                <span className="v21-row-icon row-house">
                  <Users size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>Trash & Recycling</strong>
                  <small>Bins go to curb on Wednesday night</small>
                </span>
                <em className="tag-ready">Weekly</em>
              </div>
            </>
          )}

          {activeTab === "ledger" && (
            <>
              <h3>Contribution records</h3>
              <div className="v21-preview-summary">
                <span>
                  <strong>Oct total</strong> $120.50
                </span>
                <span>
                  <strong>Status</strong> Up to date
                </span>
              </div>
              <div className="v21-preview-row">
                <span className="v21-row-icon row-ledger">
                  <ClipboardList size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>Shared utilities</strong>
                  <small>Oct 8 · Recorded contribution</small>
                </span>
                <em className="tag-recorded">$84.00</em>
              </div>
              <div className="v21-preview-row">
                <span className="v21-row-icon row-ledger">
                  <Check size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>Shared pantry & milk</strong>
                  <small>Oct 7 · Recorded contribution</small>
                </span>
                <em className="tag-recorded">$36.50</em>
              </div>
            </>
          )}

          {activeTab === "chores" && (
            <>
              <h3>Shared household responsibilities</h3>
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
                  <strong>Take bins to the curb</strong>
                  <small>Alex · Due Thursday</small>
                </span>
                <em className="tag-due">Tomorrow</em>
              </div>
              <div className="v21-preview-row">
                <span className="v21-row-icon row-chore">
                  <Check size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>Restock coffee shelf</strong>
                  <small>Jordan · Done today</small>
                </span>
                <em className="tag-ready">Done</em>
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
