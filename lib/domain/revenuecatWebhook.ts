export type RevenueCatEnvironment = "production" | "sandbox";
export type RevenueCatSnapshotStatus =
  | "active"
  | "grace_period"
  | "billing_retry"
  | "canceled"
  | "expired"
  | "refunded";

export type RevenueCatEntitlement = "plus" | "pro" | "founding_host";

export interface NormalizedRevenueCatEvent {
  providerEventId: string;
  providerAppUserId: string;
  eventType: string;
  environment: RevenueCatEnvironment;
  status: RevenueCatSnapshotStatus;
  sourceKey?: string;
  entitlement?: "plus" | "pro";
  entitlements: RevenueCatEntitlement[];
  productId?: string;
  startedAt?: number;
  currentPeriodEndsAt?: number;
  willRenew?: boolean;
  occurredAt: number;
}

export type RevenueCatEventParseResult =
  | { kind: "invalid" }
  | { kind: "wrong_app" }
  | { kind: "ignored" }
  | { kind: "normalized"; event: NormalizedRevenueCatEvent };

const KNOWN_ENTITLEMENTS = new Map<string, RevenueCatEntitlement>([
  ["kouchd_plus", "plus"],
  ["kouchd_pro", "pro"],
  ["kouchd_founding_host", "founding_host"],
]);

const GRANTING_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
  "REFUND_REVERSED",
  "NON_RENEWING_PURCHASE",
]);

export function parseRevenueCatProductIdAllowlist(value: string | undefined): string[] {
  return value?.split(",").map((productId) => productId.trim()).filter(Boolean) ?? [];
}

export function isFoundingHostProductAllowed(productId: string | undefined, configuredIds: string | undefined): boolean {
  return !!productId && parseRevenueCatProductIdAllowlist(configuredIds).includes(productId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Parse only the small RevenueCat payload subset that may affect access. */
export function normalizeRevenueCatEvent(
  payload: unknown,
  expectedAppId: string,
  foundingHostProductIds: readonly string[] = [],
): RevenueCatEventParseResult {
  if (!isRecord(payload) || !isRecord(payload.event)) return { kind: "invalid" };

  const event = payload.event;
  const eventType = optionalString(event.type);
  if (!eventType) return { kind: "invalid" };
  if (eventType === "TRANSFER" || eventType === "SUBSCRIPTION_PAUSED" || ![
    ...GRANTING_EVENT_TYPES,
    "CANCELLATION",
    "EXPIRATION",
    "REFUND",
    "BILLING_ISSUE",
  ].includes(eventType)) return { kind: "ignored" };

  const appId = optionalString(event.app_id);
  if (!appId) return { kind: "invalid" };
  if (appId !== expectedAppId) return { kind: "wrong_app" };

  const providerEventId = optionalString(event.id);
  const providerAppUserId = optionalString(event.app_user_id);
  const occurredAt = event.event_timestamp_ms;
  if (!providerEventId || !providerAppUserId || !validTimestamp(occurredAt)) return { kind: "invalid" };

  let environment: RevenueCatEnvironment;
  if (event.environment === "PRODUCTION") environment = "production";
  else if (event.environment === "SANDBOX") environment = "sandbox";
  else return { kind: "ignored" };

  const productId = optionalString(event.product_id);
  const allowlistedFoundingProduct = !!productId && foundingHostProductIds.includes(productId);
  const noExpiration = event.expiration_at_ms === undefined || event.expiration_at_ms === null;
  const foundingPurchaseVerified = eventType === "NON_RENEWING_PURCHASE" && allowlistedFoundingProduct && noExpiration;
  const foundingRefundReversalVerified = eventType === "REFUND_REVERSED" && allowlistedFoundingProduct && noExpiration;
  const foundingLifecycleVerified = ["CANCELLATION", "EXPIRATION", "REFUND"].includes(eventType) && allowlistedFoundingProduct;
  const foundingHostVerified = foundingPurchaseVerified || foundingRefundReversalVerified || foundingLifecycleVerified;

  const entitlementIds = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids.filter((id): id is string => typeof id === "string")
    : [];
  const entitlements = [...new Set(entitlementIds
    .map((id) => {
      const entitlement = KNOWN_ENTITLEMENTS.get(id);
      return entitlement === "founding_host" && !foundingHostVerified ? undefined : entitlement;
    })
    .filter((entitlement): entitlement is RevenueCatEntitlement => entitlement !== undefined))];

  const legacyEntitlementId = optionalString(event.entitlement_id);
  const legacyEntitlement = legacyEntitlementId ? KNOWN_ENTITLEMENTS.get(legacyEntitlementId) : undefined;
  if (entitlements.length === 0 && legacyEntitlement &&
    (legacyEntitlement !== "founding_host" || foundingHostVerified)) entitlements.push(legacyEntitlement);
  if (GRANTING_EVENT_TYPES.has(eventType) && entitlements.length === 0) return { kind: "ignored" };

  let status: RevenueCatSnapshotStatus;
  switch (eventType) {
    case "CANCELLATION":
      status = event.cancel_reason === "BILLING_ERROR"
        ? validTimestamp(event.grace_period_expiration_at_ms) && event.grace_period_expiration_at_ms > occurredAt
          ? "grace_period"
          : "billing_retry"
        : "canceled";
      break;
    case "EXPIRATION": status = "expired"; break;
    case "REFUND": status = "refunded"; break;
    case "BILLING_ISSUE":
      status = validTimestamp(event.grace_period_expiration_at_ms) && event.grace_period_expiration_at_ms > occurredAt
        ? "grace_period"
        : "billing_retry";
      break;
    default: status = "active";
  }

  // A malformed non-null boundary is not treated as a lifetime purchase.
  const expiration = validTimestamp(event.expiration_at_ms) ? event.expiration_at_ms : undefined;
  const graceEnd = status === "grace_period" && validTimestamp(event.grace_period_expiration_at_ms)
    ? event.grace_period_expiration_at_ms
    : undefined;
  const currentPeriodEndsAt = graceEnd ?? expiration;

  return {
    kind: "normalized",
    event: {
      providerEventId,
      providerAppUserId,
      eventType,
      environment,
      status,
      sourceKey: optionalString(event.original_transaction_id)
        ? `transaction:${optionalString(event.original_transaction_id)}`
        : optionalString(event.transaction_id)
          ? `transaction:${optionalString(event.transaction_id)}`
          : productId
            ? `product:${productId}`
            : undefined,
      entitlement: entitlements.find((entitlement) => entitlement === "plus" || entitlement === "pro"),
      entitlements,
      productId,
      startedAt: validTimestamp(event.purchased_at_ms) ? event.purchased_at_ms : undefined,
      currentPeriodEndsAt,
      willRenew: typeof event.will_renew === "boolean" ? event.will_renew : undefined,
      occurredAt,
    },
  };
}
