"use client";

import { Landmark, Plus, ReceiptText } from "lucide-react";

import { RewardsHub } from "@/components/rewards/rewards-hub";

import { HelpTip } from "@/components/onboarding/help-tip";

import { Tooltip } from "@/components/ui/tooltip";
import { HELP_LINKS } from "@/lib/help-links";
import { FeatureGate } from "@/components/flags/feature-gate";
import { FEATURE_FLAGS } from "@/lib/flags/config";
import { formatMoney, formatDate } from "@/components/workspace/types";

import type { WorkspaceState } from "./use-live-stay";
import { GuestTabs } from "./view-helpers";
export function ContributionsScreen({ state }: { state: WorkspaceState }) {
  const {
    setScreen,
    setPanel,
    isHost,
    isEnded,
    balance,
    guestMembers,
    credits,
    activeContributions,
    bundle,
    obligations,
    financialGuestId,
    setSelectedGuestId,
    notify,
    ledgerLabel,
    charge,
    waiveLateFee,
    setDestructiveAction,
    confirmContribution,
    disputeContributionEntry,
    stayId,
  } = state;
  return (
    <div key="contributions" className="screen-transition">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Private by guest</p>
          <h1>{ledgerLabel}</h1>
          <p className="subhead">
            {isHost
              ? "Each guest's ledger is shared only with that guest and the host."
              : "Your ledger is private between you and your host."}
          </p>
          <HelpTip
            title="Contribution ledger"
            href={
              isHost
                ? HELP_LINKS.ledgerManagement
                : HELP_LINKS.loggingContributions
            }
          >
            Review charges and contributions here. Hosts can switch between
            guests; guests only see their own private ledger.
          </HelpTip>
        </div>
        <div className="heading-actions">
          {!isEnded && (
            <>
              <Tooltip content="Record a payment made or contribution credit">
                <button
                  className="button primary"
                  type="button"
                  onClick={() => setPanel("contribution")}
                  disabled={!financialGuestId}
                >
                  <Plus size={18} /> Add contribution
                </button>
              </Tooltip>
              {isHost && (
                <Tooltip content="Add a one-off charge or utility share">
                  <button
                    className="button soft"
                    type="button"
                    onClick={() => setPanel("adhoc")}
                    disabled={!financialGuestId}
                  >
                    <ReceiptText size={18} /> Add charge
                  </button>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>
      {isHost && guestMembers.length > 0 && (
        <GuestTabs
          guests={guestMembers}
          selected={financialGuestId}
          onSelect={setSelectedGuestId}
        />
      )}
      <div className="external-payment-note">
        <strong>Payments happen outside Kouchd.</strong> Use the host options in
        Stay details, then log completed contributions here. Kouchd does not
        collect or process payments.{" "}
        <button
          className="text-button"
          type="button"
          onClick={() => setScreen("stay")}
        >
          View payment options
        </button>
      </div>
      <div className="summary-strip">
        <div className="summary-item">
          <span>Total charges</span>
          <strong>{formatMoney(charge)}</strong>
        </div>
        <div className="summary-item">
          <span>Confirmed credit</span>
          <strong>{formatMoney(credits)}</strong>
        </div>
        <div className="summary-item">
          <span>Remaining scheduled</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </div>
      <p className="muted">
        Scheduled totals include upcoming periods. Each row shows when its
        contribution is due.
      </p>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Payment order</p>
            <h2>Oldest shares are credited first</h2>
          </div>
        </div>
        <div className="ledger-list">
          {obligations.map((item, index) => (
            <article className="list-row contribution-row" key={item._id}>
              <span className="list-icon">
                <ReceiptText size={19} />
              </span>
              <div className="list-copy">
                <strong>
                  {item.title ?? `Period ${index + 1}`} · due{" "}
                  {formatDate(item.dueDate)}
                </strong>
                <span>
                  {formatMoney(item.baseAmountCents)} base
                  {item.earlyDiscountCents
                    ? ` · ${formatMoney(-item.earlyDiscountCents)} early discount`
                    : ""}
                  {item.lateFeeCents
                    ? ` · ${formatMoney(item.lateFeeCents)} across ${item.lateFeeOccurrences} late-fee cycle${item.lateFeeOccurrences === 1 ? "" : "s"}`
                    : ""}
                  {item.lateFeeWaived ? " · fee waived" : ""}
                </span>
                <span className="obligation-progress-copy">
                  {formatMoney(item.creditedCents)} confirmed of{" "}
                  {formatMoney(item.effectiveChargeCents)} due
                </span>
                <span
                  className="obligation-progress-track"
                  role="progressbar"
                  aria-label={`${item.title ?? `Period ${index + 1}`} payment progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    item.effectiveChargeCents > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (item.creditedCents / item.effectiveChargeCents) *
                              100,
                          ),
                        )
                      : 0
                  }
                >
                  <span
                    style={{
                      width: `${item.effectiveChargeCents > 0 ? Math.min(100, Math.max(0, (item.creditedCents / item.effectiveChargeCents) * 100)) : 0}%`,
                    }}
                  />
                </span>
              </div>
              <div className="list-value">
                {formatMoney(item.balanceCents)}
                <small>{item.status}</small>
              </div>
              {isHost && (
                <div className="row-actions">
                  {!isEnded && item.lateFeeCents > 0 && !item.lateFeeWaived && (
                    <button
                      className="mini-button"
                      type="button"
                      onClick={() =>
                        void waiveLateFee({ obligationId: item._id }).then(() =>
                          notify("Late fee waived and updated."),
                        )
                      }
                    >
                      Waive fee
                    </button>
                  )}
                  {!isEnded && item.type === "adhoc" && (
                    <button
                      className="mini-button danger"
                      type="button"
                      onClick={() =>
                        setDestructiveAction({
                          type: "cancelCharge",
                          obligationId: item._id,
                          title: item.title ?? "One-off charge",
                        })
                      }
                    >
                      Cancel charge
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
          {obligations.length === 0 && (
            <p className="muted">
              Choose a guest, then activate terms or add a one-off charge.
            </p>
          )}
        </div>
      </section>
      <FeatureGate flag={FEATURE_FLAGS.REWARDS_SYSTEM}>
        <RewardsHub
          stayId={stayId}
          isHost={Boolean(isHost && !isEnded)}
          readOnly={isEnded}
          selectedGuestId={financialGuestId}
          currentBalanceCents={balance}
          onNotify={notify}
          viewerId={bundle.membership.userId}
          onVoidClaim={(claim) =>
            setDestructiveAction({
              type: "voidClaim",
              claimId: claim._id,
              title: claim.title,
            })
          }
        />
      </FeatureGate>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Transactions</p>
            <h2>Contribution entries</h2>
          </div>
        </div>
        <div className="ledger-list">
          {activeContributions.map((item) => (
            <article className="list-row contribution-row" key={item._id}>
              <span className="list-icon payment">
                <Landmark size={19} />
              </span>
              <div className="list-copy">
                <strong>{item.type.replaceAll("_", " ")}</strong>
                <span>
                  {item.note || "No note"} · {item.status}
                </span>
              </div>
              <div className="list-value">
                {formatMoney(item.amountCents)}
                <small>{formatDate(item.date)}</small>
              </div>
              {!isEnded && (
                <div className="row-actions">
                  {item.status === "pending" &&
                    item.createdBy !== bundle.membership.userId && (
                      <>
                        <button
                          className="mini-button"
                          type="button"
                          onClick={() =>
                            void confirmContribution({ contributionId: item._id })
                          }
                        >
                          Confirm
                        </button>
                        <button
                          className="mini-button"
                          type="button"
                          onClick={() => void disputeContributionEntry(item._id)}
                        >
                          Dispute
                        </button>
                      </>
                    )}
                  {(isHost || item.createdBy === bundle.membership.userId) && (
                    <button
                      className="mini-button danger"
                      type="button"
                      onClick={() =>
                        setDestructiveAction({
                          type: "voidContribution",
                          contributionId: item._id,
                          title: `${formatMoney(item.amountCents)} ${item.type.replaceAll("_", " ")}`,
                        })
                      }
                    >
                      Void
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
