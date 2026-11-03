"use client";

import type { Doc, Id } from "@/convex/_generated/dataModel";

import { Member, Panel, SubleaseLockState } from "@/components/workspace/types";
import { isUsableName } from "@/lib/names";

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
          {isUsableName(guest.person.name)
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
    splitBill: "Split a bill",
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

export function SubleaseLockBanner({
  lock,
  isHost,
  onOpenSettings,
}: {
  lock?: SubleaseLockState;
  isHost: boolean;
  onOpenSettings?: () => void;
}) {
  if (!lock) return null;
  if (lock.locked) {
    return (
      <div
        role="alert"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.25rem",
          borderRadius: "12px",
          background: "#fdf2f2",
          border: "1px solid #f8b4b4",
          color: "#991b1b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <strong style={{ display: "block", marginBottom: "0.25rem" }}>
            {isHost ? "Sublease locked (Kouchd Plus ended)" : "Sublease is read-only"}
          </strong>
          <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.45 }}>
            {isHost
              ? "Your Plus subscription has ended. This sublease is locked and exports are blocked until you have an active subscription."
              : "This sublease is read-only and exports are blocked until the host renews. Your sublease agreement still applies, so keep paying rent as agreed. Kouchd's record being locked doesn't change it."}
          </p>
        </div>
        {isHost && onOpenSettings && (
          <button
            type="button"
            className="button primary compact"
            onClick={onOpenSettings}
            style={{ flexShrink: 0 }}
          >
            Renew Plus
          </button>
        )}
      </div>
    );
  }
  if (lock.billingRetryWarning && isHost) {
    return (
      <div
        role="alert"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.25rem",
          borderRadius: "12px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <strong style={{ display: "block", marginBottom: "0.25rem" }}>
            Payment failed &middot; Action required
          </strong>
          <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.45 }}>
            We couldn&apos;t process your Kouchd Plus payment. Update your billing method within 7 days to keep this sublease active and unlocked.
          </p>
        </div>
        {onOpenSettings && (
          <button
            type="button"
            className="button primary compact"
            onClick={onOpenSettings}
            style={{ flexShrink: 0 }}
          >
            Update payment
          </button>
        )}
      </div>
    );
  }
  return null;
}

export function LandlordConsentWarningCard({
  stay,
  onDismiss,
}: {
  stay?: Doc<"stays">;
  onDismiss?: () => void;
}) {
  if (
    stay?.arrangement !== "sublease" ||
    stay.landlordConsent?.answer !== "not_confirmed" ||
    stay.landlordConsent?.warningDismissedAt
  ) {
    return null;
  }
  return (
    <div
      role="region"
      aria-label="Landlord consent notice"
      style={{
        padding: "1rem 1.25rem",
        marginBottom: "1.25rem",
        borderRadius: "12px",
        background: "#fff8eb",
        border: "1px solid #f5d09b",
        color: "#78350f",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
      }}
    >
      <div>
        <strong style={{ display: "block", marginBottom: "0.25rem" }}>
          Landlord consent not confirmed
        </strong>
        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.45 }}>
          Subletting without landlord permission can lead to lease violations or eviction. Check your lease before your guest moves in.
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          className="button ghost compact"
          onClick={onDismiss}
          style={{ flexShrink: 0 }}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
