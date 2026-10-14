export type RevenueCatEnvironment = "production" | "sandbox";
export type RevenueCatSnapshotStatus =
  | "active"
  | "grace_period"
  | "billing_retry"
  | "canceled"
  | "expired"
  | "refunded";

export interface NormalizedRevenueCatEvent {
  providerEventId: string;
  providerAppUserId: string;
  eventType: string;
  environment: RevenueCatEnvironment;
  status: RevenueCatSnapshotStatus;
  entitlement?: "plus" | "pro";
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

const KNOWN_ENTITLEMENTS = new Map<string, "plus" | "pro">([
  ["kouchd_plus", "plus"],
  ["kouchd_pro", "pro"],
]);

const GRANTING_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
  "REFUND_REVERSED",
]);

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
): RevenueCatEventParseResult {
  if (!isRecord(payload) || !isRecord(payload.event)) return { kind: "invalid" };

  const event = payload.event;
  const eventType = optionalString(event.type);
  if (!eventType) return { kind: "invalid" };

  // These event types are outside subscription lifecycle processing. In
  // particular, TRANSFER payloads may omit app_user_id and must never be used
  // to attach entitlements to another account.
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
  if (!providerEventId || !providerAppUserId || !validTimestamp(occurredAt)) {
    return { kind: "invalid" };
  }

  let environment: RevenueCatEnvironment;
  if (event.environment === "PRODUCTION") environment = "production";
  else if (event.environment === "SANDBOX") environment = "sandbox";
  else return { kind: "ignored" };

  const entitlementIds = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids.filter((id): id is string => typeof id === "string")
    : [];
  const recognizedEntitlements = [...new Set(
    entitlementIds
      .map((id) => KNOWN_ENTITLEMENTS.get(id))
      .filter((plan): plan is "plus" | "pro" => plan !== undefined),
  )];

  // Never guess between simultaneous/ambiguous plan entitlements. Unsupported
  // events and transfer events are acknowledged without granting or changing access.
  if (recognizedEntitlements.length > 1) return { kind: "ignored" };
  if (GRANTING_EVENT_TYPES.has(eventType) && recognizedEntitlements.length !== 1) {
    return { kind: "ignored" };
  }

  let status: RevenueCatSnapshotStatus;
  switch (eventType) {
    case "CANCELLATION":
      status = event.cancel_reason === "BILLING_ERROR"
        ? validTimestamp(event.grace_period_expiration_at_ms) && event.grace_period_expiration_at_ms > occurredAt
          ? "grace_period"
          : "billing_retry"
        : "canceled";
      break;
    case "EXPIRATION":
      status = "expired";
      break;
    case "REFUND":
      status = "refunded";
      break;
    case "BILLING_ISSUE":
      status = validTimestamp(event.grace_period_expiration_at_ms) && event.grace_period_expiration_at_ms > occurredAt
        ? "grace_period"
        : "billing_retry";
      break;
    default:
      status = "active";
  }

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
      entitlement: recognizedEntitlements[0],
      productId: optionalString(event.product_id),
      startedAt: validTimestamp(event.purchased_at_ms) ? event.purchased_at_ms : undefined,
      currentPeriodEndsAt,
      willRenew: typeof event.will_renew === "boolean" ? event.will_renew : undefined,
      occurredAt,
    },
  };
}
