import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanLimitModal } from "../components/billing/plan-limit-modal";
import { BlockedJoinsBanner } from "../components/billing/blocked-joins-banner";
import type { Id } from "../convex/_generated/dataModel";

describe("Web Plan Capacity & Blocked Join Components", () => {
  it("renders PlanLimitModal for Free plan with Upgrade action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PlanLimitModal, {
        isOpen: true,
        onClose: () => undefined,
        limit: {
          dimension: "stay",
          plan: "free",
          limit: 1,
          atHighestPlan: false,
          message: "Free includes 1 active stay. End your current stay or move to Plus to host up to 3 at once.",
        },
        onUpgrade: () => undefined,
      })
    );

    expect(markup).toContain("Your Free plan is full");
    expect(markup).toContain("Free includes 1 active stay");
    expect(markup).toContain("Upgrade to Plus");
    expect(markup).toContain("Not now");
  });

  it("renders PlanLimitModal for Plus plan at cap without upsell", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PlanLimitModal, {
        isOpen: true,
        onClose: () => undefined,
        limit: {
          dimension: "stay",
          plan: "plus",
          limit: 3,
          atHighestPlan: true,
          message: "Plus covers up to 3 active stays. End a stay to start a new one.",
        },
        onUpgrade: () => undefined,
      })
    );

    expect(markup).toContain("Every stay on Plus is in use");
    expect(markup).toContain("Plus covers up to 3 active stays");
    expect(markup).toContain("Understood");
    expect(markup).not.toContain("Upgrade to Plus");
  });

  it("renders BlockedJoinsBanner with dismiss and upgrade actions when full on Free", () => {
    const fakeBlockedJoin = {
      id: "blocked_1" as Id<"blockedJoins">,
      stayId: "stay_1" as Id<"stays">,
      stayName: "Sunnyvale Room",
      guestName: "Sam Guest",
      attemptedAt: 1730000000000,
    };

    const markup = renderToStaticMarkup(
      React.createElement(BlockedJoinsBanner, {
        blockedJoins: [fakeBlockedJoin],
        isFree: true,
        guestsFull: true,
        onUpgrade: () => undefined,
        onDismiss: async () => undefined,
      })
    );

    expect(markup).toContain("Sam Guest tried to join — this stay is full");
    expect(markup).toContain("Sunnyvale Room");
    expect(markup).toContain("Make room with Plus");
    expect(markup).toContain("Dismiss");
  });

  it("filters BlockedJoinsBanner by stayId when viewing an individual stay", () => {
    const items = [
      {
        id: "blocked_1" as Id<"blockedJoins">,
        stayId: "stay_1" as Id<"stays">,
        stayName: "Sunnyvale Room",
        guestName: "Sam Guest",
        attemptedAt: 1730000000000,
      },
      {
        id: "blocked_2" as Id<"blockedJoins">,
        stayId: "stay_2" as Id<"stays">,
        stayName: "Downtown Loft",
        guestName: "Jordan Guest",
        attemptedAt: 1730000000000,
      },
    ];

    const markupStay1 = renderToStaticMarkup(
      React.createElement(BlockedJoinsBanner, {
        blockedJoins: items,
        filterStayId: "stay_1" as Id<"stays">,
        onDismiss: async () => undefined,
      })
    );

    expect(markupStay1).toContain("Sunnyvale Room");
    expect(markupStay1).toContain("Sam Guest");
    expect(markupStay1).not.toContain("Downtown Loft");
    expect(markupStay1).not.toContain("Jordan Guest");
  });

  it("formats host plan capacity labels consistently with product standards", () => {
    function computePlanLabel(usage: {
      plan: "free" | "plus" | "pro";
      guests: { used: number; limit: number | null };
    }) {
      if (usage.plan === "plus") {
        const limit = usage.guests.limit ?? 5;
        return `Plan · Plus (${usage.guests.used}/${limit} spots)`;
      }
      if (usage.plan === "pro") {
        return "Plan · Pro";
      }
      const limit = usage.guests.limit ?? 1;
      return `Host plan · Free (${usage.guests.used}/${limit} spots)`;
    }

    expect(computePlanLabel({ plan: "free", guests: { used: 1, limit: 1 } })).toBe("Host plan · Free (1/1 spots)");
    expect(computePlanLabel({ plan: "plus", guests: { used: 2, limit: 5 } })).toBe("Plan · Plus (2/5 spots)");
    expect(computePlanLabel({ plan: "pro", guests: { used: 10, limit: null } })).toBe("Plan · Pro");
  });
});
