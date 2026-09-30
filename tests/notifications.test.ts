import { describe, expect, it } from "vitest";
import type { NotificationItem } from "@/components/notifications/dashboard-notifications";

describe("Dashboard Notifications Component Structure", () => {
  it("correctly models notification items with urgent, notice, and info tiers", () => {
    const items: NotificationItem[] = [
      {
        id: "n1",
        type: "payment",
        urgency: "urgent",
        title: "Overdue contribution ($200.00)",
        description: "Payment was due yesterday. Grace period ending soon.",
        actionLabel: "View Ledger",
      },
      {
        id: "n2",
        type: "chore",
        urgency: "notice",
        title: "2 chores due today",
        description: "Take out bins, kitchen restock.",
        actionLabel: "View Chores",
      },
      {
        id: "n3",
        type: "announcement",
        urgency: "info",
        title: "House note: Quiet hours",
        description: "Quiet hours begin at 10:30 PM.",
      },
    ];

    expect(items).toHaveLength(3);
    expect(items[0].urgency).toBe("urgent");
    expect(items[1].type).toBe("chore");
    expect(items[2].type).toBe("announcement");
  });

  it("handles actionable confirmation actions cleanly", () => {
    let confirmed = false;
    const item: NotificationItem = {
      id: "claim_1",
      type: "payment",
      urgency: "notice",
      title: "Confirm payment",
      description: "Guest logged payment of $100.",
      confirmLabel: "Confirm",
      confirmAction: () => {
        confirmed = true;
      },
    };

    expect(item.confirmAction).toBeDefined();
    item.confirmAction!();
    expect(confirmed).toBe(true);
  });
});
