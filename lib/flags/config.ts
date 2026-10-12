export const FEATURE_FLAGS = {
  // Household & Coordination
  SHOPPING_LIST: "feature_shopping_list",
  CHECK_IN_BOARD: "feature_check_in_board",
  REWARDS_SYSTEM: "feature_rewards_system",
  HOUSEHOLD_ANNOUNCEMENTS: "feature_household_announcements",

  // Core & Launch Plans
  FLEXIBLE_PAYMENT_SCHEDULES: "feature_flexible_payment_schedules",
  RECORDED_OVERNIGHTS: "feature_recorded_overnights",
  MULTI_STAY_MANAGEMENT: "feature_multi_stay_management",

  // Onboarding
  GUIDED_TOUR: "feature_guided_tour",

  // Monetization & RevenueCat
  BILLING_PORTAL: "feature_billing_portal",
  REVENUECAT_PAYWALL: "feature_revenuecat_paywall",
  KOUCHD_PLUS_ENTITLEMENT: "feature_kouchd_plus_entitlement",
  CUSTOMER_CENTER: "feature_customer_center",
  KOUCHD_PLUS_TRIAL: "feature_kouchd_plus_trial",

  // Messaging & Notifications
  SMS_REMINDERS: "feature_sms_reminders",
} as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

export interface FeatureFlagMeta {
  key: FeatureFlagKey;
  label: string;
  description: string;
  category: "household" | "core" | "onboarding" | "monetization" | "messaging";
  defaultValue: boolean;
}

export const FEATURE_FLAGS_REGISTRY: Record<FeatureFlagKey, FeatureFlagMeta> = {
  [FEATURE_FLAGS.SHOPPING_LIST]: {
    key: FEATURE_FLAGS.SHOPPING_LIST,
    label: "Household Shopping List",
    description: "Enables shared household shopping list and item assignment.",
    category: "household",
    defaultValue: true,
  },
  [FEATURE_FLAGS.CHECK_IN_BOARD]: {
    key: FEATURE_FLAGS.CHECK_IN_BOARD,
    label: "Weekly Check-In Board",
    description: "Enables stay check-in cadence, discussions, and status tags.",
    category: "household",
    defaultValue: true,
  },
  [FEATURE_FLAGS.REWARDS_SYSTEM]: {
    key: FEATURE_FLAGS.REWARDS_SYSTEM,
    label: "Contribution Rewards & Points",
    description: "Enables task points claiming, redemption into ledger credit, and rule management.",
    category: "household",
    defaultValue: true,
  },
  [FEATURE_FLAGS.HOUSEHOLD_ANNOUNCEMENTS]: {
    key: FEATURE_FLAGS.HOUSEHOLD_ANNOUNCEMENTS,
    label: "Household Announcements & Activity",
    description: "Enables host announcement broadcast banner and live stay activity streams.",
    category: "household",
    defaultValue: true,
  },
  [FEATURE_FLAGS.FLEXIBLE_PAYMENT_SCHEDULES]: {
    key: FEATURE_FLAGS.FLEXIBLE_PAYMENT_SCHEDULES,
    label: "Flexible Payment Schedules",
    description: "Enables guest daily vs weekly cadence choices, custom weekday selection, and schedule change requests.",
    category: "core",
    defaultValue: false,
  },
  [FEATURE_FLAGS.RECORDED_OVERNIGHTS]: {
    key: FEATURE_FLAGS.RECORDED_OVERNIGHTS,
    label: "Recorded Overnight Stays",
    description: "Enables per-guest host-recorded overnight billing and nonconsecutive night ledger calculations.",
    category: "core",
    defaultValue: false,
  },
  [FEATURE_FLAGS.MULTI_STAY_MANAGEMENT]: {
    key: FEATURE_FLAGS.MULTI_STAY_MANAGEMENT,
    label: "Multi-Stay Management",
    description: "Enables creating, joining, and switching between multiple household stays.",
    category: "core",
    defaultValue: true,
  },
  [FEATURE_FLAGS.GUIDED_TOUR]: {
    key: FEATURE_FLAGS.GUIDED_TOUR,
    label: "Guided Onboarding Tour",
    description: "Enables interactive guided tour highlights for hosts and guests.",
    category: "onboarding",
    defaultValue: true,
  },
  [FEATURE_FLAGS.BILLING_PORTAL]: {
    key: FEATURE_FLAGS.BILLING_PORTAL,
    label: "Subscriber Billing & Paywall",
    description: "Master switch for host subscription billing and checkout surfaces.",
    category: "monetization",
    defaultValue: false,
  },
  [FEATURE_FLAGS.REVENUECAT_PAYWALL]: {
    key: FEATURE_FLAGS.REVENUECAT_PAYWALL,
    label: "RevenueCat Dynamic Paywall",
    description: "Presents RevenueCat dynamic web paywall modal for direct subscription checkout.",
    category: "monetization",
    defaultValue: false,
  },
  [FEATURE_FLAGS.KOUCHD_PLUS_ENTITLEMENT]: {
    key: FEATURE_FLAGS.KOUCHD_PLUS_ENTITLEMENT,
    label: "Kouchd Plus Entitlement Enforcement",
    description: "Enforces active Kouchd Plus subscriber entitlement verification for premium features.",
    category: "monetization",
    defaultValue: false,
  },
  [FEATURE_FLAGS.CUSTOMER_CENTER]: {
    key: FEATURE_FLAGS.CUSTOMER_CENTER,
    label: "RevenueCat Customer Center",
    description: "Enables self-service subscription management and Stripe/RevenueCat billing portal access.",
    category: "monetization",
    defaultValue: true,
  },
  [FEATURE_FLAGS.KOUCHD_PLUS_TRIAL]: {
    key: FEATURE_FLAGS.KOUCHD_PLUS_TRIAL,
    label: "Kouchd Plus Free Trial",
    description: "Offers new hosts an introductory free trial period before subscription billing renews.",
    category: "monetization",
    defaultValue: false,
  },
  [FEATURE_FLAGS.SMS_REMINDERS]: {
    key: FEATURE_FLAGS.SMS_REMINDERS,
    label: "Automated SMS Reminders",
    description: "Enables transactional SMS delivery and carrier compliance workflows.",
    category: "messaging",
    defaultValue: true,
  },
};

export const ALL_FEATURE_FLAGS = Object.values(FEATURE_FLAGS_REGISTRY);
