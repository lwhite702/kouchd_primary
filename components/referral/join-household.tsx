"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Coins, KeyRound } from "lucide-react";
import { FormEvent, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeReferralCode } from "@/lib/referral";
import { HelpTip } from "@/components/onboarding/help-tip";
import { HELP_LINKS } from "@/lib/help-links";
import { planLimitError, STAY_FULL_MESSAGE } from "@/lib/planLimitError";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function JoinHouseholdCard({
  onJoined,
  onCancel,
}: {
  onJoined: (stayId: Id<"stays">) => void;
  onCancel?: () => void;
}) {
  const joinWithCode = useMutation(api.referral.joinWithCode);
  const recordBlockedJoin = useMutation(api.subscriptions.recordBlockedJoin);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const normalized = normalizeReferralCode(code);
  const shouldPreview = normalized.length >= 7; // e.g. KCH-XXXX

  const preview = useQuery(
    api.referral.preview,
    shouldPreview ? { referralCode: normalized } : "skip"
  );

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!normalized) return;
    setJoining(true);
    setJoinError("");
    try {
      const result = await joinWithCode({ referralCode: normalized });
      onJoined(result.stayId);
    } catch (reason) {
      if (planLimitError(reason)) {
        setJoinError(STAY_FULL_MESSAGE);
        // Lets the host see who tried to join; failure here is not the guest's problem.
        void recordBlockedJoin({ referralCode: normalized }).catch(() => undefined);
      } else {
        setJoinError(reason instanceof Error ? reason.message : "Could not join with this code");
      }
      setJoining(false);
    }
  }

  return (
    <div className="setup-card" style={{ maxWidth: 580, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
        <KeyRound size={20} color="var(--green, #184f3a)" />
        <p className="eyebrow" style={{ margin: 0 }}>Join a Household</p>
      </div>
      <h1>Enter your referral code.</h1>
      <p className="subhead onboarding-eyebrow">
        Ask your host or housemate for their household referral code (starts with KCH-).
        <HelpTip title="Join the right household" href={HELP_LINKS.joiningAStay}>Enter the code your host shared. Check the preview for the host and stay details before joining.</HelpTip>
      </p>

      <form onSubmit={handleJoin} style={{ marginTop: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "1rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>Household Referral Code</span>
          <input
            type="text"
            placeholder="e.g. KCH-AB12CD"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              letterSpacing: "1.5px",
              padding: "0.75rem 1rem",
              marginTop: "0.4rem",
              width: "100%",
              borderRadius: "10px",
              border: "1px solid var(--line, #e2ded7)",
            }}
            required
          />
        </label>

        {/* Live Preview of the Household */}
        {shouldPreview && preview && (
          <div style={{ marginTop: "1rem" }}>
            {preview.valid ? (
              <div
                style={{
                  border: "1px solid #b8d2c1",
                  borderRadius: "14px",
                  padding: "1.25rem",
                  background: "#eef6f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--green, #184f3a)", fontWeight: 800 }}>
                    Household Match Found
                  </span>
                  <span className="status-pill" style={{ background: "var(--green, #184f3a)", color: "#fff", fontSize: "0.7rem" }}>
                    {preview.status}
                  </span>
                </div>

                <strong style={{ fontSize: "1.05rem", display: "block" }}>
                  Hosted by {preview.hostName}
                </strong>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.6rem", fontSize: "0.85rem", color: "#324e3e" }}>
                  {preview.startDate && preview.endDate && (
                    <span>• Dates: {preview.startDate} to {preview.endDate}</span>
                  )}
                  {preview.rateCents !== undefined && (
                    <span>• {money.format(preview.rateCents / 100)} / {preview.cadence === "weekly" ? "wk" : "day"}</span>
                  )}
                  {preview.houseRules && preview.houseRules.length > 0 && (
                    <span>• {preview.houseRules.length} house rules</span>
                  )}
                  {preview.rewards?.enabled && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "var(--green, #184f3a)" }}>
                      <Coins size={14} /> Earn {preview.rewards.coinName}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #f2c2ba",
                  borderRadius: "12px",
                  padding: "0.75rem 1rem",
                  background: "#fdf3f2",
                  color: "#992a1d",
                  fontSize: "0.85rem",
                }}
              >
                {preview.error}
              </div>
            )}
          </div>
        )}

        {joinError && <p className="form-error" role="alert" style={{ marginTop: "1rem" }}>{joinError}</p>}

        <div className="dialog-actions" style={{ marginTop: "1.75rem" }}>
          {onCancel && (
            <button className="button ghost" type="button" onClick={onCancel} disabled={joining}>
              Cancel
            </button>
          )}
          <button
            className="button primary"
            type="submit"
            disabled={joining || (preview !== undefined && !preview.valid)}
          >
            {joining ? "Joining household..." : "Join Household"} <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
