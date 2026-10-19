import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KouchdWorkspace } from "@/components/kouchd-workspace";
import { AuthenticatedHome } from "@/components/authenticated-home";

const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const mockAuth = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/components/kouchd-workspace", () => ({
  KouchdWorkspace: vi.fn(() => null),
}));

vi.mock("@/components/authenticated-home", () => ({
  AuthenticatedHome: vi.fn(() => null),
}));

describe("HomePage root route contract", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("renders the offline KouchdWorkspace when services are not configured", async () => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    const { default: HomePage } = await import("@/app/page");
    const result = await HomePage();

    expect(result.type).toBe(KouchdWorkspace);
    expect(result.props).toEqual({ servicesConfigured: false });
    expect(mockAuth).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects signed-out visitors to /sign-in when services are configured", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
    mockAuth.mockResolvedValue({ userId: null });

    const { default: HomePage } = await import("@/app/page");

    await expect(HomePage()).rejects.toThrow("REDIRECT:/sign-in");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("renders AuthenticatedHome for signed-in users when services are configured", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
    mockAuth.mockResolvedValue({ userId: "user_test_123" });

    const { default: HomePage } = await import("@/app/page");
    const result = await HomePage();

    expect(result.type).toBe(AuthenticatedHome);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
