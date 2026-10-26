"use client";

import { FormEvent, useState } from "react";

type SignupStatus = { type: "success" | "error"; message: string } | null;

export function NewsletterSignup() {
  const [status, setStatus] = useState<SignupStatus>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          consent: data.get("consent") === "on",
          website: String(data.get("website") ?? ""),
        }),
      });
      const result = await response.json() as { message?: string };

      if (!response.ok) {
        setStatus({ type: "error", message: result.message ?? "We couldn’t add you just now. Please try again." });
        return;
      }

      form.reset();
      setStatus({ type: "success", message: "You’re on the list. We’ll send Kouchd updates to your inbox." });
    } catch {
      setStatus({ type: "error", message: "We couldn’t reach the signup service. Please try again shortly." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="newsletter-form" onSubmit={submit}>
      <label className="newsletter-email-label" htmlFor="newsletter-email">Email address</label>
      <div className="newsletter-input-row">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder="you@example.com"
          required
          aria-describedby="newsletter-consent newsletter-status"
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Joining…" : "Get updates"}
        </button>
      </div>
      <div className="newsletter-honeypot" aria-hidden="true">
        <label htmlFor="newsletter-website">Leave this field empty</label>
        <input id="newsletter-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="newsletter-consent" id="newsletter-consent">
        <input name="consent" type="checkbox" required />
        <span>Send me occasional Kouchd product and launch updates. I can unsubscribe anytime.</span>
      </label>
      <p className="newsletter-privacy-note">Your email is used for these updates only. See our <a href="/privacy">Privacy Policy</a>.</p>
      <p
        className={`newsletter-status${status ? ` is-${status.type}` : ""}`}
        id="newsletter-status"
        role={status?.type === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {status?.message ?? " "}
      </p>
    </form>
  );
}
