import { describe, expect, it } from "vitest";
import { applyIdentifierGuard, releaseIdentifierGuard, syncSubmitState } from "../components/sign-in-form-guard";

function fakeSubmitButton() {
  const attributes = new Map<string, string>();
  const classes = new Set<string>(["cl-formButtonPrimary"]);
  let isDisabled = false;
  const writes = { count: 0 };
  const button = {
    get disabled() {
      return isDisabled;
    },
    set disabled(value: boolean) {
      writes.count += 1;
      isDisabled = value;
    },
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => {
      writes.count += 1;
      attributes.set(name, value);
    },
    classList: {
      contains: (name: string) => classes.has(name),
      toggle: (name: string, force: boolean) => {
        writes.count += 1;
        if (force) classes.add(name);
        else classes.delete(name);
        return force;
      },
    },
  };
  return { button: button as unknown as HTMLButtonElement, writes };
}

describe("SignInFormGuard submit state", () => {
  it.each([true, false])("does not write to the button when disabled is already %s", (disabled) => {
    const { button, writes } = fakeSubmitButton();
    syncSubmitState(button, disabled);
    writes.count = 0;

    syncSubmitState(button, disabled);

    expect(writes.count).toBe(0);
  });

  it("applies and clears the disabled state", () => {
    const { button } = fakeSubmitButton();

    syncSubmitState(button, true);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.classList.contains("kouchd-submit-disabled")).toBe(true);

    syncSubmitState(button, false);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("false");
    expect(button.classList.contains("kouchd-submit-disabled")).toBe(false);
  });

  it("re-enables only a button the guard disabled", () => {
    const { button } = fakeSubmitButton();
    const owned = new Set<HTMLButtonElement>();

    applyIdentifierGuard(button, true, owned);
    expect(button.disabled).toBe(true);

    applyIdentifierGuard(button, false, owned);
    expect(button.disabled).toBe(false);
  });

  it("never clears a disabled state Clerk applied", () => {
    const { button } = fakeSubmitButton();
    const owned = new Set<HTMLButtonElement>();
    button.disabled = true; // Clerk: invalid form or request in flight

    applyIdentifierGuard(button, true, owned);
    applyIdentifierGuard(button, false, owned);

    expect(button.disabled).toBe(true);
  });

  it("keeps the button usable across a setup, cleanup, setup replay", () => {
    const { button } = fakeSubmitButton();

    // First effect setup with an empty identifier, then Strict Mode cleanup.
    const first = new Set<HTMLButtonElement>();
    applyIdentifierGuard(button, true, first);
    releaseIdentifierGuard(first);
    expect(button.disabled).toBe(false);

    // Second setup claims the button again, so typing re-enables it.
    const second = new Set<HTMLButtonElement>();
    applyIdentifierGuard(button, true, second);
    expect(button.disabled).toBe(true);
    applyIdentifierGuard(button, false, second);
    expect(button.disabled).toBe(false);
    expect(button.classList.contains("kouchd-submit-disabled")).toBe(false);
  });
});
