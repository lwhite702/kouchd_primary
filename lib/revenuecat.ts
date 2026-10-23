import {
  Purchases,
  PurchasesError,
  ErrorCode,
  type CustomerInfo,
  type Offering,
  type Package,
  type PurchaseResult,
} from "@revenuecat/purchases-js";

export const REVENUECAT_WEB_API_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY || "";

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
    desiredUserID !== appUserId ||
    client.getAppUserId() !== appUserId
  )
    throw new Error("Your billing account changed. Please try again.");
}

/** Serialize SDK identity changes and reject superseded account requests. */
export async function getRevenueCatClient(
  appUserId?: string,
): Promise<Purchases> {
  if (typeof window === "undefined")
    throw new Error("Billing is available in your browser.");
  if (!appUserId) throw new Error("Sign in before opening billing.");
  if (!REVENUECAT_WEB_API_KEY || REVENUECAT_WEB_API_KEY.startsWith("test_"))
    throw new Error("Web billing is not available yet.");
  if (purchaseOwner && purchaseOwner !== appUserId)
    throw new Error(
      "Another account's checkout is still closing. Please try again shortly.",
    );
  if (desiredUserID !== appUserId) {
    desiredUserID = appUserId;
    identityGeneration += 1;
  }
  const generation = identityGeneration;
  const transition = identityTransition
    .catch(() => {})
    .then(async () => {
      if (
        (purchaseOwner && purchaseOwner !== appUserId) ||
        generation !== identityGeneration
      )
        throw new Error("Your billing account changed. Please try again.");
      if (!Purchases.isConfigured())
        Purchases.configure({ apiKey: REVENUECAT_WEB_API_KEY, appUserId });
      const client = Purchases.getSharedInstance();
      if (client.getAppUserId() !== appUserId)
        await client.changeUser(appUserId);
      if (
        generation !== identityGeneration ||
        client.getAppUserId() !== appUserId
      )
        throw new Error("Your billing account changed. Please try again.");
    });
  identityTransition = transition;
  await transition;
  const client = Purchases.getSharedInstance();
  assertBillingUser(client, appUserId);
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
export async function getCustomerInfo(
  appUserId?: string,
): Promise<CustomerInfo> {
  const client = await getRevenueCatClient(appUserId);
  const info = await client.getCustomerInfo();
  assertBillingUser(client, appUserId);
  return info;
}

/**
 * Check whether the customer currently has the active `kouchd_plus` entitlement.
 */
export async function checkKouchdPlusAccess(
  appUserId?: string,
): Promise<boolean> {
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
  assertBillingUser(client, appUserId);
  const offeringID = process.env.NEXT_PUBLIC_REVENUECAT_PLUS_OFFERING_ID;
  const current = offeringID ? offerings.all[offeringID] : offerings.current;
  assertPlusOffering(current);
  const yearlyPackage =
    current.availablePackages.find(
      (p) => p.product.identifier === "kouchd_plus_yearly_web",
    ) ?? null;
  const monthlyPackage =
    current.availablePackages.find(
      (p) => p.product.identifier === "kouchd_plus_monthly_web",
    ) ?? null;
  if (!yearlyPackage && !monthlyPackage)
    throw new Error(
      "Plus subscription options are unavailable. Please try again later.",
    );

  return {
    currentOffering: current,
    yearlyPackage,
    monthlyPackage,
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
    appUserId?: string;
  },
): Promise<PurchaseResult> {
  if (!PLUS_PRODUCTS.has(rcPackage.product.identifier))
    throw new Error("That subscription option is unavailable.");
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
    if (error instanceof PurchasesError) {
      if (error.errorCode === ErrorCode.PurchaseInvalidError) {
        console.warn("Purchase invalid:", error.message);
      }
    }
    throw error;
  } finally {
    purchaseOwner = undefined;
  }
}

/**
 * Open Customer Center / subscription management portal.
 * On Web Billing, redirects to the Stripe/RevenueCat management portal URL.
 */
export async function openCustomerCenter(
  appUserId?: string,
): Promise<string | null> {
  const info = await getCustomerInfo(appUserId);
  if (info.managementURL) {
    window.open(info.managementURL, "_blank", "noopener,noreferrer");
    return info.managementURL;
  }
  return null;
}
