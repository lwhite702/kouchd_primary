"use client";

import { useEffect, useRef } from "react";

import { Bell, Copy } from "lucide-react";

import Link from "next/link";

import { addCalendarDays } from "@/lib/domain/dates";

import { HouseInfoForm } from "@/components/household/household-logistics";
import { PaymentOptionsForm } from "@/components/household/payment-options";

import { GuestAgreementForm } from "@/components/household/guest-agreement-form";

import { HelpTip } from "@/components/onboarding/help-tip";

import { HELP_LINKS } from "@/lib/help-links";

import type { WorkspaceState } from "./use-live-stay";
import { ModalActions, panelTitle } from "./view-helpers";
export function WorkspacePanels({ state }: { state: WorkspaceState }) {
  const {
    actionError,
    setPanel,
    viewer,
    isHost,
    members,
    guestMembers,
    asOfDate,
    bundle,
    notify,
    isSubmittingModal,
    terms,
    panel,
    addContribution,
    addCharge,
    addChore,
    addAnnouncement,
    savePreferences,
    clerkUser,
    saveHouseInfo,
    savePaymentOptions,
    editingGuestId,
    saveGuestAgreement,
    inviteUrl,
    inviteMode,
    makeInvite,
    inviteError,
  } = state;
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  if (!panel) return null;
  return (
    <dialog
      ref={dialog}
      className="modal-card workspace-dialog"
      aria-labelledby="workspace-dialog-title"
      onCancel={() => setPanel(null)}
      onClose={() => setPanel(null)}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">Kouchd</p>
          <h2 id="workspace-dialog-title">{panelTitle(panel)}</h2>
          {panel === "contribution" && (
            <HelpTip
              title="Logging a contribution"
              href={
                isHost
                  ? HELP_LINKS.ledgerManagement
                  : HELP_LINKS.loggingContributions
              }
            >
              Record something paid or shared outside Kouchd. Kouchd does
              not collect or process payments.
            </HelpTip>
          )}
          {panel === "invite" && (
            <HelpTip
              title="Private invitations"
              href={HELP_LINKS.hostsGettingStarted}
            >
              A private link expires after one week. You can also share the
              household referral code from Stay details.
            </HelpTip>
          )}
          {panel === "settings" && (
            <HelpTip
              title="Reminder preferences"
              href={HELP_LINKS.notificationPreferences}
            >
              Choose the channels where you want household reminders. SMS is
              optional and requires a phone number.
            </HelpTip>
          )}
        </div>
        <button
          className="icon-button compact"
          type="button"
          onClick={() => setPanel(null)}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      {panel === "contribution" && (
        <form onSubmit={addContribution}>
          <div className="form-grid">
            <label>
              <span>Type</span>
              <select name="type">
                <option value="payment">Payment</option>
                <option value="groceries">Groceries</option>
                <option value="supplies">Supplies</option>
                <option value="house_work">House work</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span>Value</span>
              <div className="money-input">
                <span>$</span>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </label>
            <label>
              <span>Transaction date</span>
              <input
                name="date"
                type="date"
                defaultValue={asOfDate ?? undefined}
                required
              />
            </label>
            <label className="full">
              <span>Note</span>
              <input
                name="note"
                placeholder="Backdated payments are supported"
              />
            </label>
            <label className="check full">
              <input name="counts" type="checkbox" defaultChecked />
              <span>Count toward this guest&apos;s balance</span>
            </label>
          </div>
          <ModalActions
            close={() => setPanel(null)}
            action="Add contribution"
            submitting={isSubmittingModal}
          />
        </form>
      )}
      {panel === "adhoc" && (
        <form onSubmit={addCharge}>
          <div className="form-grid">
            <label className="full">
              <span>Charge title</span>
              <input
                name="title"
                required
                placeholder="August electric split"
              />
            </label>
            <label>
              <span>Amount</span>
              <div className="money-input">
                <span>$</span>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </label>
            <label>
              <span>Effective date</span>
              <input
                name="effectiveDate"
                type="date"
                defaultValue={asOfDate ?? undefined}
                required
              />
            </label>
            <label>
              <span>Due date</span>
              <input
                name="dueDate"
                type="date"
                defaultValue={asOfDate ?? undefined}
                required
              />
            </label>
          </div>
          <ModalActions
            close={() => setPanel(null)}
            action="Add charge"
            submitting={isSubmittingModal}
          />
        </form>
      )}
      {panel === "chore" && (
        <form onSubmit={addChore}>
          <div className="form-grid">
            <label className="full">
              <span>Chore</span>
              <input name="title" required />
            </label>
            <label>
              <span>Assigned to</span>
              <select name="assigneeUserId">
                <option value="">Everyone</option>
                {members.map((member) => (
                  <option value={member.person.id} key={member.person.id}>
                    {member.person.name &&
                    member.person.name !== "Kouchd member"
                      ? member.person.name
                      : member.membership.role === "host"
                        ? "Host"
                        : "Guest"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Due date</span>
              <input
                name="dueDate"
                type="date"
                defaultValue={
                  asOfDate ? addCalendarDays(asOfDate, 2) : undefined
                }
                required
              />
            </label>
            <label>
              <span>Repeat</span>
              <select name="repeatCadence" defaultValue="none">
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="full">
              <span>Details</span>
              <input name="note" />
            </label>
          </div>
          <ModalActions
            close={() => setPanel(null)}
            action="Add chore"
            submitting={isSubmittingModal}
          />
        </form>
      )}
      {panel === "announcement" && (
        <form onSubmit={addAnnouncement}>
          <div className="form-grid">
            <label className="full">
              <span>Title</span>
              <input name="title" required />
            </label>
            <label className="full">
              <span>Announcement</span>
              <textarea name="body" rows={4} required />
            </label>
            <label>
              <span>Pin until</span>
              <input name="pinnedUntil" type="date" />
            </label>
          </div>
          <ModalActions
            close={() => setPanel(null)}
            action="Share announcement"
            submitting={isSubmittingModal}
          />
        </form>
      )}
      {panel === "settings" && (
        <form onSubmit={savePreferences}>
          <div className="settings-summary">
            <Bell size={22} />
            <div>
              <strong>Profile &amp; reminder delivery</strong>
              <span>Set your display name and notification channels.</span>
            </div>
          </div>
          <div className="form-grid settings-fields">
            <label className="full">
              <span>Your display name</span>
              <input
                name="name"
                type="text"
                defaultValue={clerkUser?.fullName || ""}
                placeholder="e.g. Lee White"
                maxLength={80}
              />
              <small>
                Your name is saved to your Clerk profile and shared with your
                household.
              </small>
            </label>
            <label className="full">
              <span>Mobile number for SMS</span>
              <input
                name="phone"
                type="tel"
                defaultValue={viewer.phone}
                placeholder="+15551234567"
              />
            </label>
            <label className="check full">
              <input
                name="notifyEmail"
                type="checkbox"
                defaultChecked={viewer.notifyEmail}
              />
              <span>Email reminders</span>
            </label>
            <label className="check full">
              <input
                name="notifySms"
                type="checkbox"
                defaultChecked={viewer.notifySms}
              />
              <span>SMS reminders (Wrelik Brands LLC &middot; Kouchd)</span>
            </label>
          </div>
          <div
            style={{
              margin: "0.85rem 0",
              padding: "0.85rem",
              background: "#faf8f5",
              borderRadius: "10px",
              border: "1px solid var(--line)",
              fontSize: "0.78rem",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            <p style={{ margin: "0 0 0.35rem" }}>
              By enabling SMS reminders, you agree to receive transactional text
              messages from <strong>Wrelik Brands LLC</strong> (operating{" "}
              <strong>Kouchd</strong>).{" "}
              <strong>Message and data rates may apply.</strong> Message
              frequency varies. Text STOP to cancel, HELP for help.
            </p>
            <p style={{ margin: "0 0 0.35rem" }}>
              We do not sell or share your SMS opt-in data or personal
              information with third parties for marketing purposes.
            </p>
            <p style={{ margin: 0 }}>
              <Link
                href="/terms"
                target="_blank"
                style={{
                  color: "var(--green)",
                  fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                Terms &amp; Conditions
              </Link>{" "}
              &middot;{" "}
              <Link
                href="/privacy"
                target="_blank"
                style={{
                  color: "var(--green)",
                  fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                Privacy Policy
              </Link>{" "}
              &middot;{" "}
              <Link
                href="/sms-opt-in"
                target="_blank"
                style={{
                  color: "var(--green)",
                  fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                SMS Terms Details
              </Link>
            </p>
          </div>
          <ModalActions
            close={() => setPanel(null)}
            action="Save preferences"
            submitting={isSubmittingModal}
          />
        </form>
      )}
      {panel === "houseInfo" && (
        <HouseInfoForm
          initialInfo={bundle.stay.houseInfo}
          onSubmit={saveHouseInfo}
          onCancel={() => setPanel(null)}
        />
      )}
      {panel === "paymentOptions" && (
        <PaymentOptionsForm
          initialOptions={bundle.stay.paymentOptions}
          onSubmit={savePaymentOptions}
          onCancel={() => setPanel(null)}
        />
      )}
      {panel === "guestTerms" &&
        editingGuestId &&
        (() => {
          const guest = guestMembers.find(
            (item) => item.person.id === editingGuestId,
          );
          const guestTerms = guest?.terms ?? terms;
          const currentGuestName =
            guest?.person.name && guest.person.name !== "Kouchd member"
              ? guest.person.name
              : "Guest";
          return guest && guestTerms ? (
            <GuestAgreementForm
              terms={guestTerms}
              guestName={currentGuestName}
              onSubmit={saveGuestAgreement}
              onCancel={() => setPanel(null)}
            />
          ) : (
            <p className="muted">This guest agreement is not available.</p>
          );
        })()}
      {panel === "invite" && (
        <>
          <div
            style={{
              border: "1px dashed var(--line)",
              borderRadius: "12px",
              padding: "1rem",
              background: "#faf8f5",
              marginBottom: "1rem",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                color: "var(--muted)",
                fontWeight: 700,
              }}
            >
              Household Referral Code
            </span>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "0.25rem",
              }}
            >
              <strong
                style={{
                  fontSize: "1.2rem",
                  letterSpacing: "1px",
                  color: "var(--green)",
                }}
              >
                {bundle.stay.referralCode ?? "KCH-SHARED"}
              </strong>
              <button
                className="button soft compact"
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    bundle.stay.referralCode ?? "",
                  );
                  notify("Referral code copied!");
                }}
              >
                <Copy size={15} /> Copy Code
              </button>
            </div>
          </div>
          {inviteUrl ? (
            <div>
              <p className="muted">
                {inviteMode === "email"
                  ? "The email invitation was sent. You can also copy this private link."
                  : "Copy this private link, paste it into a message on your phone, and send it yourself."}{" "}
                It expires in seven days.
              </p>
              <div className="invite-output">
                <input
                  readOnly
                  value={inviteUrl}
                  aria-label="Guest invitation link"
                />
                <button
                  className="button soft"
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(inviteUrl)
                      .then(() =>
                        notify(
                          "Invite link copied. Paste it into your phone message.",
                        ),
                      )
                  }
                >
                  <Copy size={17} /> Copy link
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={makeInvite}>
              <div className="form-grid">
                <label className="full">
                  <span>Guest email (for email invite only)</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="guest@example.com"
                  />
                </label>
              </div>
              <p className="muted modal-note">
                For text, choose “Create link to copy” and send it from your
                phone’s messaging app. Kouchd will not send a text or access
                your contacts. This invite link expires in seven days. Guest
                capacity depends on the host’s plan. Guests join for free.
              </p>
              {inviteError && (
                <p className="form-error" role="alert">
                  {inviteError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => setPanel(null)}
                >
                  Cancel
                </button>
                <button
                  className="button soft"
                  type="submit"
                  name="delivery"
                  value="text"
                  disabled={isSubmittingModal}
                >
                  {isSubmittingModal ? "Creating..." : "Create link to copy"}
                </button>
                <button
                  className="button primary"
                  type="submit"
                  name="delivery"
                  value="email"
                  disabled={isSubmittingModal}
                >
                  {isSubmittingModal ? "Creating..." : "Send email invite"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </dialog>
  );
}
