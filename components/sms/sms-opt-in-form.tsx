"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CheckCircle2, MessageSquare, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { api } from "@/convex/_generated/api";
import { FormSkeleton } from "@/components/skeleton-loader";

export function SmsOptInForm() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { userId } = useAuth();
  const syncCurrent = useMutation(api.users.syncCurrent);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState("");
  const synced = isAuthenticated && Boolean(userId) && syncedUserId === userId;
  const viewer = useQuery(api.users.viewer, isAuthenticated && synced ? {} : "skip");
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedData, setSubmittedData] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId || syncedUserId === userId) return;
    void syncCurrent({})
      .then(() => {
        setSyncedUserId(userId);
        setSyncError("");
      })
      .catch(() => setSyncError("We could not prepare your Kouchd account. Please reload and try again."));
  }, [isAuthenticated, syncCurrent, syncedUserId, userId]);

  function formatToE164(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith("+")) {
      return trimmed.replace(/[^\d+]/g, "");
    }
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
    return `+${digits}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const submittedName = (formData.get("name") as string)?.trim();
    const rawPhone = (formData.get("phone") as string)?.trim();
    const consentChecked = formData.get("consent") === "on";

    if (!submittedName) {
      setError("Please enter your name.");
      return;
    }

    const formattedPhone = formatToE164(rawPhone || "");
    if (!/^\+[1-9]\d{1,14}$/.test(formattedPhone) || formattedPhone.length < 11) {
      setError("Please enter a valid mobile number with country code (e.g. +15551234567 or 10-digit US number).");
      return;
    }

    if (!consentChecked) {
      setError("You must check the consent box to opt in to text messages.");
      return;
    }

    setSubmitting(true);
    try {
      if (!isAuthenticated || !synced) throw new Error("Sign in before enrolling in SMS alerts.");
      await updatePreferences({
        phone: formattedPhone,
        notifyEmail: viewer?.notifyEmail ?? true,
        notifySms: true,
        smsConsentSource: "sms_opt_in_form",
        smsConsentConfirmed: true,
      });
      setSubmittedData({ name: submittedName, phone: formattedPhone });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete SMS opt-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedData) {
    return (
      <div
        style={{
          background: "#eaf4ec",
          border: "2px solid #b8d2c1",
          borderRadius: "16px",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <CheckCircle2 size={44} color="var(--kouchd-forest, #184f3a)" style={{ margin: "0 auto 1rem" }} />
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--kouchd-forest, #184f3a)", margin: "0 0 0.5rem" }}>
          SMS Opt-In Confirmed
        </h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "#2d4438" }}>
          Thank you, <strong>{submittedData.name}</strong>! Your mobile number (<strong>{submittedData.phone}</strong>) has been enrolled in transactional alerts for <strong>Kouchd</strong> (operated by <strong>Wrelik Brands LLC</strong>).
        </p>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            border: "1px solid #b8d2c1",
            borderRadius: "12px",
            padding: "1rem",
            fontSize: "0.85rem",
            color: "#184f3a",
            textAlign: "left",
            margin: "1.25rem 0",
          }}
        >
          <p style={{ margin: "0 0 0.4rem" }}>
            &bull; <strong>Message &amp; data rates may apply.</strong>
          </p>
          <p style={{ margin: "0 0 0.4rem" }}>
            &bull; <strong>Message frequency varies</strong> based on household stay activity.
          </p>
          <p style={{ margin: "0 0 0.4rem" }}>
            &bull; Text <strong>HELP</strong> for assistance or contact <a href="mailto:support@wrelik.com" style={{ color: "var(--kouchd-forest, #184f3a)" }}>support@wrelik.com</a>.
          </p>
          <p style={{ margin: 0 }}>
            &bull; Text <strong>STOP</strong> at any time to cancel and unsubscribe.
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
          <Link
            href="/"
            style={{
              background: "var(--kouchd-forest, #184f3a)",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            Go to Kouchd Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setSubmittedData(null)}
            style={{
              background: "transparent",
              border: "1px solid var(--kouchd-forest, #184f3a)",
              color: "var(--kouchd-forest, #184f3a)",
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Submit Another Number
          </button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return <FormSkeleton rows={3} />;
  }

  if (!isAuthenticated) {
    return (
      <div role="status" style={{ background: "#faf8f5", border: "1px solid var(--kouchd-line, #ded8ce)", borderRadius: "14px", padding: "1.25rem" }}>
        <p style={{ marginTop: 0 }}>Sign in or create a Kouchd account before enrolling. Your number and consent will be saved to your account only after you confirm the opt-in.</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <SignInButton mode="modal" forceRedirectUrl="/sms-opt-in">
            <button className="button soft" type="button">Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/sms-opt-in">
            <button className="button primary" type="button">Create account</button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  if (syncError) {
    return <p role="alert">{syncError}</p>;
  }

  if (!synced || viewer === undefined) {
    return <FormSkeleton rows={3} />;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Overview Card */}
      <div
        style={{
          background: "#faf8f5",
          border: "1px solid var(--kouchd-line, #ded8ce)",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start",
        }}
      >
        <MessageSquare size={24} color="var(--kouchd-forest, #184f3a)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong style={{ display: "block", color: "var(--kouchd-forest, #184f3a)", fontSize: "1rem", marginBottom: "0.25rem" }}>
            Kouchd Transactional SMS Program
          </strong>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--kouchd-muted, #59675f)", lineHeight: 1.5 }}>
            Subscribe to receive real-time notifications from <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>). Notifications include stay agreement updates, chore due date reminders, check-in logistics, and ledger modifications.
          </p>
        </div>
      </div>

      {/* Name Input */}
      <div>
        <label htmlFor="sms-optin-name" style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Full Name
        </label>
        <input
          id="sms-optin-name"
          name="name"
          type="text"
          defaultValue={viewer?.name ?? ""}
          placeholder="Jane Doe"
          required
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            border: "1px solid var(--kouchd-line, #ded8ce)",
            background: "#fff",
            fontSize: "0.95rem",
            color: "var(--kouchd-ink, #17251f)",
          }}
        />
      </div>

      {/* Phone Number Input */}
      <div>
        <label htmlFor="sms-optin-phone" style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Mobile Phone Number (SMS-capable)
        </label>
        <input
          id="sms-optin-phone"
          name="phone"
          type="tel"
          defaultValue={viewer?.phone ?? ""}
          placeholder="+1 (555) 019-2834"
          required
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            border: "1px solid var(--kouchd-line, #ded8ce)",
            background: "#fff",
            fontSize: "0.95rem",
            color: "var(--kouchd-ink, #17251f)",
          }}
        />
        <span style={{ display: "block", marginTop: "0.35rem", fontSize: "0.8rem", color: "var(--kouchd-muted, #59675f)" }}>
          Enter a US or international number with country code (e.g. +15551234567).
        </span>
      </div>

      {/* Consent Checkbox with Full Carrier Disclosure */}
      <div
        style={{
          border: "1px solid #b8d2c1",
          background: "#eaf4ec",
          borderRadius: "14px",
          padding: "1.25rem",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            name="consent"
            style={{
              width: "20px",
              height: "20px",
              marginTop: "3px",
              cursor: "pointer",
              accentColor: "var(--kouchd-forest, #184f3a)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "0.86rem", color: "#184f3a", lineHeight: 1.55 }}>
            I agree to receive transactional text messages (SMS) from <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>) regarding my stay agreements, chore reminders, check-in logistics, and ledger updates. <strong>Message and data rates may apply.</strong> Message frequency varies based on household stay activity. Reply <strong>STOP</strong> to cancel at any time, or <strong>HELP</strong> for assistance. Consent is not a condition of purchase or any stay agreement. I have read and agree to the{" "}
            <Link href="/terms" target="_blank" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 800, textDecoration: "underline" }}>
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" style={{ color: "var(--kouchd-forest, #184f3a)", fontWeight: 800, textDecoration: "underline" }}>
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>

      {/* Anti-Spam / Data Sharing Guarantee */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          fontSize: "0.82rem",
          color: "var(--kouchd-muted, #59675f)",
        }}
      >
        <ShieldCheck size={18} color="var(--kouchd-forest, #184f3a)" style={{ flexShrink: 0 }} />
        <span>
          <strong>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</strong>
        </span>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: "#fdf0ed",
            border: "1px solid #ed755c",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            color: "#c0392b",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Action */}
      <div>
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            background: "var(--kouchd-forest, #184f3a)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "0.95rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 800,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            transition: "all 0.2s ease",
          }}
        >
          {submitting ? "Confirming Opt-In..." : "Subscribe to SMS Alerts"}
        </button>
      </div>
    </form>
  );
}
