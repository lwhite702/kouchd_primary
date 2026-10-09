"use client";

import { Check, Copy, Edit3, ExternalLink, Landmark } from "lucide-react";
import { FormEvent, useState } from "react";

import type { Doc } from "@/convex/_generated/dataModel";
import { Tooltip } from "@/components/ui/tooltip";

type PaymentOption = NonNullable<Doc<"stays">["paymentOptions"]>[number];
const providers = [
  { id: "paypal", label: "PayPal" },
  { id: "cashapp", label: "Cash App" },
  { id: "zelle", label: "Zelle" },
  { id: "applepay", label: "Apple Pay" },
] as const;

function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function PaymentOptionsCard({
  paymentOptions,
  isHost,
  onEdit,
  onNotify,
}: {
  paymentOptions?: Doc<"stays">["paymentOptions"];
  isHost: boolean;
  onEdit: () => void;
  onNotify: (message: string) => void;
}) {
  const configured = paymentOptions ?? [];
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(detail: string, label: string) {
    await navigator.clipboard.writeText(detail);
    setCopied(label);
    onNotify(`${label} details copied.`);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">External payments</p>
          <h2>Pay the host directly</h2>
        </div>
        {isHost && <button className="mini-button" type="button" onClick={onEdit}><Edit3 size={15} /> {configured.length ? "Edit options" : "Add options"}</button>}
      </div>
      <p className="muted" style={{ marginTop: "-0.5rem" }}>Kouchd does not process payments. Use an option below, then record the contribution in your ledger.</p>
      {configured.length ? (
        <div className="payment-options-grid">
          {configured.map((option) => {
            const label = providers.find((provider) => provider.id === option.provider)?.label ?? option.provider;
            return (
              <article className="house-card payment-option-card" key={option.provider}>
                <div className="house-card-header">
                  <span className="house-icon payment"><Landmark size={19} /></span>
                  <div><p className="overline" style={{ margin: 0 }}>Pay with</p><strong>{label}</strong></div>
                </div>
                <div className="house-card-body payment-option-detail">
                  {isWebUrl(option.detail)
                    ? <a href={option.detail} target="_blank" rel="noopener noreferrer">Open {label} <ExternalLink size={14} /></a>
                    : <strong>{option.detail}</strong>}
                  <Tooltip content={`Copy ${label} handle to clipboard`}>
                    <button className="button soft compact copy-btn" type="button" onClick={() => void copy(option.detail, label)} aria-label={`Copy ${label} details`}>
                      {copied === label ? <Check size={14} /> : <Copy size={14} />}<span>{copied === label ? "Copied" : "Copy"}</span>
                    </button>
                  </Tooltip>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="muted">{isHost ? "Add a payment method for guests to use outside Kouchd." : "The host has not shared payment details yet."}</p>}
    </section>
  );
}

export function PaymentOptionsForm({
  initialOptions,
  onSubmit,
  onCancel,
}: {
  initialOptions?: Doc<"stays">["paymentOptions"];
  onSubmit: (options: PaymentOption[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const byProvider = new Map((initialOptions ?? []).map((item) => [item.provider, item.detail]));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const options = providers.flatMap((provider) => {
      const detail = String(form.get(provider.id) ?? "").trim();
      return detail ? [{ provider: provider.id, detail }] : [];
    });
    try {
      await onSubmit(options);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save payment options.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="muted">Add a username, phone/email, or payment link. Guests pay you directly outside Kouchd.</p>
      <div className="form-grid">
        {providers.map((provider) => (
          <label className="full" key={provider.id}>
            <span>{provider.label}</span>
            <input name={provider.id} defaultValue={byProvider.get(provider.id) ?? ""} maxLength={250} placeholder="Username, contact, or https:// link" />
          </label>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="muted modal-note">Kouchd does not collect or process these payments. Share only payment details you are comfortable showing to every guest in this household.</p>
      <div className="dialog-actions">
        <button className="button ghost" type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button className="button primary" type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save payment options"}</button>
      </div>
    </form>
  );
}
