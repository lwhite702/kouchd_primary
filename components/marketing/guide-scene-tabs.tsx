"use client";

import { useState } from "react";
import { House } from "lucide-react";

export function GuideSceneTabs() {
  const [guideSceneTab, setGuideSceneTab] = useState<"overview" | "guide" | "updates">("overview");

  return (
    <div className="v21-feature-scene scene-guide" aria-label="Interactive house guide scene">
      <div className="v21-scene-window">
        <div className="v21-scene-top">
          <span>
            <i className="scene-dot" aria-hidden="true" /> JUNIPER HOUSE
          </span>
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
              <span className="scene-house-icon" aria-hidden="true">
                <House size={17} />
              </span>
              <div>
                <strong>Welcome to the house</strong>
                <small>The useful details, all together</small>
              </div>
            </div>
            <div className="scene-info-grid">
              <div>
                <span>WI-FI</span>
                <strong>JuniperGuest</strong>
                <small>Ask Maya for password</small>
              </div>
              <div>
                <span>QUIET HOURS</span>
                <strong>10 pm – 8 am</strong>
                <small>Thanks for keeping it cozy</small>
              </div>
            </div>
          </>
        )}

        {guideSceneTab === "guide" && (
          <div className="scene-info-grid">
            <div>
              <span>PARKING</span>
              <strong>Driveway right side</strong>
              <small>Leave space for garbage truck</small>
            </div>
            <div>
              <span>KITCHEN</span>
              <strong>Shared shelves 1 & 2</strong>
              <small>Label your container</small>
            </div>
          </div>
        )}

        {guideSceneTab === "updates" && (
          <div className="scene-update">
            <span className="scene-avatar" aria-hidden="true">
              M
            </span>
            <div>
              <strong>
                Update from Maya <small>Today</small>
              </strong>
              <p>Use the side entrance after 8. The porch light is on.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
