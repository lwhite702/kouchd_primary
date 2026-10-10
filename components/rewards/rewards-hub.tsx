"use client";

import { useMutation, useQuery } from "convex/react";
import { Coins, DollarSign, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { calculateMaxRedeemablePoints, pointsToCents } from "@/lib/domain/rewards";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function RewardsHub({
  stayId,
  isHost,
  selectedGuestId,
  currentBalanceCents = 0,
  readOnly = false,
  onNotify,
}: {
  stayId: Id<"stays">;
  isHost: boolean;
  selectedGuestId?: Id<"users">;
  currentBalanceCents?: number;
  readOnly?: boolean;
  onNotify: (msg: string) => void;
}) {
  const wallet = useQuery(api.rewards.getWallet, { stayId, guestUserId: selectedGuestId });
  const rules = useQuery(api.rewards.listRules, { stayId }) as Array<Doc<"contributionRules">> | undefined;

  const submitClaim = useMutation(api.rewards.submitClaim);
  const confirmClaim = useMutation(api.rewards.confirmClaim);
  const disputeClaim = useMutation(api.rewards.disputeClaim);
  const redeem = useMutation(api.rewards.redeem);
  const createRule = useMutation(api.rewards.createRule);
  const toggleRule = useMutation(api.rewards.toggleRule);

  const [modal, setModal] = useState<"claim" | "redeem" | "new_rule" | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [claimTitle, setClaimTitle] = useState("");
  const [claimPoints, setClaimPoints] = useState("25");
  const [claimNote, setClaimNote] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const settings = wallet?.settings;
  const isEnabled = settings?.enabled;
  const coinName = settings?.coinName ?? "Coins";
  const centsPerPoint = settings?.centsPerPoint ?? 100;

  // Active rules for claim selector
  const activeRules = useMemo(() => (rules ?? []).filter((r) => r.isActive), [rules]);

  // Max points redeemable
  const { maxPoints, maxCents } = useMemo(() => {
    if (!wallet) return { maxPoints: 0, maxCents: 0 };
    return calculateMaxRedeemablePoints({
      availablePoints: wallet.availablePoints,
      centsPerPoint,
      maxCreditPerPeriodCents: settings?.maxCreditPerPeriodCents,
      currentBalanceCents: Math.max(0, currentBalanceCents),
    });
  }, [wallet, centsPerPoint, settings, currentBalanceCents]);

  if (!isEnabled) return null;

  async function handleClaimSubmit(e: FormEvent) {
    e.preventDefault();
    if (!claimTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await submitClaim({
        stayId,
        ruleId: (selectedRuleId as Id<"contributionRules">) || undefined,
        title: claimTitle.trim(),
        points: Math.max(1, Number(claimPoints)),
        note: claimNote.trim(),
        date: today,
      });
      setModal(null);
      setClaimTitle("");
      setClaimNote("");
      setSelectedRuleId("");
      onNotify("Contribution claim submitted for host confirmation.");
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Could not submit claim");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRedeemSubmit(e: FormEvent) {
    e.preventDefault();
    const points = Number(redeemPoints);
    if (!points || points <= 0) return;
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await redeem({
        stayId,
        points,
        date: today,
      });
      setModal(null);
      setRedeemPoints("");
      onNotify(`Redeemed ${res.pointsRedeemed} ${coinName} for ${money.format(res.amountCents / 100)} stay credit!`);
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Could not redeem points");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddRule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      await createRule({
        stayId,
        title: String(form.get("title") ?? "").trim(),
        category: form.get("category") as "cleaning" | "groceries" | "maintenance" | "cooking" | "care" | "other",
        pointsAwarded: Number(form.get("points") ?? 20),
        description: String(form.get("description") ?? "").trim(),
      });
      setModal(null);
      onNotify("New contribution rule created.");
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Could not create rule");
    } finally {
      setIsSubmitting(false);
    }
  }

  const claims = wallet?.claims ?? [];
  const pendingClaims = claims.filter((c: { status: string }) => c.status === "pending");

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Wallet / Overview Card */}
      <article
        className="metric-card"
        style={{
          border: "1px solid #b8d2c1",
          background: "linear-gradient(135deg, #eef6f0 0%, #faf8f5 100%)",
          padding: "1.25rem",
          borderRadius: "16px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Coins size={20} color="var(--green, #184f3a)" />
              <p className="overline" style={{ margin: 0 }}>Contribution {coinName}</p>
            </div>
            <p className="metric" style={{ marginTop: "0.4rem", fontSize: "2rem" }}>
              {wallet?.availablePoints ?? 0}{" "}
              <small style={{ fontSize: "0.9rem", color: "var(--muted, #6f6b64)", fontWeight: 500 }}>
                {coinName} ({money.format((wallet?.dollarEquivalentCents ?? 0) / 100)} value)
              </small>
            </p>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
              {wallet?.earnedPoints ?? 0} earned · {wallet?.redeemedPoints ?? 0} redeemed for stay credit
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {!isHost && !readOnly && (
              <>
                <button
                  className="button soft"
                  type="button"
                  onClick={() => setModal("claim")}
                  style={{ fontSize: "0.85rem" }}
                >
                  <Plus size={16} /> Claim task
                </button>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    setRedeemPoints(String(maxPoints));
                    setModal("redeem");
                  }}
                  disabled={maxPoints <= 0}
                  style={{ fontSize: "0.85rem" }}
                >
                  <DollarSign size={16} /> Redeem for credit
                </button>
              </>
            )}
            {isHost && !readOnly && (
              <button
                className="button soft"
                type="button"
                onClick={() => setModal("new_rule")}
                style={{ fontSize: "0.85rem" }}
              >
                <Plus size={16} /> Add rule
              </button>
            )}
          </div>
        </div>

        {/* Host Approval Queue Alert */}
        {isHost && !readOnly && pendingClaims.length > 0 && (
          <div
            style={{
              marginTop: "1rem",
              borderTop: "1px solid #b8d2c1",
              paddingTop: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--green, #184f3a)" }}>
              {pendingClaims.length} contribution claim{pendingClaims.length === 1 ? "" : "s"} waiting for your review
            </span>
          </div>
        )}
      </article>

      {/* Claims List / Activity */}
      {claims.length > 0 && (
        <section className="section-block" style={{ marginTop: "1.5rem" }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Task Claims</p>
              <h2>Household Contributions</h2>
            </div>
          </div>
          <div className="activity-list">
            {claims.map((claim: Doc<"pointClaims">) => (
              <article className="list-row" key={claim._id} style={{ alignItems: "center" }}>
                <span className="list-icon" style={{ background: claim.status === "confirmed" ? "#eef6f0" : "#faf8f5" }}>
                  <Coins size={18} color={claim.status === "confirmed" ? "var(--green, #184f3a)" : "#6f6b64"} />
                </span>
                <div className="list-copy">
                  <strong>
                    {claim.title} (+{claim.points} {coinName})
                  </strong>
                  <span>{claim.note || "No details provided"} · {claim.status}</span>
                </div>
                <div className="list-value">
                  <small>{claim.date}</small>
                </div>
                {isHost && !readOnly && claim.status === "pending" && (
                  <div className="row-actions" style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      className="mini-button"
                      type="button"
                      onClick={() => void confirmClaim({ claimId: claim._id }).then(() => onNotify("Claim approved & points awarded."))}
                    >
                      Approve
                    </button>
                    <button
                      className="mini-button"
                      type="button"
                      onClick={() => void disputeClaim({ claimId: claim._id }).then(() => onNotify("Claim marked for discussion."))}
                    >
                      Dispute
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Available Contribution Rules Catalog */}
      <section className="section-block" style={{ marginTop: "1.5rem" }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Rewards Catalog</p>
            <h2>Ways to Earn {coinName}</h2>
          </div>
          {isHost && !readOnly && (
            <button className="mini-button" type="button" onClick={() => setModal("new_rule")}>
              <Plus size={14} /> Add task
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "0.75rem" }}>
          {(rules ?? []).map((rule) => (
            <div
              key={rule._id}
              style={{
                border: "1px solid var(--line, #e2ded7)",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
                background: rule.isActive ? "#fff" : "#faf8f5",
                opacity: rule.isActive ? 1 : 0.6,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <strong style={{ fontSize: "0.88rem" }}>{rule.title}</strong>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "var(--green, #184f3a)",
                      background: "rgba(24, 79, 58, 0.08)",
                      padding: "2px 8px",
                      borderRadius: "99px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    +{rule.pointsAwarded} {coinName}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--muted, #6f6b64)" }}>
                  {rule.description}
                </p>
              </div>

              {isHost && !readOnly && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--line, #e2ded7)", paddingTop: "0.4rem", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="text-button"
                    type="button"
                    style={{ fontSize: "0.75rem" }}
                    onClick={() => void toggleRule({ ruleId: rule._id })}
                  >
                    {rule.isActive ? "Disable task" : "Enable task"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Modal: Claim Task */}
      {modal === "claim" && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <section className="modal-card" role="dialog" aria-modal="true">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Contribution Claim</p>
                <h2>Claim a completed task</h2>
              </div>
              <button className="icon-button compact" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleClaimSubmit}>
              <div className="form-grid">
                <label className="full">
                  <span>Select from household tasks</span>
                  <select
                    value={selectedRuleId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedRuleId(id);
                      const match = activeRules.find((r) => r._id === id);
                      if (match) {
                        setClaimTitle(match.title);
                        setClaimPoints(String(match.pointsAwarded));
                      }
                    }}
                  >
                    <option value="">-- Choose an established task or enter below --</option>
                    {activeRules.map((rule) => (
                      <option value={rule._id} key={rule._id}>
                        {rule.title} (+{rule.pointsAwarded} {coinName})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  <span>Task description / title</span>
                  <input
                    type="text"
                    required
                    value={claimTitle}
                    onChange={(e) => setClaimTitle(e.target.value)}
                    placeholder="e.g. Deep cleaned common stove and sink"
                  />
                </label>
                <label>
                  <span>{coinName} requested</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={claimPoints}
                    onChange={(e) => setClaimPoints(e.target.value)}
                  />
                </label>
                <label className="full">
                  <span>Notes / proof / context</span>
                  <input
                    type="text"
                    value={claimNote}
                    onChange={(e) => setClaimNote(e.target.value)}
                    placeholder="e.g. Degreased pans and restocked dish towels"
                  />
                </label>
              </div>
              <div className="dialog-actions" style={{ marginTop: "1.5rem" }}>
                <button className="button ghost" type="button" onClick={() => setModal(null)} disabled={isSubmitting}>Cancel</button>
                <button className="button primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Redeem Points */}
      {modal === "redeem" && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <section className="modal-card" role="dialog" aria-modal="true">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Redeem {coinName}</p>
                <h2>Turn {coinName} into stay credit</h2>
              </div>
              <button className="icon-button compact" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleRedeemSubmit}>
              <div
                style={{
                  border: "1px solid #b8d2c1",
                  borderRadius: "14px",
                  padding: "1rem",
                  background: "#eef6f0",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#2d4438" }}>
                  Each {coinName.slice(0, -1) || "coin"} is worth <strong>{money.format(centsPerPoint / 100)}</strong> credit toward your stay ledger.
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", fontWeight: 700, color: "var(--green, #184f3a)" }}>
                  Maximum redeemable now: {maxPoints} {coinName} ({money.format(maxCents / 100)})
                </p>
              </div>

              <div className="form-grid">
                <label className="full">
                  <span>Points to redeem</span>
                  <input
                    type="number"
                    min="1"
                    max={maxPoints}
                    required
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value)}
                  />
                </label>
                {Number(redeemPoints) > 0 && (
                  <div className="estimate-card full">
                    <span>Financial Credit Applied to Stay Balance</span>
                    <strong>{money.format(pointsToCents(Number(redeemPoints), centsPerPoint) / 100)}</strong>
                    <small>Immediately applied to your oldest due obligation on the ledger.</small>
                  </div>
                )}
              </div>

              <div className="dialog-actions" style={{ marginTop: "1.5rem" }}>
                <button className="button ghost" type="button" onClick={() => setModal(null)} disabled={isSubmitting}>Cancel</button>
                <button className="button primary" type="submit" disabled={isSubmitting || !Number(redeemPoints) || Number(redeemPoints) > maxPoints}>
                  {isSubmitting ? "Redeeming..." : "Redeem Credit"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Add Rule (Host) */}
      {modal === "new_rule" && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <section className="modal-card" role="dialog" aria-modal="true">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Household Catalog</p>
                <h2>Create a new contribution task</h2>
              </div>
              <button className="icon-button compact" type="button" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleAddRule}>
              <div className="form-grid">
                <label className="full">
                  <span>Task title</span>
                  <input name="title" required placeholder="e.g. Wash and fold common kitchen towels" />
                </label>
                <label>
                  <span>Category</span>
                  <select name="category">
                    <option value="cleaning">Cleaning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="groceries">Groceries</option>
                    <option value="cooking">Cooking</option>
                    <option value="care">Care & Support</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  <span>{coinName} awarded</span>
                  <input name="points" type="number" min="1" defaultValue="20" required />
                </label>
                <label className="full">
                  <span>Task expectations / details</span>
                  <textarea name="description" rows={3} placeholder="Provide clear expectations for when this task is considered complete." />
                </label>
              </div>
              <div className="dialog-actions" style={{ marginTop: "1.5rem" }}>
                <button className="button ghost" type="button" onClick={() => setModal(null)} disabled={isSubmitting}>Cancel</button>
                <button className="button primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
