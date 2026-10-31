import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  AuthenticateWithRedirectCallback: vi.fn(() => null),
  SignIn: vi.fn(() => null),
  SignUp: vi.fn(() => null),
  useClerk: vi.fn(),
}));

vi.mock("@/components/sign-in-form-guard", () => ({
  SignInFormGuard: vi.fn(({ children }: { children: unknown }) => children),
}));

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

function findByType(node: unknown, type: unknown): Element | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as Element;
  if (element.type === type) return element;
  return findByType(element.props?.children, type);
}

describe("Clerk auth routes (WRE-261)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_synthetic" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("finishes OAuth returns that land on the root /sso-callback", async () => {
    const { AuthenticateWithRedirectCallback } = await import("@clerk/nextjs");
    const { default: SsoCallbackPage } = await import("@/app/sso-callback/page");
    const callback = findByType(SsoCallbackPage(), AuthenticateWithRedirectCallback);

    expect(callback).not.toBeNull();
    expect(callback?.props).toMatchObject({
      signInUrl: "/sign-in",
      signUpUrl: "/sign-up",
      firstFactorUrl: "/sign-in/factor-one",
      continueSignUpUrl: "/sign-up/continue",
      verifyEmailAddressUrl: "/sign-up/verify-email-address",
      signInFallbackRedirectUrl: "/",
      signUpFallbackRedirectUrl: "/",
    });
  });

  it("pins the sign-in component to /sign-in with path routing", async () => {
    const { SignIn } = await import("@clerk/nextjs");
    const { default: SignInPage } = await import("@/app/sign-in/[[...sign-in]]/page");
    const signIn = findByType(SignInPage(), SignIn);

    expect(signIn?.props).toMatchObject({ routing: "path", path: "/sign-in", signUpUrl: "/sign-up" });
  });

  it("pins the sign-up component to /sign-up with path routing", async () => {
    const { SignUp } = await import("@clerk/nextjs");
    const { default: SignUpPage } = await import("@/app/sign-up/[[...sign-up]]/page");
    const signUp = findByType(SignUpPage(), SignUp);

    expect(signUp?.props).toMatchObject({ routing: "path", path: "/sign-up", signInUrl: "/sign-in" });
  });

  it("gives ClerkProvider explicit sign-in and sign-up URLs", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/<ClerkProvider[^>]*signInUrl="\/sign-in"/);
    expect(layout).toMatch(/<ClerkProvider[^>]*signUpUrl="\/sign-up"/);
  });

  it("serves /sign-out and returns the person to /sign-in", async () => {
    const { SIGN_OUT_REDIRECT_URL, SignOutRedirect } = await import("@/components/sign-out-redirect");
    const { default: SignOutPage } = await import("@/app/sign-out/page");

    expect(SignOutPage().type).toBe(SignOutRedirect);
    expect(SIGN_OUT_REDIRECT_URL).toBe("/sign-in");
  });
});
