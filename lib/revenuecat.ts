import {
  Purchases,
  PurchasesError,
  ErrorCode,
  type CustomerInfo,
  type Offering,
  type Package,
  type PurchaseResult,
  type PresentPaywallParams,
  LogLevel,
} from "@revenuecat/purchases-js";

export const REVENUECAT_WEB_API_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY || "test_VWbMTqHFVImetHzikZnfkVxyUMi";

export const ENTITLEMENT_KOUCHD_PLUS = "kouchd_plus";

export const PRODUCT_IDENTIFIERS = {
  YEARLY: "yearly",
  MONTHLY: "monthly",
} as const;

let configurePromise: Promise<Purchases> | null = null;

/**
 * Initialize or retrieve the configured RevenueCat Purchases instance on the client.
 */
export async function getRevenueCatClient(appUserId?: string): Promise<Purchases> {
  if (typeof window === "undefined") {
    throw new Error("RevenueCat Purchases Web SDK can only be executed in a browser environment.");
  }

  // Set debug logs in development
  if (process.env.NODE_ENV !== "production") {
    Purchases.setLogLevel(LogLevel.Debug);
  }

  if (Purchases.isConfigured()) {
    const instance = Purchases.getSharedInstance();
    if (appUserId && appUserId !== instance.getAppUserId()) {
      await instance.changeUser(appUserId);
    }
    return instance;
  }

  if (configurePromise) {
    return configurePromise;
  }

  configurePromise = (async () => {
    const instance = Purchases.configure({
      apiKey: REVENUECAT_WEB_API_KEY,
      appUserId: appUserId || Purchases.generateRevenueCatAnonymousAppUserId(),
    });
    return instance;
  })();

  try {
    return await configurePromise;
  } finally {
    configurePromise = null;
  }
}

/**
 * Retrieve the latest CustomerInfo for the subscriber.
 */
export async function getCustomerInfo(appUserId?: string): Promise<CustomerInfo> {
  const client = await getRevenueCatClient(appUserId);
  return await client.getCustomerInfo();
}

/**
 * Check whether the customer currently has the active `kouchd_plus` entitlement.
 */
export async function checkKouchdPlusAccess(appUserId?: string): Promise<boolean> {
  try {
    const client = await getRevenueCatClient(appUserId);
    return await client.isEntitledTo(ENTITLEMENT_KOUCHD_PLUS);
  } catch (err) {
    console.error("Failed to check RevenueCat entitlement:", err);
    return false;
  }
}

/**
 * Fetch available offerings and default packages (yearly and monthly).
 */
export async function getSubscriptionOfferings(appUserId?: string): Promise<{
  currentOffering: Offering | null;
  yearlyPackage: Package | null;
  monthlyPackage: Package | null;
}> {
  const client = await getRevenueCatClient(appUserId);
  const offerings = await client.getOfferings();
  const current = offerings.current;

  return {
    currentOffering: current,
    yearlyPackage: current?.annual ?? current?.packagesById[PRODUCT_IDENTIFIERS.YEARLY] ?? null,
    monthlyPackage: current?.monthly ?? current?.packagesById[PRODUCT_IDENTIFIERS.MONTHLY] ?? null,
  };
}

/**
 * Purchase a selected subscription package directly.
 */
export async function purchaseSubscriptionPackage(
  rcPackage: Package,
  options?: {
    customerEmail?: string;
    htmlTarget?: HTMLElement;
  }
): Promise<PurchaseResult> {
  const client = await getRevenueCatClient();
  try {
    return await client.purchase({
      rcPackage,
      customerEmail: options?.customerEmail,
      htmlTarget: options?.htmlTarget,
    });
  } catch (error) {
    if (error instanceof PurchasesError) {
      if (error.errorCode === ErrorCode.PurchaseInvalidError) {
        console.warn("Purchase invalid:", error.message);
      }
    }
    throw error;
  }
}

/**
 * Present a RevenueCat Paywall on the web.
 * Renders into `htmlTarget` if specified, or as a full-screen overlay if omitted.
 */
export async function presentRevenueCatPaywall(params?: {
  htmlTarget?: HTMLElement;
  customerEmail?: string;
  offering?: Offering;
  onBack?: (close: () => void) => void;
  onVisitCustomerCenter?: () => void;
}) {
  const client = await getRevenueCatClient();
  const paywallParams: PresentPaywallParams = {
    htmlTarget: params?.htmlTarget,
    customerEmail: params?.customerEmail,
    offering: params?.offering,
    onBack: params?.onBack,
    onVisitCustomerCenter: params?.onVisitCustomerCenter,
  };

  return await client.presentPaywall(paywallParams);
}

/**
 * Open Customer Center / subscription management portal.
 * On Web Billing, redirects to the Stripe/RevenueCat management portal URL.
 */
export async function openCustomerCenter(appUserId?: string): Promise<string | null> {
  const info = await getCustomerInfo(appUserId);
  if (info.managementURL) {
    window.open(info.managementURL, "_blank", "noopener,noreferrer");
    return info.managementURL;
  }
  return null;
}
