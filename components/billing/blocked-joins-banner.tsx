"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export interface BlockedJoinItem {
  id: Id<"blockedJoins">;
  stayId: Id<"stays">;
  stayName: string;
  guestName: string;
  attemptedAt: number;
}

export interface BlockedJoinsBannerProps {
  blockedJoins: BlockedJoinItem[];
  isFree?: boolean;
  guestsFull?: boolean;
  onUpgrade?: () => void;
  onDismiss: (blockedJoinId: Id<"blockedJoins">) => Promise<void>;
  filterStayId?: Id<"stays">;
}

export function BlockedJoinsBanner({
  blockedJoins,
  isFree = false,
  guestsFull = false,
  onUpgrade,
  onDismiss,
  filterStayId,
}: BlockedJoinsBannerProps) {
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const visible = filterStayId
    ? blockedJoins.filter((b) => b.stayId === filterStayId)
    : blockedJoins;

  if (visible.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        marginBottom: "1.5rem",
      }}
    >
      {visible.map((blocked) => {
        const dateText = new Date(blocked.attemptedAt).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric" },
        );
        const headline = guestsFull
          ? `${blocked.guestName} tried to join — this stay is full`
          : `${blocked.guestName} tried to join while this stay was full. There's room now. If their invite has expired or been used, send a new one.`;

        const isDismissing = dismissingId === blocked.id;

        return (
          <div
            key={blocked.id}
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "18px",
              background: "#fef9c3",
              border: "1px solid #fef08a",
              color: "#713f12",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem", color: "#854d0e" }}>
                  {headline}
                </strong>
                <span style={{ fontSize: "0.82rem", color: "#a16207" }}>
                  {blocked.stayName} &middot; {dateText}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              {isFree && guestsFull && onUpgrade && (
                <button
                  type="button"
                  className="button primary compact"
                  style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                  onClick={onUpgrade}
                >
                  Make room with Plus
                </button>
              )}
              <button
                type="button"
                className="button ghost compact"
                style={{ fontSize: "0.82rem", padding: "6px 12px", color: "#713f12" }}
                disabled={isDismissing}
                onClick={async () => {
                  setDismissingId(blocked.id);
                  try {
                    await onDismiss(blocked.id);
                  } finally {
                    setDismissingId(null);
                  }
                }}
              >
                {isDismissing ? "Dismissing..." : "Dismiss"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
