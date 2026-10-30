export const ANALYTICS_EVENTS = {
  // Account
  USER_SIGNED_UP: "user_signed_up",

  // Stay Management
  STAY_CREATED: "stay_created",
  STAY_JOINED: "stay_joined",
  STAY_SWITCHED: "stay_switched",
  STAY_RENAMED: "stay_renamed",
  HOUSE_INFO_UPDATED: "house_info_updated",

  // Agreements & Terms
  INVITE_CREATED: "invite_created",
  INVITE_ACCEPTED: "invite_accepted",
  AGREEMENT_VIEWED: "agreement_viewed",
  TERMS_ACCEPTED: "terms_accepted",
  TERMS_UPDATED: "terms_updated",

  // Ledger & Contributions
  CONTRIBUTION_RECORDED: "contribution_recorded",
  ADHOC_CHARGE_CREATED: "adhoc_charge_created",
  PAYMENT_METHOD_ADDED: "payment_method_added",

  // Household Coordination
  CHORE_CREATED: "chore_created",
  CHORE_COMPLETED: "chore_completed",
  SHOPPING_ITEM_ADDED: "shopping_item_added",
  SHOPPING_ITEM_PURCHASED: "shopping_item_purchased",
  CHECK_IN_SUBMITTED: "check_in_submitted",
  REWARD_CLAIMED: "reward_claimed",

  // Onboarding & Monetization. Purchases, trials and renewals come from
  // RevenueCat's own PostHog integration, not from these events.
  GUIDED_TOUR_ACTION: "guided_tour_action",
  PAYWALL_VIEWED: "paywall_viewed",
  CUSTOMER_CENTER_OPENED: "customer_center_opened",
  PLAN_LIMIT_HIT: "plan_limit_hit",
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// Server events (convex/lib/posthog.ts trackServerEvent) carry IDs and categories
// only: no names, free text, contribution amounts or join codes.
export interface AnalyticsEventPayloads {
  [ANALYTICS_EVENTS.USER_SIGNED_UP]: Record<string, never>;
  [ANALYTICS_EVENTS.STAY_CREATED]: { stayId: string; cadence: string; rateCents: number };
  [ANALYTICS_EVENTS.STAY_JOINED]: { stayId: string; via: "referral_code" };
  [ANALYTICS_EVENTS.STAY_SWITCHED]: { stayId: string; role: "host" | "guest" };
  [ANALYTICS_EVENTS.STAY_RENAMED]: { stayId: string; newName: string };
  [ANALYTICS_EVENTS.HOUSE_INFO_UPDATED]: { stayId: string };
  [ANALYTICS_EVENTS.INVITE_CREATED]: { stayId: string; inviteId?: string };
  [ANALYTICS_EVENTS.INVITE_ACCEPTED]: { stayId: string };
  [ANALYTICS_EVENTS.AGREEMENT_VIEWED]: { stayId: string; version: number };
  [ANALYTICS_EVENTS.TERMS_ACCEPTED]: { stayId: string; version: number; role: "host" | "guest" };
  [ANALYTICS_EVENTS.TERMS_UPDATED]: { stayId: string; version: number; guestUserId?: string };
  [ANALYTICS_EVENTS.CONTRIBUTION_RECORDED]: { stayId: string; type: string; recordedBy: "host" | "guest" };
  [ANALYTICS_EVENTS.ADHOC_CHARGE_CREATED]: { stayId: string; amountCents: number };
  [ANALYTICS_EVENTS.PAYMENT_METHOD_ADDED]: { stayId: string; provider: string };
  [ANALYTICS_EVENTS.CHORE_CREATED]: { stayId: string; choreId: string };
  [ANALYTICS_EVENTS.CHORE_COMPLETED]: { stayId: string; choreId: string };
  [ANALYTICS_EVENTS.SHOPPING_ITEM_ADDED]: { stayId: string; itemId: string };
  [ANALYTICS_EVENTS.SHOPPING_ITEM_PURCHASED]: { stayId: string; itemId: string };
  [ANALYTICS_EVENTS.CHECK_IN_SUBMITTED]: { stayId: string; date: string };
  [ANALYTICS_EVENTS.REWARD_CLAIMED]: { stayId: string; points: number };
  [ANALYTICS_EVENTS.GUIDED_TOUR_ACTION]: { action: "started" | "completed" | "skipped"; step?: number };
  [ANALYTICS_EVENTS.PAYWALL_VIEWED]: { stayId?: string; offeringId?: string };
  [ANALYTICS_EVENTS.CUSTOMER_CENTER_OPENED]: { source: string };
  [ANALYTICS_EVENTS.PLAN_LIMIT_HIT]: { stayId: string; limit: "guest" };
}
