"use client";

import { useEffect, useId, useRef } from "react";
import { Home, Users } from "lucide-react";

import "@/components/ui/main-action.css";

export interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limit: {
    dimension: "stay" | "guest";
    plan: "free" | "plus" | "pro";
    limit: number;
    atHighestPlan: boolean;
    message: string;
  };
  onUpgrade?: () => void;
}

export function PlanLimitModal({
  isOpen,
  onClose,
  limit,
  onUpgrade,
}: PlanLimitModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  // Read the latest close callback without re-running the focus effect, so a
  // parent re-render never pulls focus back to the primary button.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    primaryButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Return focus to whatever opened the dialog.
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const title = limit.atHighestPlan
    ? limit.dimension === "stay"
      ? "Every stay on Plus is in use"
      : "Every guest spot on Plus is in use"
    : limit.dimension === "stay"
      ? "Your Free plan is full"
      : "Guest spots are full";

  return (
    <div
      className="confirmation-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(19, 31, 26, 0.55)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 90,
        padding: "1rem",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="confirmation-dialog"
        style={{
          width: "min(480px, 100%)",
          background: "var(--surface, #fffdf8)",
          color: "var(--ink, #17251f)",
          borderRadius: "24px",
          padding: "1.75rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
          border: "1px solid var(--line, #ded8ce)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "var(--kouchd-sage-10, #e5edde)",
              display: "grid",
              placeItems: "center",
              color: "var(--forest, #184f3a)",
            }}
          >
            {limit.dimension === "stay" ? (
              <Home size={20} strokeWidth={2} />
            ) : (
              <Users size={20} strokeWidth={2} />
            )}
          </div>
          <div>
            <h2
              id={titleId}
              style={{
                fontSize: "1.35rem",
                margin: 0,
                fontWeight: 800,
                fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
          </div>
        </div>

        <p
          id={descId}
          style={{
            margin: "0 0 1.5rem",
            lineHeight: 1.55,
            color: "var(--ink, #17251f)",
            fontSize: "0.95rem",
          }}
        >
          {limit.message}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
          }}
        >
          {!limit.atHighestPlan && onUpgrade ? (
            <>
              <button
                type="button"
                className="button ghost"
                onClick={onClose}
              >
                Not now
              </button>
              <button
                ref={primaryButtonRef}
                type="button"
                className="kouchd-main-action"
                onClick={() => {
                  onClose();
                  onUpgrade();
                }}
              >
                Upgrade to Plus
              </button>
            </>
          ) : (
            <button
              ref={primaryButtonRef}
              type="button"
              className="kouchd-main-action"
              onClick={onClose}
            >
              Understood
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
