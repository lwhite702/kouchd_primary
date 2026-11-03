import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PlusPlanCards, planFeatureLines } from "../components/billing/plus-plans";
import { PlanLimitModal } from "../components/billing/plan-limit-modal";
import { InviteHero, InvitePrivacyPanel, inviteTitle } from "../components/invite-guest-panels";
import { PLAN_LIMITS, PLUS_DISPLAY_PRICES } from "../lib/domain/subscriptionPlans";

const decode = (markup: string) => markup.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

describe("Plus plan cards", () => {
  const markup = decode(renderToStaticMarkup(React.createElement(PlusPlanCards, { onStartPlus: () => undefined })));

  it("reads stay and guest limits from the plan facts", () => {
    expect(PLAN_LIMITS.hostPlus).toEqual({ maxActiveStays: 3, maxActiveGuests: 5 });
    expect(markup).toContain("Up to 3 active stays");
    expect(markup).toContain("Up to 5 guests across your stays");
    expect(markup).toContain("1 active stay");
    expect(markup).toContain("1 guest across your stays");
  });

  it("shows Plus prices from the shared display constant", () => {
    expect(markup).toContain(PLUS_DISPLAY_PRICES.monthly);
    expect(markup).toContain(PLUS_DISPLAY_PRICES.yearly);
    expect(markup).toContain("$6.99");
    expect(markup).toContain("$69.99");
  });

  it("uses the lime main action, the guest note, and the money fine print", () => {
    expect(markup).toContain("Start with Plus");
    expect(markup).toContain("kouchd-main-action");
    expect(markup).toContain("Invited to a stay? Guests always join free.");
    expect(markup).toContain(
      "Plus is a subscription for host tools. Kouchd never collects, holds, or transfers money between hosts and guests.",
    );
  });

  it("makes no unlimited, trial, subleasing, bill-splitting, or Android claims", () => {
    const lower = markup.toLowerCase();
    for (const banned of ["unlimited", "trial", "sublet", "sublease", "split", "android"]) {
      expect(lower).not.toContain(banned);
    }
  });

  it("lists only capacity the backend enforces for Plus", () => {
    expect(planFeatureLines("hostPlus")).toEqual([
      "Up to 3 active stays",
      "Up to 5 guests across your stays",
      "Everything in Free",
    ]);
  });
});

describe("Plan limit modal", () => {
  it("uses the main action for the upgrade", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PlanLimitModal, {
        isOpen: true,
        onClose: () => undefined,
        limit: { dimension: "guest", plan: "free", limit: 1, atHighestPlan: false, message: "Guest spots are full." },
        onUpgrade: () => undefined,
      }),
    );
    expect(markup).toContain("Upgrade to Plus");
    expect(markup).toContain("kouchd-main-action");
    expect(markup.toLowerCase()).not.toContain("unlimited");
  });
});

describe("Guest invite screen", () => {
  it("uses real host and stay names only", () => {
    expect(inviteTitle("Lee", "Maple Street")).toBe("Lee made room for you at Maple Street.");
    expect(inviteTitle("Lee", "Shared stay")).toBe("Lee made room for you.");
    expect(inviteTitle("A Kouchd host", "Shared stay")).toBe("Someone made room for you.");
    expect(inviteTitle(undefined, undefined)).toBe("Someone made room for you.");
  });

  it("renders the hero with free joining and no payment details", () => {
    const markup = decode(renderToStaticMarkup(
      React.createElement(InviteHero, { hostName: "Lee", stayName: "Maple Street", referralCode: "ABC123" }),
    ));
    expect(markup).toContain("For invited guests");
    expect(markup).toContain("Lee made room for you at Maple Street.");
    expect(markup).toContain("Joining is always free.");
    expect(markup).toContain("No payment details needed.");
    expect(markup).toContain("ABC123");
  });

  it("explains who sees what without implying Kouchd moves money", () => {
    const markup = decode(renderToStaticMarkup(React.createElement(InvitePrivacyPanel)));
    expect(markup).toContain("Shared with everyone in the stay");
    expect(markup).toContain("Announcements, house info, and the chore board.");
    expect(markup).toContain("Only you and your host");
    expect(markup).toContain("Other guests in the stay can't see them.");
    expect(markup).toContain("Never through Kouchd");
    expect(markup).toContain("You pay your host directly, the way you agreed. Kouchd only keeps the record.");
  });
});
