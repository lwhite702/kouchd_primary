"use client";

import { useEffect, useRef } from "react";

// Write only on a real change: the observer below watches these attributes, so
// a write that repeats the current value would re-trigger it forever.
export function syncSubmitState(submitBtn: HTMLButtonElement, disabled: boolean) {
  if (submitBtn.disabled !== disabled) submitBtn.disabled = disabled;
  if (submitBtn.getAttribute("aria-disabled") !== String(disabled)) {
    submitBtn.setAttribute("aria-disabled", String(disabled));
  }
  if (submitBtn.classList.contains("kouchd-submit-disabled") !== disabled) {
    submitBtn.classList.toggle("kouchd-submit-disabled", disabled);
  }
}

export function SignInFormGuard({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const findElements = () => {
      const input =
        container.querySelector<HTMLInputElement>("#identifier-field") ||
        container.querySelector<HTMLInputElement>("input[name='identifier']") ||
        container.querySelector<HTMLInputElement>("input[type='email']");
      const submitBtn =
        container.querySelector<HTMLButtonElement>("button[type='submit']") ||
        container.querySelector<HTMLButtonElement>(".cl-formButtonPrimary");
      return { input, submitBtn };
    };

    const updateSubmitState = () => {
      const { input, submitBtn } = findElements();
      if (!submitBtn) return;

      // Only guard the initial identifier step if an identifier input exists.
      // On password, OTP code, or MFA steps, do not interfere with Clerk's native button state.
      syncSubmitState(submitBtn, Boolean(input) && !input?.value.trim());
    };

    // Run immediately
    updateSubmitState();

    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.id === "identifier-field" ||
        target?.getAttribute("name") === "identifier" ||
        target?.getAttribute("type") === "email"
      ) {
        updateSubmitState();
      }
    };

    container.addEventListener("input", handleInput, true);
    container.addEventListener("change", handleInput, true);
    container.addEventListener("keyup", handleInput, true);
    container.addEventListener("paste", handleInput, true);

    const observer = new MutationObserver(() => {
      updateSubmitState();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["value", "disabled", "class"],
    });

    return () => {
      container.removeEventListener("input", handleInput, true);
      container.removeEventListener("change", handleInput, true);
      container.removeEventListener("keyup", handleInput, true);
      container.removeEventListener("paste", handleInput, true);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="kouchd-sign-in-container">
      {children}
    </div>
  );
}
