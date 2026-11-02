"use client";

import type { Id } from "@/convex/_generated/dataModel";

import { Member, Panel } from "@/components/workspace/types";

export function GuestTabs({
  guests,
  selected,
  onSelect,
}: {
  guests: Member[];
  selected?: Id<"users">;
  onSelect: (id: Id<"users">) => void;
}) {
  return (
    <div className="guest-tabs" aria-label="Choose a guest ledger">
      {guests.map((guest) => (
        <button
          className={selected === guest.person.id ? "active" : ""}
          type="button"
          key={guest.person.id}
          onClick={() => onSelect(guest.person.id)}
        >
          {guest.person.name && guest.person.name !== "Kouchd member"
            ? guest.person.name
            : "Guest"}
        </button>
      ))}
    </div>
  );
}

export function ModalActions({
  close,
  action,
  submitting,
}: {
  close: () => void;
  action: string;
  submitting?: boolean;
}) {
  return (
    <div className="dialog-actions">
      <button
        className="button ghost"
        type="button"
        onClick={close}
        disabled={submitting}
      >
        Cancel
      </button>
      <button className="button primary" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : action}
      </button>
    </div>
  );
}

export function panelTitle(panel: Exclude<Panel, null>) {
  return {
    contribution: "New contribution",
    chore: "Add a chore",
    adhoc: "Add one-off charge",
    announcement: "New announcement",
    settings: "Profile & reminder settings",
    invite: "Invite a guest",
    houseInfo: "Household Guide & Essentials",
    paymentOptions: "Payment options",
    guestTerms: "Edit guest agreement",
    householdTerms: "Edit household defaults",
    stayName: "Rename stay",
  }[panel];
}
