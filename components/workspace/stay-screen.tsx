"use client";

import { Copy, Users } from "lucide-react";

import { HouseholdLogisticsCard } from "@/components/household/household-logistics";
import { PaymentOptionsCard } from "@/components/household/payment-options";

import { PaymentScheduleCard } from "@/components/household/payment-schedule-card";
import { OccupancyCaptureCard } from "@/components/household/occupancy-capture-card";

import { HelpTip } from "@/components/onboarding/help-tip";

import { Tooltip } from "@/components/ui/tooltip";
import { HELP_LINKS } from "@/lib/help-links";

import { formatMoney, formatDate } from "@/components/workspace/types";

import type { WorkspaceState } from "./use-live-stay";
import { GuestTabs } from "./view-helpers";
export function StayScreen({ state }: { state: WorkspaceState }) {
  const {
    setPanel,
    isHost,
    isEnded,
    hasAccepted,
    setGuestOnboardingOpen,
    setInviteUrl,
    setInviteMode,
    setInviteError,
    guestMembers,
    bundle,
    financialGuestId,
    setSelectedGuestId,
    notify,
    setDestructiveAction,
    displayedAgreementTerms,
    selectedGuestMember,
    guestDisplayName,
    displayedAgreementAccepted,
    saveAgreementAutoAccept,
    isSubmittingModal,
    saveGuestPreferredName,
    terms,
    selectedGuestTerms,
    setEditingGuestId,
    stayId,
  } = state;
  return (
    <div key="stay" className="screen-transition">
      <div className="page-heading">
        <div>
          <p className="eyebrow">The agreement</p>
          <h1>Stay details</h1>
          <p className="subhead">
            Everyone sees shared house guidelines, while guest money details
            stay private.
          </p>
          <HelpTip title="Stay details" href={HELP_LINKS.stayAgreements}>
            Find the current terms, house rules, and household access
            information here.
          </HelpTip>
        </div>
        {!isEnded && !isHost && !hasAccepted && (
          <div className="heading-actions">
            <p className="muted">
              {(bundle.stay.agreementAutoAcceptEnabled ?? true)
                ? `Accept now, or leave it pending for ${bundle.stay.agreementAutoAcceptHours ?? 24} hours and it will be auto-accepted.`
                : "Your host has turned off automatic acceptance. Please review and accept the agreement."}
            </p>
            <button
              className="button primary"
              type="button"
              onClick={() => setGuestOnboardingOpen(true)}
            >
              Review &amp; accept agreement
            </button>
          </div>
        )}
      </div>
      {isHost && guestMembers.length > 0 && (
        <GuestTabs
          guests={guestMembers}
          selected={financialGuestId}
          onSelect={setSelectedGuestId}
        />
      )}
      <div className="agreement-callout">
        <div>
          <Users size={22} />
          <div>
            <strong>
              Terms version {displayedAgreementTerms?.version ?? 1}
            </strong>
            <span>
              {isHost
                ? selectedGuestMember
                  ? selectedGuestMember.agreementOffer?.status ===
                      "auto_accepted" &&
                    selectedGuestMember.agreementOffer.systemAutoApprovedAt
                    ? `${guestDisplayName} auto-accepted ${new Date(selectedGuestMember.agreementOffer.systemAutoApprovedAt).toLocaleString()}`
                    : displayedAgreementAccepted
                      ? `${guestDisplayName} accepted this agreement`
                      : `${guestDisplayName} agreement is awaiting acceptance`
                  : hasAccepted
                    ? "Your host terms are accepted"
                    : "Host terms are set when the stay is created"
                : hasAccepted
                  ? "You accepted this agreement"
                  : "Your agreement is awaiting your review"}
            </span>
          </div>
        </div>
        <span className="accepted-pill">{bundle.stay.status}</span>
      </div>
      {isHost && !isEnded && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Guest agreements</p>
              <h2>Automatic acceptance</h2>
              <p className="muted">
                Guests can accept immediately. Pending agreements are accepted
                after this delay.
              </p>
            </div>
          </div>
          <form
            key={`${bundle.stay.agreementAutoAcceptEnabled ?? true}-${bundle.stay.agreementAutoAcceptHours ?? 24}`}
            onSubmit={saveAgreementAutoAccept}
          >
            <div className="form-grid">
              <label className="check full">
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={
                    bundle.stay.agreementAutoAcceptEnabled ?? true
                  }
                />
                <span>Auto-accept pending agreements</span>
              </label>
              <label>
                <span>Wait time (hours)</span>
                <input
                  name="hours"
                  type="number"
                  min="1"
                  max="720"
                  step="1"
                  defaultValue={bundle.stay.agreementAutoAcceptHours ?? 24}
                  required
                />
              </label>
            </div>
            <p className="muted">
              Changing this restarts the timer for agreements that are still
              pending. Turn it off to require each guest to accept.
            </p>
            <button
              className="button soft"
              type="submit"
              disabled={isSubmittingModal}
            >
              Save auto-accept settings
            </button>
          </form>
        </section>
      )}
      {displayedAgreementTerms && (
        <div className="details-grid">
          <article className="details-card referral-code-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div>
                <p className="overline" style={{ margin: 0 }}>
                  Household Referral Code
                </p>
                <strong
                  style={{
                    fontSize: "1.3rem",
                    letterSpacing: "1.5px",
                    color: "var(--green, #184f3a)",
                  }}
                >
                  {bundle.stay.referralCode ?? "KCH-SHARED"}
                </strong>
                <p
                  className="muted"
                  style={{ margin: "3px 0 0", fontSize: "0.8rem" }}
                >
                  Members can join this stay directly by entering this code on
                  Kouchd.
                </p>
              </div>
              <Tooltip content="Copy invite code to share with household members">
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
                  <Copy size={15} /> Copy code
                </button>
              </Tooltip>
            </div>
          </article>
          <article className="details-card">
            <p className="overline">Dates</p>
            <p>
              {formatDate(displayedAgreementTerms.startDate)} to{" "}
              {formatDate(displayedAgreementTerms.endDate)}
            </p>
          </article>
          <article className="details-card">
            <p className="overline">Contribution plan</p>
            <p>
              {formatMoney(displayedAgreementTerms.rateCents)} per{" "}
              {displayedAgreementTerms.cadence === "weekly" ? "week" : "day"}
            </p>
          </article>
          <article className="details-card">
            <p className="overline">Billable dates</p>
            <p>
              {displayedAgreementTerms.billingBasis === "occupied_nights"
                ? "Only completed overnights recorded by the host"
                : "Every day within the agreement dates"}
            </p>
          </article>
          <article className="details-card">
            <p className="overline">Early rule</p>
            <p>
              {(displayedAgreementTerms.earlyDiscountEnabled ??
              displayedAgreementTerms.earlyDiscountPercentage > 0)
                ? `${displayedAgreementTerms.earlyDiscountPercentage}% off when complete ${displayedAgreementTerms.earlyDiscountDays} days early`
                : "Off"}
            </p>
          </article>
          <article className="details-card">
            <p className="overline">Late rule</p>
            <p>
              {(displayedAgreementTerms.lateFeeEnabled ??
              displayedAgreementTerms.lateFeeCents > 0)
                ? `${formatMoney(displayedAgreementTerms.lateFeeCents)} weekly after ${displayedAgreementTerms.graceDays} grace days`
                : "Off"}
            </p>
          </article>
        </div>
      )}
      <HouseholdLogisticsCard
        houseInfo={bundle.stay.houseInfo}
        isHost={Boolean(isHost && !isEnded)}
        onEdit={() => setPanel("houseInfo")}
        onNotify={notify}
      />
      {isHost && selectedGuestMember && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Guest profile</p>
              <h2>{guestDisplayName}</h2>
            </div>
          </div>
          <div className="details-grid">
            <article className="details-card">
              <p className="overline">Contact information</p>
              <p>
                Email:{" "}
                {selectedGuestMember.person.email ? (
                  <a href={`mailto:${selectedGuestMember.person.email}`}>
                    {selectedGuestMember.person.email}
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
              <p>
                Phone:{" "}
                {selectedGuestMember.person.phone ? (
                  <a href={`tel:${selectedGuestMember.person.phone}`}>
                    {selectedGuestMember.person.phone}
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
            </article>
            <article className="details-card">
              <p className="overline">Preferred name</p>
              <form key={financialGuestId} onSubmit={saveGuestPreferredName}>
                <label>
                  <span className="sr-only">Guest preferred name</span>
                  <input
                    name="preferredName"
                    type="text"
                    defaultValue={
                      selectedGuestMember.person.name === "Kouchd member"
                        ? ""
                        : selectedGuestMember.person.name
                    }
                    maxLength={80}
                    required
                  />
                </label>
                <button
                  className="button soft compact"
                  type="submit"
                  disabled={isSubmittingModal}
                >
                  Save preferred name
                </button>
              </form>
            </article>
          </div>
        </section>
      )}
      <PaymentOptionsCard
        paymentOptions={bundle.stay.paymentOptions}
        isHost={Boolean(isHost && !isEnded)}
        onEdit={() => setPanel("paymentOptions")}
        onNotify={notify}
      />
      {terms && (
        <PaymentScheduleCard
          key={`${financialGuestId ?? "host"}-${terms.cadence}`}
          stayId={stayId}
          isHost={isHost}
          hasAccepted={hasAccepted}
          cadence={terms.cadence}
          paymentDayOfWeek={terms.paymentDayOfWeek}
          ended={isEnded}
          onNotify={notify}
        />
      )}
      {selectedGuestTerms?.billingBasis === "occupied_nights" &&
        financialGuestId && (
          <OccupancyCaptureCard
            stayId={stayId}
            guestUserId={financialGuestId}
            guestName={guestDisplayName}
            isHost={Boolean(isHost && !isEnded)}
            canRecord={
              !isEnded &&
              (isHost
                ? guestMembers.find(
                    (item) => item.person.id === financialGuestId,
                  )?.membership.acceptedTermsId === selectedGuestTerms._id
                : hasAccepted)
            }
            onNotify={notify}
          />
        )}
      {isHost && !isEnded && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Individual agreements</p>
              <h2>Guest terms</h2>
            </div>
          </div>
          {guestMembers.length ? (
            <div className="ledger-list">
              {guestMembers.map((guest) => {
                const guestTerms = guest.terms ?? terms;
                const currentGuestName =
                  guest.person.name && guest.person.name !== "Kouchd member"
                    ? guest.person.name
                    : "Guest";
                return (
                  <article className="list-row" key={guest.person.id}>
                    <div className="list-copy">
                      <strong>{currentGuestName}</strong>
                      <span>
                        {guestTerms
                          ? `${formatMoney(guestTerms.rateCents)} per ${guestTerms.cadence === "weekly" ? "week" : "day"} · ${guest.agreementOffer?.status === "auto_accepted" && guest.agreementOffer.systemAutoApprovedAt ? `system auto-approved ${new Date(guest.agreementOffer.systemAutoApprovedAt).toLocaleString()}` : guest.membership.acceptedTermsId === guestTerms._id ? "accepted" : "awaiting acceptance"}`
                          : "Agreement not available"}
                      </span>
                    </div>
                    <button
                      className="mini-button"
                      type="button"
                      disabled={!guestTerms}
                      onClick={() => {
                        setEditingGuestId(guest.person.id);
                        setPanel("guestTerms");
                      }}
                    >
                      Edit agreement
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted">
              Guest agreements appear here when someone joins.
            </p>
          )}
        </section>
      )}
      {terms?.houseRules && terms.houseRules.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Living Guidelines</p>
              <h2>House Rules ({terms.houseRules.length})</h2>
            </div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {terms.houseRules.map(
              (
                rule: { id: string; title: string; description: string },
                i: number,
              ) => (
                <article className="list-row" key={rule.id}>
                  <span
                    style={{
                      fontWeight: 800,
                      color: "var(--green, #184f3a)",
                      width: 24,
                    }}
                  >
                    {i + 1}.
                  </span>
                  <div className="list-copy">
                    <strong>{rule.title}</strong>
                    <span>{rule.description}</span>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
      ) : (
        <article className="boundary-card">
          <p className="overline">Shared expectations</p>
          <h2>Clear beats assumed.</h2>
          <p className="notes-copy">
            {terms?.houseNotes || "Standard household expectations apply."}
          </p>
        </article>
      )}
      {terms?.houseRules &&
        terms.houseRules.length > 0 &&
        terms.houseNotes &&
        !terms.houseRules.every((rule: { title: string }) =>
          terms.houseNotes.includes(rule.title),
        ) && (
          <article className="boundary-card">
            <p className="overline">Additional notes</p>
            <h2>Clear beats assumed.</h2>
            <p className="notes-copy">{terms.houseNotes}</p>
          </article>
        )}
      {isHost && !isEnded && (
        <section className="invite-card">
          <div>
            <p className="eyebrow">Grow the household</p>
            <h2>Invite members.</h2>
            <p className="muted">
              Share your household referral code, copy a private link to text
              yourself, or send an invitation email.
            </p>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => {
              setInviteUrl("");
              setInviteMode(null);
              setInviteError("");
              setPanel("invite");
            }}
          >
            Invite guest
          </button>
        </section>
      )}
      {isHost && !isEnded && (
        <button
          className="button danger-outline"
          type="button"
          onClick={() => setDestructiveAction({ type: "end" })}
        >
          End this stay
        </button>
      )}
    </div>
  );
}
