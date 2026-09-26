"use client";

import { FormEvent, useState } from "react";

import type { Doc } from "@/convex/_generated/dataModel";

export type GuestTerms = Pick<Doc<"terms">,
  "startDate" | "endDate" | "cadence" | "rateCents" | "earlyDiscountPercentage" | "earlyDiscountDays" | "lateFeeCents" | "graceDays" | "houseNotes" | "houseRules" | "rewards"
> & { earlyDiscountEnabled: boolean; lateFeeEnabled: boolean };

export function GuestAgreementForm({
  terms,
  guestName,
  onSubmit,
  onCancel,
}: {
  terms: Doc<"terms">;
  guestName: string;
  onSubmit: (terms: GuestTerms) => Promise<void>;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [cadence, setCadence] = useState(terms.cadence);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const earlyDiscountEnabled = form.get("earlyDiscountEnabled") === "on";
    const lateFeeEnabled = form.get("lateFeeEnabled") === "on";
    try {
      await onSubmit({
        startDate: String(form.get("startDate") ?? ""),
        endDate: String(form.get("endDate") ?? ""),
        cadence: String(form.get("cadence")) as "daily" | "weekly",
        rateCents: Math.round(Number(form.get("rate")) * 100),
        earlyDiscountEnabled,
        earlyDiscountPercentage: earlyDiscountEnabled ? Number(form.get("earlyDiscountPercentage")) : 0,
        earlyDiscountDays: earlyDiscountEnabled ? Number(form.get("earlyDiscountDays")) : 0,
        lateFeeEnabled,
        lateFeeCents: lateFeeEnabled ? Math.round(Number(form.get("lateFee")) * 100) : 0,
        graceDays: lateFeeEnabled ? Number(form.get("graceDays")) : 0,
        houseNotes: terms.houseNotes,
        houseRules: terms.houseRules,
        rewards: terms.rewards,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the guest agreement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="muted">Update {guestName}&apos;s agreement. The guest will be asked to review and accept this version. Household rules remain shared.</p>
      <div className="form-grid">
        <label><span>Start date</span><input name="startDate" type="date" defaultValue={terms.startDate} required /></label>
        <label><span>End date</span><input name="endDate" type="date" defaultValue={terms.endDate} required /></label>
        <label><span>Contribution cadence</span><select name="cadence" value={cadence} onChange={(event) => setCadence(event.target.value as "daily" | "weekly")}><option value="weekly">Weekly</option><option value="daily">Daily</option></select></label>
        <label><span>Amount per {cadence === "weekly" ? "week" : "day"}</span><div className="money-input"><span>$</span><input name="rate" type="number" min="0" step="0.01" defaultValue={(terms.rateCents / 100).toFixed(2)} required /></div></label>
        <label className="check full"><input name="earlyDiscountEnabled" type="checkbox" defaultChecked={terms.earlyDiscountEnabled ?? terms.earlyDiscountPercentage > 0} /><span>Offer an early contribution discount</span></label>
        <label><span>Early discount (%)</span><input name="earlyDiscountPercentage" type="number" min="0" max="100" defaultValue={terms.earlyDiscountPercentage} /></label>
        <label><span>Days before due date</span><input name="earlyDiscountDays" type="number" min="0" max="365" defaultValue={terms.earlyDiscountDays} /></label>
        <label className="check full"><input name="lateFeeEnabled" type="checkbox" defaultChecked={terms.lateFeeEnabled ?? terms.lateFeeCents > 0} /><span>Apply a recurring late fee after the grace period</span></label>
        <label><span>Late fee per week</span><div className="money-input"><span>$</span><input name="lateFee" type="number" min="0" step="0.01" defaultValue={(terms.lateFeeCents / 100).toFixed(2)} /></div></label>
        <label><span>Grace days</span><input name="graceDays" type="number" min="0" max="365" defaultValue={terms.graceDays} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button className="button ghost" type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button className="button primary" type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save guest agreement"}</button>
      </div>
    </form>
  );
}
