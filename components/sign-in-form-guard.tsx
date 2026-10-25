"use client";

import { useEffect, useRef } from "react";

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

      const hasValue = Boolean(input && input.value.trim().length > 0);
      if (hasValue) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("disabled");
        submitBtn.setAttribute("aria-disabled", "false");
        submitBtn.classList.remove("kouchd-submit-disabled");
      } else {
        submitBtn.disabled = true;
        submitBtn.setAttribute("disabled", "true");
        submitBtn.setAttribute("aria-disabled", "true");
        submitBtn.classList.add("kouchd-submit-disabled");
      }
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
