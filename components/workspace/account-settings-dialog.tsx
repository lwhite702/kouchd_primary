"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { useState, type FormEvent } from "react";

import { api } from "@/convex/_generated/api";
import { isUsableName } from "@/lib/names";

export function AccountSettingsDialog({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
}) {
  const { user: clerkUser } = useUser();
  const viewer = useQuery(api.users.viewer, clerkUser ? {} : "skip");
  const syncCurrent = useMutation(api.users.syncCurrent);
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const displayName = String(form.get("name") || "").trim();
      const phone = String(form.get("phone") || "").trim() || undefined;
      const notifyEmail = form.get("notifyEmail") === "on";
      const notifySms = form.get("notifySms") === "on";

      if (!displayName) {
        throw new Error("Enter your name before saving.");
      }

      if (!clerkUser) {
        throw new Error("Your account is still loading. Try again in a moment.");
      }

      const [firstName, ...lastNameParts] = displayName.split(/\s+/);
      const updatedClerkUser = await clerkUser.update({
        firstName,
        lastName: lastNameParts.join(" "),
      });

      await syncCurrent({
        clerkName: updatedClerkUser.fullName || displayName,
        email: updatedClerkUser.primaryEmailAddress?.emailAddress,
        imageUrl: updatedClerkUser.imageUrl,
      });

      await updatePreferences({
        phone,
        notifyEmail,
        notifySms,
      });

      onSaved?.("Profile and reminder preferences saved.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setSubmitting(false);
    }
  }

  const defaultName =
    clerkUser?.fullName ||
    (viewer?.name && isUsableName(viewer.name) ? viewer.name : "");

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-settings-heading"
        style={{ maxWidth: 520, padding: "1.75rem" }}
      >
        <form onSubmit={handleSubmit}>
          <div className="settings-summary" style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
            <Bell size={22} style={{ color: "var(--green, #184f3a)" }} />
            <div>
              <strong id="account-settings-heading" style={{ display: "block", fontSize: "1.05rem" }}>
                Profile &amp; reminder delivery
              </strong>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                Set your household display name and notification preferences.
              </span>
            </div>
          </div>

          {error && (
            <div
              className="alert-banner"
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                background: "#fdf2f2",
                color: "#991b1b",
                fontSize: "0.88rem",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-grid settings-fields" style={{ display: "grid", gap: "1rem" }}>
            <label className="full" style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>Your display name</span>
              <input
                name="name"
                type="text"
                defaultValue={defaultName}
                placeholder="e.g. Lee White"
                maxLength={80}
                required
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid var(--line, #e2e8f0)",
                }}
              />
              <small className="muted" style={{ fontSize: "0.8rem" }}>
                Your name is saved to your account and shared with your household.
              </small>
            </label>

            <label className="full" style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>Mobile number for SMS</span>
              <input
                name="phone"
                type="tel"
                defaultValue={viewer?.phone || ""}
                placeholder="+15551234567"
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid var(--line, #e2e8f0)",
                }}
              />
            </label>

            <label className="check full" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                name="notifyEmail"
                type="checkbox"
                defaultChecked={viewer?.notifyEmail ?? true}
              />
              <span style={{ fontSize: "0.88rem" }}>Email reminders</span>
            </label>

            <label className="check full" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                name="notifySms"
                type="checkbox"
                defaultChecked={viewer?.notifySms ?? false}
              />
              <span style={{ fontSize: "0.88rem" }}>SMS reminders (Wrelik Brands LLC &middot; Kouchd)</span>
            </label>
          </div>

          <div
            className="modal-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              marginTop: "1.5rem",
            }}
          >
            <button
              className="button soft"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button className="button primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
