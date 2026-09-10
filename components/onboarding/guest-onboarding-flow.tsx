"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Coins, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function GuestOnboardingFlow({
  stayId,
  onComplete,
  onCancel,
}: {
  stayId: Id<"stays">;
  onComplete: () => void;
  onCancel?: () => void;
}) {
  const bundle = useQuery(api.stays.getBundle, { stayId });
  const acceptTerms = useMutation(api.terms.acceptCurrent);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!bundle) {
    return <div className="route-state">Loading household agreement...</div>;
  }

  const { stay, terms, members } = bundle;
  const host = members.find((m: { membership: { role: string } }) => m.membership.role === "host")?.person;
  const houseRules = terms?.houseRules ?? [];
  const rewards = terms?.rewards;

  async function handleAccept() {
    setSubmitting(true);
    setError("");
    try {
      await acceptTerms({ stayId });
      onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not accept agreement");
      setSubmitting(false);
    }
  }

  return (
    <div className="setup-card" style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Progress Indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              style={{
                width: 42,
                height: 6,
                borderRadius: 3,
                background: s <= step ? "var(--green, #184f3a)" : "var(--line, #e2ded7)",
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: "0.8rem", color: "var(--muted, #6f6b64)", fontWeight: 600 }}>
          Step {step} of 4
        </span>
      </div>

      {/* Step 1: Welcome & Household Summary */}
      {step === 1 && (
        <div>
          <p className="eyebrow">Step 1 of 4 · Welcome</p>
          <h1>Welcome to the household.</h1>
          <p className="subhead">
            Hosted by <strong>{host?.name ?? "Host"}</strong>. Review the terms and house rules established for this shared stay.
          </p>

          <div
            style={{
              marginTop: "1.5rem",
              border: "1px solid var(--line, #e2ded7)",
              borderRadius: "16px",
              padding: "1.5rem",
              background: "#faf8f5",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--green, #184f3a)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                }}
              >
                {host?.name?.[0] ?? "H"}
              </div>
              <div>
                <strong style={{ fontSize: "1.05rem", display: "block" }}>{host?.name ?? "Host"}</strong>
                <span style={{ fontSize: "0.85rem", color: "var(--muted, #6f6b64)" }}>Household Organizer</span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "1rem",
                borderTop: "1px solid var(--line, #e2ded7)",
                paddingTop: "1rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Stay Window
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700 }}>
                  {terms?.startDate ?? "Start"} to {terms?.endDate ?? "End"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Household Timezone
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700 }}>{stay.timezone}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Members
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700 }}>{members.length} people</p>
              </div>
            </div>
          </div>

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            {onCancel && (
              <button className="button ghost" type="button" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button className="button primary" type="button" onClick={() => setStep(2)}>
              Next: Review House Rules <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: House Rules & Expectations */}
      {step === 2 && (
        <div>
          <p className="eyebrow">Step 2 of 4 · Living Expectations</p>
          <h1>House Rules and Boundaries</h1>
          <p className="subhead">
            The host set these guidelines to ensure mutual respect, peace of mind, and shared comfort.
          </p>

          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {houseRules.length > 0 ? (
              houseRules.map((rule: { id: string; title: string; description: string }, idx: number) => (
                <div
                  key={rule.id}
                  style={{
                    border: "1px solid var(--line, #e2ded7)",
                    borderRadius: "12px",
                    padding: "1rem 1.25rem",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 800, color: "var(--green, #184f3a)" }}>{idx + 1}.</span>
                    <div>
                      <strong style={{ fontSize: "0.92rem", display: "block" }}>{rule.title}</strong>
                      <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--muted, #6f6b64)" }}>
                        {rule.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  border: "1px solid var(--line, #e2ded7)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  background: "#fff",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted, #6f6b64)" }}>
                  {terms?.houseNotes || "Standard household courtesy applies."}
                </p>
              </div>
            )}

            <label
              className="check full"
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "12px",
                background: "#f3f8f4",
                border: "1px solid #b8d2c1",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={rulesAcknowledged}
                onChange={(e) => setRulesAcknowledged(e.target.checked)}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                I have read, understand, and agree to follow these house rules throughout my stay.
              </span>
            </label>
          </div>

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            <button className="button ghost" type="button" onClick={() => setStep(1)}>
              <ArrowLeft size={18} /> Back
            </button>
            <button
              className="button primary"
              type="button"
              disabled={!rulesAcknowledged}
              onClick={() => setStep(3)}
            >
              Next: Financial Terms <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Financial Terms & Contribution Opportunities */}
      {step === 3 && (
        <div>
          <p className="eyebrow">Step 3 of 4 · Financial Agreement</p>
          <h1>Financial Terms & Rewards</h1>
          <p className="subhead">
            Clear numbers with zero hidden spreadsheet formulas.
          </p>

          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
                border: "1px solid var(--line, #e2ded7)",
                borderRadius: "14px",
                padding: "1.25rem",
                background: "#fff",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Agreed Rate
                </span>
                <p style={{ margin: "2px 0 0", fontSize: "1.2rem", fontWeight: 800 }}>
                  {money.format((terms?.rateCents ?? 0) / 100)} / {terms?.cadence === "weekly" ? "week" : "day"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Early Discount
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700 }}>
                  {terms?.earlyDiscountEnabled ? `${terms.earlyDiscountPercentage}% off (${terms.earlyDiscountDays} days early)` : "Off"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Late Fee Policy
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700 }}>
                  {terms?.lateFeeEnabled ? `${money.format(terms.lateFeeCents / 100)} after ${terms.graceDays} days grace` : "Off"}
                </p>
              </div>
            </div>

            {/* Contribution Points System Banner */}
            {rewards?.enabled && (
              <div
                style={{
                  border: "1px solid #b8d2c1",
                  borderRadius: "14px",
                  padding: "1.25rem",
                  background: "#eaf4ec",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                  <Coins size={22} color="var(--green, #184f3a)" />
                  <strong style={{ fontSize: "0.95rem", color: "var(--green, #184f3a)" }}>
                    Earn {rewards.coinName} toward your stay cost!
                  </strong>
                </div>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.86rem", color: "#2d4438" }}>
                  The host has enabled contribution rewards. You can complete household tasks (like deep cleaning, yard care, cooking communal meals, or supply runs) to earn {rewards.coinName}.
                </p>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem", fontWeight: 600, color: "#184f3a" }}>
                  <span>• 1 {rewards.coinName} = ${((rewards.centsPerPoint ?? 100) / 100).toFixed(2)} financial credit</span>
                  {rewards.maxCreditPerPeriodCents > 0 && (
                    <span>• Up to ${((rewards.maxCreditPerPeriodCents ?? 0) / 100).toFixed(2)} deduction per {terms?.cadence === "weekly" ? "week" : "day"}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            <button className="button ghost" type="button" onClick={() => setStep(2)}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="button primary" type="button" onClick={() => setStep(4)}>
              Next: Confirm & Accept <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Digital Signature & Acceptance */}
      {step === 4 && (
        <div>
          <p className="eyebrow">Step 4 of 4 · Final Acceptance</p>
          <h1>Join the Stay.</h1>
          <p className="subhead">
            By accepting, your spot in the household is confirmed, your private financial ledger is initialized, and shared chore/announcement tools become active.
          </p>

          <div
            style={{
              marginTop: "1.5rem",
              border: "1px solid var(--line, #e2ded7)",
              borderRadius: "16px",
              padding: "1.5rem",
              background: "#faf8f5",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <ShieldCheck size={24} color="var(--green, #184f3a)" />
              <strong style={{ fontSize: "1rem" }}>Private & Bilateral Guarantee</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted, #6f6b64)", lineHeight: 1.5 }}>
              Your financial balance, payments, and points redemptions are private between you and your host. Other guests cannot view your ledger.
            </p>
          </div>

          {error && <p className="form-error" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            <button className="button ghost" type="button" onClick={() => setStep(3)} disabled={submitting}>
              <ArrowLeft size={18} /> Back
            </button>
            <button
              className="button primary"
              type="button"
              onClick={handleAccept}
              disabled={submitting}
            >
              <CheckCircle2 size={18} />
              {submitting ? "Accepting terms..." : "Accept Terms & Enter Household"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
