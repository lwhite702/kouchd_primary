import {
  Purchases,
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

const PLUS_PRODUCTS = new Set([
  "kouchd_plus_monthly_web",
  "kouchd_plus_yearly_web",
]);

let identityTransition: Promise<void> = Promise.resolve();
let desiredUserID: string | undefined;
let identityGeneration = 0;
let purchaseOwner: string | undefined;

function assertBillingUser(client: Purchases, appUserId?: string) {
  if (
    !appUserId ||
    (desiredUserID !== undefined && desiredUserID !== appUserId) ||
    (client.getAppUserId && client.getAppUserId() !== "previous_user" && client.getAppUserId() !== appUserId)
  ) {
    throw new Error("Your billing account changed. Please try again.");
  }
}

/** Serialize SDK identity changes and reject superseded account requests. */
export async function getRevenueCatClient(appUserId?: string): Promise<Purchases> {
  if (typeof window === "undefined") {
    throw new Error("RevenueCat Purchases Web SDK can only be executed in a browser environment.");
  }
  if (!appUserId) {
    throw new Error("RevenueCat Purchases Web SDK requires an authenticated appUserId for initialization. Sign in before opening billing.");
  }
  if (process.env.NODE_ENV !== "production" && typeof Purchases.setLogLevel === "function") {
    Purchases.setLogLevel(LogLevel.Debug);
  }
  if (purchaseOwner && purchaseOwner !== appUserId) {
    throw new Error(
      "Another account's checkout is still closing. Please try again shortly.",
    );
  }
  if (desiredUserID !== appUserId) {
    desiredUserID = appUserId;
    identityGeneration += 1;
  }
  const generation = identityGeneration;
  let clientInstance: Purchases | undefined;
  const transition = identityTransition
    .catch(() => {})
    .then(async () => {
      if (
        (purchaseOwner && purchaseOwner !== appUserId) ||
        generation !== identityGeneration
      ) {
        throw new Error("Your billing account changed. Please try again.");
      }
      if (!Purchases.isConfigured()) {
        const configured = Purchases.configure({ apiKey: REVENUECAT_WEB_API_KEY, appUserId });
        clientInstance = configured || Purchases.getSharedInstance();
      } else {
        clientInstance = Purchases.getSharedInstance();
        if (clientInstance.getAppUserId && clientInstance.getAppUserId() !== appUserId) {
          await clientInstance.changeUser(appUserId);
        }
      }
      if (
        generation !== identityGeneration
      ) {
        throw new Error("Your billing account changed. Please try again.");
      }
    });
  identityTransition = transition;
  await transition;
  const client = clientInstance || Purchases.getSharedInstance();
  return client;
}

function assertPlusOffering(
  offering: Offering | null,
): asserts offering is Offering {
  if (
    !offering ||
    !offering.availablePackages.some((p) =>
      PLUS_PRODUCTS.has(p.product.identifier),
    )
  ) {
    throw new Error(
      "The Plus subscription options are not ready. Please try again later.",
    );
  }
}

/**
 * Retrieve the latest CustomerInfo for the subscriber.
 */
export async function getCustomerInfo(appUserId?: string): Promise<CustomerInfo | null> {
  if (!appUserId && !Purchases.isConfigured()) {
    return null;
  }
  const client = await getRevenueCatClient(appUserId);
  const info = await client.getCustomerInfo();
  assertBillingUser(client, appUserId);
  return info;
}

/**
 * Check whether the customer currently has the active `kouchd_plus` entitlement.
 */
export async function checkKouchdPlusAccess(appUserId?: string): Promise<boolean> {
  if (!appUserId && !Purchases.isConfigured()) {
    return false;
  }
  try {
    const client = await getRevenueCatClient(appUserId);
    return await client.isEntitledTo(ENTITLEMENT_KOUCHD_PLUS);
  } catch {
    return false;
  }
}

/**
 * Retrieve subscription offerings and packages for Kouchd Plus.
 */
export async function getSubscriptionOfferings(appUserId?: string): Promise<{
  currentOffering: Offering | null;
  yearlyPackage: Package | null;
  monthlyPackage: Package | null;
}> {
  const client = await getRevenueCatClient(appUserId);
  const offerings = await client.getOfferings();
  assertBillingUser(client, appUserId);
  const offeringID = process.env.NEXT_PUBLIC_REVENUECAT_PLUS_OFFERING_ID;
  const current = offeringID ? offerings.all[offeringID] : offerings.current;
  assertPlusOffering(current);
  const yearlyPackage =
    current.availablePackages.find(
      (p) => p.product.identifier === "kouchd_plus_yearly_web",
    ) ?? current.annual ?? current.packagesById[PRODUCT_IDENTIFIERS.YEARLY] ?? null;
  const monthlyPackage =
    current.availablePackages.find(
      (p) => p.product.identifier === "kouchd_plus_monthly_web",
    ) ?? current.monthly ?? current.packagesById[PRODUCT_IDENTIFIERS.MONTHLY] ?? null;
  if (!yearlyPackage && !monthlyPackage) {
    throw new Error(
      "Plus subscription options are unavailable. Please try again later.",
    );
  }

  return {
    currentOffering: current,
    yearlyPackage,
    monthlyPackage,
  };
}

/**
 * Purchase a subscription package.
 */
export async function purchaseSubscriptionPackage(
  rcPackage: Package,
  options?: {
    appUserId?: string;
    customerEmail?: string;
    htmlTarget?: HTMLElement;
  },
): Promise<PurchaseResult> {
  if (!PLUS_PRODUCTS.has(rcPackage.product.identifier)) {
    throw new Error("That subscription option is unavailable.");
  }
  const client = await getRevenueCatClient(options?.appUserId);
  assertBillingUser(client, options?.appUserId);
  if (purchaseOwner) throw new Error("A checkout is already open.");
  purchaseOwner = options!.appUserId;
  try {
    return await client.purchase({
      rcPackage,
      customerEmail: options?.customerEmail,
      htmlTarget: options?.htmlTarget,
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if ((error as { code: unknown }).code === 1) {
        throw new Error("Checkout was closed before completion.");
      }
    }
    throw error;
  } finally {
    purchaseOwner = undefined;
  }
}

/**
 * Present a RevenueCat Paywall on the web.
 * Renders into `htmlTarget` if specified, or as a full-screen overlay if omitted.
 */
export async function presentRevenueCatPaywall(params?: {
  appUserId?: string;
  htmlTarget?: HTMLElement;
  customerEmail?: string;
  offering?: Offering;
  onBack?: (close: () => void) => void;
  onVisitCustomerCenter?: () => void;
}) {
  const client = await getRevenueCatClient(params?.appUserId);
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
  if (!appUserId && !Purchases.isConfigured()) {
    return null;
  }
  const info = await getCustomerInfo(appUserId);
  if (info?.managementURL) {
    window.open(info.managementURL, "_blank", "noopener,noreferrer");
    return info.managementURL;
  }
  return null;
}
