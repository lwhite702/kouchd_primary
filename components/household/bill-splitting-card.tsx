"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  BILL_CATEGORIES,
  type BillCategory,
  type BillSplitMethod,
  calculateBillShares,
} from "@/lib/domain/billSplitting";
import { formatDate, formatMoney, type Member } from "@/components/workspace/types";

export const BILL_CATEGORY_LABELS: Record<BillCategory, string> = {
  electricity: "Electricity",
  water: "Water",
  gas: "Gas",
  internet: "Internet",
  trash: "Trash",
  other: "Other",
};

export const BILL_SPLIT_METHOD_LABELS: Record<BillSplitMethod, string> = {
  equal: "Equal split",
  percentage: "Percentage split",
  fixed: "Fixed amount",
};

export interface BillShareRecord {
  _id: Id<"billShares">;
  billId: Id<"bills">;
  stayId: Id<"stays">;
  guestUserId: Id<"users">;
  guestName: string;
  input?: number;
  prorationDays?: number;
  amountCents: number;
  obligationId: Id<"obligations">;
}

export interface BillRecord {
  _id: Id<"bills">;
  _creationTime: number;
  stayId: Id<"stays">;
  createdBy: Id<"users">;
  title: string;
  category: BillCategory;
  serviceStart: string;
  serviceEnd: string;
  totalCents: number;
  dueDate: string;
  splitMethod: BillSplitMethod;
  includeHost: boolean;
  prorateByStayDates: boolean;
  createdAt: number;
  voidedAt?: number;
  voidedBy?: Id<"users">;
  shares: BillShareRecord[];
}

export interface SplitBillSubmission {
  title: string;
  category: BillCategory;
  serviceStart: string;
  serviceEnd: string;
  totalCents: number;
  dueDate: string;
  splitMethod: BillSplitMethod;
  includeHost: boolean;
  prorateByStayDates: boolean;
  guests: Array<{
    guestUserId: Id<"users">;
    input?: number;
  }>;
}

function formatSplitMethodSummary(bill: BillRecord): string {
  const parts: string[] = [BILL_SPLIT_METHOD_LABELS[bill.splitMethod]];
  if (bill.splitMethod !== "fixed") {
    parts.push(bill.includeHost ? "Host included" : "Guests only");
  }
  if (bill.prorateByStayDates) {
    parts.push("Prorated by stay dates");
  }
  return parts.join(" · ");
}

function formatGuestCalculationSummary(
  bill: BillRecord,
  share?: BillShareRecord,
): string {
  const methodLabel =
    bill.splitMethod === "equal"
      ? `Equal split (${bill.includeHost ? "host included" : "guests only"})`
      : bill.splitMethod === "percentage"
        ? share?.input !== undefined
          ? `Percentage share (${share.input}%)`
          : "Percentage share"
        : "Fixed share";
  if (share?.prorationDays !== undefined) {
    return `${methodLabel} · Prorated for ${share.prorationDays} overlap day${share.prorationDays === 1 ? "" : "s"}`;
  }
  return methodLabel;
}

export function BillSplittingSection({
  bills,
  isHost,
  isEnded,
  onOpenSplitBill,
  onVoidBill,
}: {
  bills: BillRecord[];
  isHost: boolean;
  isEnded: boolean;
  onOpenSplitBill: () => void;
  onVoidBill: (bill: { billId: Id<"bills">; title: string }) => void;
}) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Household utilities &amp; shared bills</p>
          <h2>Bill splitting</h2>
        </div>
        {isHost && !isEnded && (
          <button
            className="button soft compact"
            type="button"
            onClick={onOpenSplitBill}
          >
            <Plus size={16} /> Split a bill
          </button>
        )}
      </div>
      <p className="muted" style={{ marginTop: "-0.35rem" }}>
        {isHost
          ? "Post shared household utilities or recurring bills across active guests. Each guest sees only their own share in their private ledger."
          : "Shared household bills that include your stay appear here alongside how your share was calculated."}
      </p>
      {bills.length === 0 ? (
        <p className="muted">
          {isHost
            ? "No shared bills have been split yet."
            : "No shared household bills include your stay yet."}
        </p>
      ) : (
        <div className="ledger-list">
          {bills.map((bill) => {
            const guestShare = bill.shares[0];
            const isVoided = Boolean(bill.voidedAt);
            return (
              <article
                className="list-row contribution-row"
                key={bill._id}
                style={isVoided ? { opacity: 0.68 } : undefined}
              >
                <span className="list-icon">
                  <ReceiptText size={19} />
                </span>
                <div className="list-copy">
                  <strong>
                    {bill.title} · {BILL_CATEGORY_LABELS[bill.category]}
                    {isVoided ? " · Voided" : ""}
                  </strong>
                  <span>
                    Service {formatDate(bill.serviceStart)} to{" "}
                    {formatDate(bill.serviceEnd)} · due{" "}
                    {formatDate(bill.dueDate)}
                  </span>
                  <span>
                    Total {formatMoney(bill.totalCents)} ·{" "}
                    {isHost
                      ? formatSplitMethodSummary(bill)
                      : formatGuestCalculationSummary(bill, guestShare)}
                  </span>
                  {isHost ? (
                    <span
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {bill.shares.map((share) => {
                        const details: string[] = [];
                        if (
                          bill.splitMethod === "percentage" &&
                          share.input !== undefined
                        ) {
                          details.push(`${share.input}%`);
                        }
                        if (share.prorationDays !== undefined) {
                          details.push(
                            `${share.prorationDays}d overlap`,
                          );
                        }
                        return (
                          <small
                            key={share._id}
                            style={{
                              background: "var(--surface-muted, #f4f1ea)",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "999px",
                              color: "var(--ink)",
                              fontWeight: 600,
                            }}
                          >
                            {share.guestName}: {formatMoney(share.amountCents)}
                            {details.length > 0
                              ? ` (${details.join(" · ")})`
                              : ""}
                          </small>
                        );
                      })}
                    </span>
                  ) : (
                    guestShare && (
                      <span>
                        <strong>
                          Your share: {formatMoney(guestShare.amountCents)}
                        </strong>
                      </span>
                    )
                  )}
                </div>
                <div className="list-value">
                  {isHost
                    ? formatMoney(bill.totalCents)
                    : guestShare
                      ? formatMoney(guestShare.amountCents)
                      : formatMoney(0)}
                  <small>
                    {isVoided
                      ? "Voided"
                      : isHost
                        ? `${bill.shares.length} guest${bill.shares.length === 1 ? "" : "s"}`
                        : "Your share"}
                  </small>
                </div>
                {isHost && !isEnded && !isVoided && (
                  <div className="row-actions">
                    <button
                      className="mini-button danger"
                      type="button"
                      onClick={() =>
                        onVoidBill({
                          billId: bill._id,
                          title: bill.title,
                        })
                      }
                    >
                      Void bill
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function SplitBillModalForm({
  stay,
  guests,
  defaultTerms,
  asOfDate,
  submitting,
  onSubmit,
  onCancel,
}: {
  stay?: Doc<"stays">;
  guests: Member[];
  defaultTerms?: Doc<"terms"> | null;
  asOfDate: string | null;
  submitting?: boolean;
  onSubmit: (payload: SplitBillSubmission) => Promise<void>;
  onCancel: () => void;
}) {
  const defaultDate = asOfDate ?? defaultTerms?.startDate ?? "";
  const isSublease = stay?.arrangement === "sublease";
  const isPrivateRoomSublease = isSublease && stay?.subleaseLayout === "private_room";
  const roommateCount = stay?.roommateCount ?? 1;
  const totalShares = roommateCount + 1;
  const defaultGuestPercentage = (100 / totalShares).toFixed(1);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BillCategory>("electricity");
  const [serviceStart, setServiceStart] = useState(defaultDate);
  const [serviceEnd, setServiceEnd] = useState(defaultDate);
  const [totalDollars, setTotalDollars] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [splitMethod, setSplitMethod] = useState<BillSplitMethod>(
    isPrivateRoomSublease ? "percentage" : "equal",
  );
  const [includeHost, setIncludeHost] = useState(
    isPrivateRoomSublease ? true : !isSublease,
  );
  const [prorateByStayDates, setProrateByStayDates] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Id<"users">[]>(() =>
    guests.map((guest) => guest.person.id),
  );
  const [guestInputs, setGuestInputs] = useState<Record<string, string>>(() => {
    if (isPrivateRoomSublease) {
      const inputs: Record<string, string> = {};
      for (const guest of guests) {
        inputs[guest.person.id] = defaultGuestPercentage;
      }
      return inputs;
    }
    return {};
  });
  const [validationError, setValidationError] = useState("");

  function toggleGuest(guestId: Id<"users">) {
    setValidationError("");
    setSelectedGuestIds((prev) =>
      prev.includes(guestId)
        ? prev.filter((id) => id !== guestId)
        : [...prev, guestId],
    );
  }

  function updateGuestInput(guestId: Id<"users">, nextValue: string) {
    setValidationError("");
    setGuestInputs((prev) => ({
      ...prev,
      [guestId]: nextValue,
    }));
  }

  const effectiveIncludeHost = splitMethod === "fixed" ? false : includeHost;

  const selectedGuests = useMemo(
    () =>
      guests.filter((guest) => selectedGuestIds.includes(guest.person.id)),
    [guests, selectedGuestIds],
  );

  const preview = useMemo(() => {
    const parsedTotal = Number(totalDollars);
    const totalCents = Number.isFinite(parsedTotal)
      ? Math.round(parsedTotal * 100)
      : 0;
    if (!totalDollars.trim() || totalCents <= 0) {
      return { shares: null, error: null, totalCents: 0 };
    }
    if (!serviceStart || !serviceEnd) {
      return {
        shares: null,
        error: "Choose service start and end dates to preview shares.",
        totalCents,
      };
    }
    try {
      const participants = selectedGuests.map((guest) => {
        const guestTerms = guest.terms ?? defaultTerms;
        const stayStartDate = guestTerms?.startDate ?? serviceStart;
        const stayEndDate = guestTerms?.endDate ?? serviceEnd;
        const rawInput = guestInputs[guest.person.id] ?? "";
        const numericInput = Number(rawInput);
        const input =
          splitMethod === "percentage"
            ? rawInput.trim() === ""
              ? Number.NaN
              : numericInput
            : splitMethod === "fixed"
              ? rawInput.trim() === ""
                ? Number.NaN
                : Math.round(numericInput * 100)
              : undefined;
        return {
          guestUserId: guest.person.id,
          joinedAt: guest.membership.joinedAt,
          stayStartDate,
          stayEndDate,
          input,
        };
      });

      const shares = calculateBillShares({
        totalCents,
        serviceStart,
        serviceEnd,
        splitMethod,
        includeHost: effectiveIncludeHost,
        prorateByStayDates,
        guests: participants,
      });

      return { shares, error: null, totalCents };
    } catch (reason) {
      return {
        shares: null,
        error:
          reason instanceof Error
            ? reason.message
            : "Check the split inputs to preview guest shares.",
        totalCents,
      };
    }
  }, [
    totalDollars,
    serviceStart,
    serviceEnd,
    selectedGuests,
    defaultTerms,
    guestInputs,
    splitMethod,
    effectiveIncludeHost,
    prorateByStayDates,
  ]);

  const showEqualSplitNotice =
    splitMethod === "equal" &&
    (selectedGuests.length >= 2 ||
      (selectedGuests.length >= 1 && effectiveIncludeHost));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    if (!title.trim()) {
      setValidationError("Enter a title for this bill.");
      return;
    }
    if (!preview.shares || preview.error) {
      setValidationError(
        preview.error ?? "Enter a valid bill amount and guest split.",
      );
      return;
    }
    if (preview.shares.every((share) => share.amountCents <= 0)) {
      setValidationError("At least one guest share must be greater than $0.00.");
      return;
    }

    await onSubmit({
      title: title.trim(),
      category,
      serviceStart,
      serviceEnd,
      totalCents: preview.totalCents,
      dueDate,
      splitMethod,
      includeHost: effectiveIncludeHost,
      prorateByStayDates,
      guests: selectedGuests.map((guest) => {
        const rawInput = guestInputs[guest.person.id] ?? "";
        const numericInput = Number(rawInput);
        return {
          guestUserId: guest.person.id,
          ...(splitMethod === "percentage"
            ? { input: numericInput }
            : splitMethod === "fixed"
              ? { input: Math.round(numericInput * 100) }
              : {}),
        };
      }),
    });
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      {isSublease && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--paper, #f5f0e8)",
            borderRadius: "10px",
            fontSize: "0.85rem",
            lineHeight: 1.45,
            marginBottom: "1rem",
          }}
        >
          <strong>
            Sublease preset ({isPrivateRoomSublease ? "Private room" : "Whole place"}):
          </strong>{" "}
          {isPrivateRoomSublease
            ? `Preset to 1/${totalShares} (${defaultGuestPercentage}%) per room. Host is included on the ledger to absorb the remaining ${(100 - Number(defaultGuestPercentage) * guests.length).toFixed(1)}% off-ledger.`
            : "Host is excluded. Active guest(s) cover 100% of utilities."}
        </div>
      )}
      <div className="form-grid">
        <label className="full">
          <span>Bill title</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="October electricity bill"
            maxLength={120}
            required
          />
        </label>
        <label>
          <span>Category</span>
          <select
            name="category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as BillCategory)
            }
          >
            {BILL_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {BILL_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Total amount</span>
          <div className="money-input">
            <span>$</span>
            <input
              name="totalAmount"
              type="number"
              min="0.01"
              step="0.01"
              value={totalDollars}
              onChange={(event) => setTotalDollars(event.target.value)}
              placeholder="120.00"
              required
            />
          </div>
        </label>
        <label>
          <span>Service start date</span>
          <input
            name="serviceStart"
            type="date"
            value={serviceStart}
            onChange={(event) => setServiceStart(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Service end date</span>
          <input
            name="serviceEnd"
            type="date"
            value={serviceEnd}
            onChange={(event) => setServiceEnd(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Due date</span>
          <input
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Split method</span>
          <select
            name="splitMethod"
            value={splitMethod}
            onChange={(event) => {
              setValidationError("");
              setSplitMethod(event.target.value as BillSplitMethod);
            }}
          >
            <option value="equal">Equal</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        {splitMethod !== "fixed" && (
          <label className="check full">
            <input
              name="includeHost"
              type="checkbox"
              checked={includeHost}
              onChange={(event) => setIncludeHost(event.target.checked)}
            />
            <span>
              Include host in split (host share stays off guest ledgers)
            </span>
          </label>
        )}
        <label className="check full">
          <input
            name="prorateByStayDates"
            type="checkbox"
            checked={prorateByStayDates}
            onChange={(event) => setProrateByStayDates(event.target.checked)}
          />
          <span>Prorate by guest stay dates</span>
        </label>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <strong style={{ display: "block", marginBottom: "0.5rem" }}>
          Participating guests
        </strong>
        {guests.length === 0 ? (
          <p className="muted">
            Invite at least one active guest to this stay before splitting a
            bill.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "0.55rem",
            }}
          >
            {guests.map((guest) => {
              const guestId = guest.person.id;
              const checked = selectedGuestIds.includes(guestId);
              const guestName =
                guest.person.name && guest.person.name !== "Kouchd member"
                  ? guest.person.name
                  : "Guest";
              const guestTerms = guest.terms ?? defaultTerms;
              return (
                <div
                  key={guestId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "10px",
                    border: "1px solid var(--line)",
                    background: "var(--kouchd-surface, #faf8f5)",
                  }}
                >
                  <label
                    className="check"
                    style={{ margin: 0, flex: "1 1 auto" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGuest(guestId)}
                    />
                    <span>
                      <strong>{guestName}</strong>
                      {guestTerms && (
                        <small
                          className="muted"
                          style={{ display: "block", fontSize: "0.75rem" }}
                        >
                          Stay: {formatDate(guestTerms.startDate)} to{" "}
                          {formatDate(guestTerms.endDate)}
                        </small>
                      )}
                    </span>
                  </label>
                  {checked && splitMethod === "percentage" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        width: "120px",
                      }}
                    >
                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        aria-label={`${guestName} percentage`}
                        placeholder="50"
                        value={guestInputs[guestId] ?? ""}
                        onChange={(event) =>
                          updateGuestInput(guestId, event.target.value)
                        }
                        required
                      />
                      <span>%</span>
                    </div>
                  )}
                  {checked && splitMethod === "fixed" && (
                    <div className="money-input" style={{ width: "130px" }}>
                      <span>$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        aria-label={`${guestName} fixed share`}
                        placeholder="40.00"
                        value={guestInputs[guestId] ?? ""}
                        onChange={(event) =>
                          updateGuestInput(guestId, event.target.value)
                        }
                        required
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showEqualSplitNotice && (
        <p
          className="muted modal-note"
          role="note"
          style={{
            marginTop: "0.85rem",
            padding: "0.65rem 0.85rem",
            borderRadius: "10px",
            border: "1px solid var(--line)",
            background: "var(--kouchd-surface, #eef6f0)",
            color: "var(--ink)",
          }}
        >
          In an equal split, guests can work out each other&apos;s share from
          the bill total.
        </p>
      )}

      <div
        style={{
          marginTop: "0.85rem",
          padding: "0.8rem 0.9rem",
          borderRadius: "10px",
          border: "1px solid var(--line)",
          background: "var(--kouchd-surface, #faf8f5)",
        }}
      >
        <strong style={{ display: "block", marginBottom: "0.35rem" }}>
          Share preview
        </strong>
        {preview.shares ? (
          <div style={{ display: "grid", gap: "0.3rem" }}>
            {preview.shares.map((share) => {
              const guest = guests.find(
                (item) => item.person.id === share.guestUserId,
              );
              const guestName =
                guest?.person.name && guest.person.name !== "Kouchd member"
                  ? guest.person.name
                  : "Guest";
              return (
                <div
                  key={share.guestUserId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                  }}
                >
                  <span>
                    {guestName}
                    {share.prorationDays !== undefined
                      ? ` (${share.prorationDays} overlap day${share.prorationDays === 1 ? "" : "s"})`
                      : ""}
                  </span>
                  <strong>{formatMoney(share.amountCents)}</strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {preview.error ??
              "Enter a bill total and select guests to preview each share."}
          </p>
        )}
      </div>

      {validationError && (
        <p className="form-error" role="alert">
          {validationError}
        </p>
      )}

      <p className="muted modal-note">
        Posting a split bill adds an entry to each selected guest&apos;s
        Ledger. Kouchd records each share and never moves money directly.
      </p>

      <div className="dialog-actions">
        <button
          className="button ghost"
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          className="button primary"
          type="submit"
          disabled={submitting || guests.length === 0}
        >
          {submitting ? "Posting..." : "Post bill split"}
        </button>
      </div>
    </form>
  );
}
