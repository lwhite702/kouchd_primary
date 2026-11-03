"use client";

import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface DepositRecordCardProps {
  stayId: Id<"stays">;
  isHost: boolean;
  isSublease: boolean;
  isLocked?: boolean;
  guestUserId?: Id<"users">;
  onNotify?: (message: string) => void;
}

export function DepositRecordCard({
  stayId,
  isHost,
  isSublease,
  isLocked = false,
  guestUserId,
  onNotify,
}: DepositRecordCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [deductionDesc, setDeductionDesc] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [disputeNote, setDisputeNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deposit = useQuery(api.deposits.getByStay, {
    stayId,
    guestUserId,
  });

  const proposeDeductions = useMutation(api.deposits.proposeDeductions);
  const respondDeposit = useMutation(api.deposits.respond);

  if (!isSublease) return null;

  const handleProposeDeductions = async () => {
    if (!deposit) return;
    const amountCents = Math.round(parseFloat(deductionAmount || "0") * 100);
    if (amountCents <= 0 || !deductionDesc.trim()) {
      onNotify?.("Enter a valid deduction description and amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const existing = deposit.deductions ?? [];
      const updated = [
        ...existing,
        {
          id: `deduct_${Date.now()}`,
          description: deductionDesc.trim(),
          amountCents,
        },
      ];
      await proposeDeductions({
        depositId: deposit._id,
        deductions: updated,
      });
      onNotify?.("Deduction proposed for move-out deposit reconciliation.");
      setDeductionDesc("");
      setDeductionAmount("");
      setShowAddDeduction(false);
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Failed to propose deduction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (action: "confirm" | "dispute") => {
    if (!deposit) return;
    setIsSubmitting(true);
    try {
      await respondDeposit({
        depositId: deposit._id,
        action,
        disputeNote: disputeNote.trim() ? disputeNote.trim() : undefined,
      });
      onNotify?.(
        action === "confirm"
          ? "Deposit return confirmed."
          : "Deposit dispute recorded.",
      );
      setDisputeNote("");
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Failed to respond to deposit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="house-card deposit-card" style={{ marginTop: 16 }}>
      <div
        className="house-card-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="house-icon access">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="overline" style={{ margin: 0 }}>Sublease Records</p>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Security Deposit Record</h3>
          </div>
        </div>
        <button
          type="button"
          aria-label={expanded ? "Collapse deposit section" : "Expand deposit section"}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="house-card-body" style={{ marginTop: 12 }}>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              marginBottom: 16,
              fontSize: "0.85rem",
              color: "var(--muted)",
              lineHeight: 1.4,
            }}
          >
            <strong>Deposit record boundary:</strong> Kouchd provides shared household documentation only. Kouchd does not hold, collect, or transfer security deposit funds, and deposit records never alter rent balances.
          </div>

          {!deposit ? (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <p style={{ color: "var(--muted)", margin: 0 }}>
                No security deposit recorded for this sublease yet.
              </p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ padding: 12, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--line)" }}>
                  <p className="overline" style={{ margin: 0, fontSize: "0.75rem" }}>Deposit Amount</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "1.2rem", fontWeight: 700, color: "var(--ink)" }}>
                    ${(deposit.amountCents / 100).toFixed(2)}
                  </p>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--line)" }}>
                  <p className="overline" style={{ margin: 0, fontSize: "0.75rem" }}>Held By</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "1rem", fontWeight: 600, textTransform: "capitalize", color: "var(--ink)" }}>
                    {deposit.holder}
                  </p>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--line)" }}>
                  <p className="overline" style={{ margin: 0, fontSize: "0.75rem" }}>Agreed Return Date</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "1rem", fontWeight: 600, color: "var(--ink)" }}>
                    {deposit.agreedReturnDate}
                  </p>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--line)" }}>
                  <p className="overline" style={{ margin: 0, fontSize: "0.75rem" }}>Status</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "1rem", fontWeight: 600, textTransform: "capitalize", color: deposit.status === "returned" ? "var(--green)" : "var(--forest)" }}>
                    {deposit.status.replace("_", " ")}
                  </p>
                </div>
              </div>

              {deposit.deductions && deposit.deductions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "var(--forest)" }}>
                    Itemized Deductions
                  </h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {(
                      deposit.deductions as Array<{
                        id: string;
                        description: string;
                        amountCents: number;
                        disputed?: boolean;
                        disputeReason?: string;
                      }>
                    ).map((deduct) => (
                      <li
                        key={deduct.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 0",
                          borderBottom: "1px solid var(--line)",
                          fontSize: "0.9rem",
                        }}
                      >
                        <div>
                          <span>{deduct.description}</span>
                          {deduct.disputeReason && (
                            <p style={{ margin: "2px 0 0 0", color: "var(--red)", fontSize: "0.8rem" }}>
                              Dispute: {deduct.disputeReason}
                            </p>
                          )}
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          -${(deduct.amountCents / 100).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isHost && !isLocked && deposit.status !== "returned" && (
                <div style={{ marginTop: 12 }}>
                  {!showAddDeduction ? (
                    <button
                      type="button"
                      onClick={() => setShowAddDeduction(true)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      + Propose Move-out Deduction
                    </button>
                  ) : (
                    <div style={{ padding: 12, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--line)" }}>
                      <h5 style={{ margin: "0 0 8px 0" }}>Propose Deposit Deduction</h5>
                      <input
                        type="text"
                        placeholder="Description (e.g. Cleaning fee)"
                        value={deductionDesc}
                        onChange={(e) => setDeductionDesc(e.target.value)}
                        style={{ width: "100%", padding: 6, marginBottom: 8, borderRadius: 4, border: "1px solid var(--line)" }}
                      />
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={deductionAmount}
                        onChange={(e) => setDeductionAmount(e.target.value)}
                        style={{ width: "100%", padding: 6, marginBottom: 8, borderRadius: 4, border: "1px solid var(--line)" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={handleProposeDeductions}
                          disabled={isSubmitting}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            background: "var(--forest)",
                            color: "#fff",
                            border: "none",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Save Deduction
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddDeduction(false)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isHost && !isLocked && (deposit.status === "refund_pending" || deposit.status === "recorded") && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 8px 0" }}>
                    Confirm your deposit return or record a dispute note regarding proposed deductions.
                  </p>
                  <textarea
                    placeholder="Optional dispute explanation..."
                    value={disputeNote}
                    onChange={(e) => setDisputeNote(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      marginBottom: 8,
                      fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleRespond("confirm")}
                      disabled={isSubmitting}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        background: "var(--forest)",
                        color: "#fff",
                        border: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Confirm Deposit Return
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond("dispute")}
                      disabled={isSubmitting}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        background: "var(--surface)",
                        color: "var(--ink)",
                        border: "1px solid var(--line)",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Dispute Deductions
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
