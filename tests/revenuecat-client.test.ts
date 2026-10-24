import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPurchases = {
  configure: vi.fn(),
  isConfigured: vi.fn(),
  getSharedInstance: vi.fn(),
  setLogLevel: vi.fn(),
  generateRevenueCatAnonymousAppUserId: vi.fn(),
};

vi.mock("@revenuecat/purchases-js", () => {
  return {
    Purchases: mockPurchases,
    PurchasesError: class PurchasesError extends Error {},
    ErrorCode: { PurchaseInvalidError: 1 },
    LogLevel: { Debug: "debug" },
  };
});

describe("RevenueCat client identity handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Provide window in node environment
    (globalThis as unknown as { window: unknown }).window = {};
    mockPurchases.isConfigured.mockReturnValue(false);
  });

  it("requires an authenticated appUserId when configuring for the first time", async () => {
    const { getRevenueCatClient } = await import("../lib/revenuecat");

    await expect(getRevenueCatClient()).rejects.toThrow(
      "RevenueCat Purchases Web SDK requires an authenticated appUserId for initialization.",
    );
    expect(mockPurchases.configure).not.toHaveBeenCalled();
    expect(mockPurchases.generateRevenueCatAnonymousAppUserId).not.toHaveBeenCalled();
  });

  it("configures with the exact appUserId provided", async () => {
    const mockInstance = {
      getAppUserId: () => "user_clerk_123",
      changeUser: vi.fn(),
    };
    mockPurchases.configure.mockReturnValue(mockInstance);

    const { getRevenueCatClient } = await import("../lib/revenuecat");
    const client = await getRevenueCatClient("user_clerk_123");

    expect(mockPurchases.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        appUserId: "user_clerk_123",
      }),
    );
    expect(client).toBe(mockInstance);
  });

  it("changes user if already configured with a different ID", async () => {
    const changeUserMock = vi.fn().mockResolvedValue(undefined);
    const mockInstance = {
      getAppUserId: () => "previous_user",
      changeUser: changeUserMock,
    };
    mockPurchases.isConfigured.mockReturnValue(true);
    mockPurchases.getSharedInstance.mockReturnValue(mockInstance);

    const { getRevenueCatClient } = await import("../lib/revenuecat");
    const client = await getRevenueCatClient("user_clerk_456");

    expect(changeUserMock).toHaveBeenCalledWith("user_clerk_456");
    expect(client).toBe(mockInstance);
  });

  it("checkKouchdPlusAccess returns false immediately without configuring if no userId is provided", async () => {
    mockPurchases.isConfigured.mockReturnValue(false);

    const { checkKouchdPlusAccess } = await import("../lib/revenuecat");
    const result = await checkKouchdPlusAccess();

    expect(result).toBe(false);
    expect(mockPurchases.configure).not.toHaveBeenCalled();
  });

  it("getCustomerInfo returns null immediately without configuring if no userId is provided", async () => {
    mockPurchases.isConfigured.mockReturnValue(false);

    const { getCustomerInfo } = await import("../lib/revenuecat");
    const result = await getCustomerInfo();

    expect(result).toBeNull();
    expect(mockPurchases.configure).not.toHaveBeenCalled();
  });

  it("presentRevenueCatPaywall forwards appUserId to initialization", async () => {
    const presentPaywallMock = vi.fn().mockResolvedValue({ customerInfo: {} });
    const mockInstance = {
      getAppUserId: () => "user_clerk_789",
      presentPaywall: presentPaywallMock,
    };
    mockPurchases.configure.mockReturnValue(mockInstance);

    const { presentRevenueCatPaywall } = await import("../lib/revenuecat");
    await presentRevenueCatPaywall({
      appUserId: "user_clerk_789",
      customerEmail: "host@example.com",
    });

    expect(mockPurchases.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        appUserId: "user_clerk_789",
      }),
    );
    expect(presentPaywallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "host@example.com",
      }),
    );
  });
});
