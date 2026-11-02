/**
 * Server-agnostic subscription policy. This module contains product defaults
 * only; callers remain responsible for authorization and persistence.
 */

export type SubscriptionPlan = "starter" | "hostPlus" | "householdPro";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "grace"
  | "canceledUntilPeriodEnd"
  | "expired"
  | "refunded"
  | "unknown";

export interface SubscriptionState {
  status: SubscriptionStatus;
  /** Paid plan associated with this entitlement; ignored for terminal states. */
  plan?: Exclude<SubscriptionPlan, "starter">;
  /** Unix milliseconds. Used to stop access after trial/grace/paid period ends. */
  accessUntilMs?: number;
}

/**
 * Resolve the effective plan at a point in time. Cancellation is non-terminal
 * through the paid period. Missing, expired, refunded, and unknown states fall
 * back to Starter.
 */
export function resolveSubscriptionPlan(
  state: SubscriptionState | null | undefined,
  nowMs: number,
): SubscriptionPlan {
  if (!state || state.status === "expired" || state.status === "refunded" || state.status === "unknown") {
    return "starter";
  }

  // Paid and trial access must have a known end boundary. This keeps malformed
  // or incomplete provider state from granting indefinite access.
  if (!state.plan || state.accessUntilMs === undefined) return "starter";

  if (nowMs >= state.accessUntilMs) {
    return "starter";
  }

  return state.plan;
}

export interface PlanLimits {
  /** null means no commercial cap; separate abuse/system safeguards are needed. */
  maxActiveStays: number | null;
  /** null means no commercial cap; separate abuse/system safeguards are needed. */
  maxActiveGuests: number | null;
}

export const PLAN_LIMITS: Readonly<Record<SubscriptionPlan, PlanLimits>> = {
  starter: { maxActiveStays: 1, maxActiveGuests: 1 },
  // Capacity is shared across the host billing account: guests are one pool
  // across all of the host's active and pending stays, not a per-stay count.
  hostPlus: { maxActiveStays: 3, maxActiveGuests: 5 },
  // TODO(product/engineering): define finite abuse and system guardrails before
  // launch. These null values mean no commercial product cap, not infinity.
  householdPro: { maxActiveStays: null, maxActiveGuests: null },
};

export interface PlanCapabilities {
  /** Agreements, history, individual records, and personal exports. */
  agreementsAndHistory: boolean;
  individualRecords: boolean;
  coreLedger: boolean;
  basicChores: boolean;
  guestFunctions: boolean;
  flexibleTerms: boolean;
  recurringChores: boolean;
  expandedKoins: boolean;
  hostReporting: boolean;
  welcomeKit: boolean;
  multiStayManagement: boolean;
  cohostAdministration: boolean;
  consolidatedReporting: boolean;
}

const CORE_CAPABILITIES: Omit<PlanCapabilities,
  | "flexibleTerms"
  | "recurringChores"
  | "expandedKoins"
  | "hostReporting"
  | "welcomeKit"
  | "multiStayManagement"
  | "cohostAdministration"
  | "consolidatedReporting"
> = {
  agreementsAndHistory: true,
  individualRecords: true,
  coreLedger: true,
  basicChores: true,
  guestFunctions: true,
};

export const PLAN_CAPABILITIES: Readonly<Record<SubscriptionPlan, PlanCapabilities>> = {
  starter: {
    ...CORE_CAPABILITIES,
    flexibleTerms: false,
    recurringChores: false,
    expandedKoins: false,
    hostReporting: false,
    welcomeKit: false,
    multiStayManagement: false,
    cohostAdministration: false,
    consolidatedReporting: false,
  },
  hostPlus: {
    ...CORE_CAPABILITIES,
    flexibleTerms: true,
    recurringChores: true,
    expandedKoins: true,
    hostReporting: true,
    welcomeKit: true,
    multiStayManagement: false,
    cohostAdministration: false,
    consolidatedReporting: false,
  },
  householdPro: {
    ...CORE_CAPABILITIES,
    flexibleTerms: true,
    recurringChores: true,
    expandedKoins: true,
    hostReporting: true,
    welcomeKit: true,
    multiStayManagement: true,
    cohostAdministration: true,
    consolidatedReporting: true,
  },
};

export type SmsAllowanceStatus = "unavailable" | "pendingProductDecision";

/** SMS is a separate cost-controlled allowance, never an implied unlimited perk. */
export interface SmsAllowance {
  status: SmsAllowanceStatus;
  /** null means not yet set, not unlimited. */
  monthlyMessageLimit: number | null;
  requiresExplicitConsent: true;
}

export const SMS_ALLOWANCES: Readonly<Record<SubscriptionPlan, SmsAllowance>> = {
  starter: { status: "unavailable", monthlyMessageLimit: 0, requiresExplicitConsent: true },
  hostPlus: { status: "pendingProductDecision", monthlyMessageLimit: null, requiresExplicitConsent: true },
  householdPro: { status: "pendingProductDecision", monthlyMessageLimit: null, requiresExplicitConsent: true },
};

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function getPlanCapabilities(plan: SubscriptionPlan): PlanCapabilities {
  return PLAN_CAPABILITIES[plan];
}
