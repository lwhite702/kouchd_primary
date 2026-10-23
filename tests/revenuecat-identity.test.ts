import { afterEach, describe, expect, it, vi } from "vitest";
import type { Package } from "@revenuecat/purchases-js";

async function setup() {
  vi.resetModules();
  vi.stubGlobal("window", {});
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_WEB_API_KEY", "rcb_public_fixture");
  let identity = "";
  const client = {
    getAppUserId: () => identity,
    changeUser: vi.fn(async (next: string) => {
      identity = next;
    }),
    getOfferings: vi.fn(),
    purchase: vi.fn(),
  };
  vi.doMock("@revenuecat/purchases-js", () => ({
    Purchases: {
      isConfigured: () => Boolean(identity),
      configure: ({ appUserId }: { appUserId: string }) => {
        identity = appUserId;
      },
      getSharedInstance: () => client,
    },
    PurchasesError: class extends Error {},
    ErrorCode: {},
  }));
  return { client, billing: await import("../lib/revenuecat") };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.doUnmock("@revenuecat/purchases-js");
});

describe("billing account identity", () => {
  it("selects monthly and annual products from a mixed offering with custom package names", async () => {
    const { client, billing } = await setup();
    const monthly = {
      identifier: "custom-month",
      product: { identifier: "kouchd_plus_monthly_web" },
    };
    const annual = {
      identifier: "custom-year",
      product: { identifier: "kouchd_plus_yearly_web" },
    };
    client.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          monthly,
          { product: { identifier: "kouchd_plus_lifetime" } },
          annual,
        ],
      },
      all: {},
    });
    const options = await billing.getSubscriptionOfferings("host-a");
    expect(options.monthlyPackage).toBe(monthly);
    expect(options.yearlyPackage).toBe(annual);
  });

  it("requires sign-in and rejects unavailable product identifiers", async () => {
    const { billing } = await setup();
    await expect(billing.getRevenueCatClient()).rejects.toThrow("Sign in");
    await expect(
      billing.purchaseSubscriptionPackage(
        { product: { identifier: "pro" } } as Package,
        { appUserId: "host-a" },
      ),
    ).rejects.toThrow("unavailable");
  });

  it("rejects stale offerings after switching accounts", async () => {
    const { client, billing } = await setup();
    let finish!: (value: unknown) => void;
    client.getOfferings.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const offerings = billing.getSubscriptionOfferings("host-a");
    const rejected = expect(offerings).rejects.toThrow("account changed");
    await vi.waitFor(() => expect(client.getOfferings).toHaveBeenCalledOnce());
    await billing.getRevenueCatClient("host-b");
    finish({ current: null, all: {} });
    await rejected;
  });

  it("holds SDK identity through checkout and releases it on completion", async () => {
    const { client, billing } = await setup();
    let finish!: (value: unknown) => void;
    client.purchase.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = billing.purchaseSubscriptionPackage(
      { product: { identifier: "kouchd_plus_monthly_web" } } as Package,
      { appUserId: "host-a" },
    );
    await vi.waitFor(() => expect(client.purchase).toHaveBeenCalledOnce());
    await expect(billing.getRevenueCatClient("host-b")).rejects.toThrow(
      "checkout is still closing",
    );
    expect(client.getAppUserId()).toBe("host-a");
    finish({ customerInfo: {} });
    await pending;
    await billing.getRevenueCatClient("host-b");
    expect(client.getAppUserId()).toBe("host-b");
  });
});
