"use client";

import { useEffect, useId, useRef, useState } from "react";

export function DestructiveConfirmationDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cancelRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
      }
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel]);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onCancel();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That change could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section className="modal-card confirmation-dialog" ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <div className="dialog-heading"><div><p className="eyebrow">Please confirm</p><h2 id={titleId}>{title}</h2></div></div>
      <p id={descriptionId} className="muted confirmation-copy">{description}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button ref={cancelRef} className="button ghost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="button danger-outline" type="button" onClick={() => void confirm()} disabled={busy}>{busy ? "Working…" : confirmLabel}</button>
      </div>
    </section>
  </div>;
}
