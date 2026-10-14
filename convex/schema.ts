import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    notifyEmail: v.optional(v.boolean()),
    notifySms: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
    guideProgress: v.optional(v.object({
      host: v.optional(v.object({
        step: v.number(),
        status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
      })),
      guest: v.optional(v.object({
        step: v.number(),
        status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
      })),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  smsConsentEvents: defineTable({
    userId: v.id("users"),
    phone: v.string(),
    action: v.union(v.literal("opted_in"), v.literal("opted_out")),
    source: v.union(
      v.literal("host_onboarding"),
      v.literal("guest_onboarding"),
      v.literal("settings"),
      v.literal("sms_opt_in_form"),
    ),
    consentVersion: v.string(),
    recordedAt: v.number(),
  }).index("by_user_recorded_at", ["userId", "recordedAt"]),

  householdAccounts: defineTable({
    ownerUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_user_id", ["ownerUserId"]),

  subscriptionSnapshots: defineTable({
    householdAccountId: v.id("householdAccounts"),
    provider: v.string(),
    providerAppUserId: v.optional(v.string()),
    productId: v.optional(v.string()),
    entitlement: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("grace_period"),
      v.literal("billing_retry"),
      v.literal("canceled"),
      v.literal("expired"),
      v.literal("refunded"),
      v.literal("unknown"),
    ),
    environment: v.string(),
    startedAt: v.optional(v.number()),
    currentPeriodEndsAt: v.optional(v.number()),
    willRenew: v.optional(v.boolean()),
    latestProviderEventAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_household_account", ["householdAccountId"])
    .index("by_household_account_provider_environment", ["householdAccountId", "provider", "environment"]),

  // Independent verified sources keep Plus, Pro, and Founding Host grants
  // from replacing one another. Legacy snapshots remain readable during the
  // transition.
  subscriptionEntitlementGrants: defineTable({
    householdAccountId: v.id("householdAccounts"),
    provider: v.string(),
    providerAppUserId: v.string(),
    environment: v.string(),
    sourceKey: v.string(),
    entitlement: v.union(v.literal("plus"), v.literal("pro"), v.literal("founding_host")),
    status: v.union(
      v.literal("active"),
      v.literal("grace_period"),
      v.literal("billing_retry"),
      v.literal("canceled"),
      v.literal("expired"),
      v.literal("refunded"),
      v.literal("unknown"),
    ),
    productId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    currentPeriodEndsAt: v.optional(v.number()),
    lifetime: v.optional(v.boolean()),
    willRenew: v.optional(v.boolean()),
    latestProviderEventAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_household_account", ["householdAccountId"])
    .index("by_household_provider_environment", ["householdAccountId", "provider", "environment"])
    .index("by_household_provider_environment_entitlement_source", ["householdAccountId", "provider", "environment", "entitlement", "sourceKey"]),

  providerEvents: defineTable({
    provider: v.string(),
    providerEventId: v.string(),
    householdAccountId: v.optional(v.id("householdAccounts")),
    eventType: v.string(),
    productId: v.optional(v.string()),
    environment: v.string(),
    occurredAt: v.optional(v.number()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
    processingError: v.optional(v.string()),
  })
    .index("by_provider_event_id", ["provider", "environment", "providerEventId"])
    .index("by_household_account_received_at", ["householdAccountId", "receivedAt"]),

  stays: defineTable({
    hostUserId: v.id("users"),
    householdAccountId: v.optional(v.id("householdAccounts")),
    name: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("ended")),
    timezone: v.string(),
    referralCode: v.optional(v.string()),
    currentTermsId: v.optional(v.id("terms")),
    paymentOptions: v.optional(v.array(v.object({
      provider: v.union(v.literal("paypal"), v.literal("cashapp"), v.literal("zelle"), v.literal("applepay")),
      detail: v.string(),
    }))),
    nextCheckInDate: v.optional(v.string()),
    endedAt: v.optional(v.number()),
    houseInfo: v.optional(
      v.object({
        wifiNetwork: v.optional(v.string()),
        wifiPassword: v.optional(v.string()),
        streetAddress: v.optional(v.string()),
        unit: v.optional(v.string()),
        cityStateZip: v.optional(v.string()),
        doorCode: v.optional(v.string()),
        parkingNotes: v.optional(v.string()),
        trashDay: v.optional(v.string()),
        emergencyContact: v.optional(v.string()),
        otherNotes: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_host_user_id", ["hostUserId"])
    .index("by_household_account", ["householdAccountId"])
    .index("by_host_user_status", ["hostUserId", "status"])
    .index("by_household_account_status", ["householdAccountId", "status"])
    .index("by_status", ["status"])
    .index("by_referral_code", ["referralCode"])
    .index("by_next_check_in_date", ["nextCheckInDate"]),

  memberships: defineTable({
    stayId: v.id("stays"),
    userId: v.id("users"),
    role: v.union(v.literal("host"), v.literal("guest")),
    status: v.union(v.literal("active"), v.literal("left")),
    acceptedTermsId: v.optional(v.id("terms")),
    joinedAt: v.number(),
  })
    .index("by_stay", ["stayId"])
    .index("by_user", ["userId"])
    .index("by_stay_user", ["stayId", "userId"])
    .index("by_stay_role_status", ["stayId", "role", "status"]),

  invites: defineTable({
    stayId: v.id("stays"),
    tokenHash: v.string(),
    invitedEmail: v.optional(v.string()),
    createdBy: v.id("users"),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    usedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_stay", ["stayId"]),

  terms: defineTable({
    stayId: v.id("stays"),
    guestUserId: v.optional(v.id("users")),
    version: v.number(),
    effectiveFrom: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    cadence: v.union(v.literal("daily"), v.literal("weekly")),
    paymentDayOfWeek: v.optional(v.number()),
    billingBasis: v.optional(v.union(v.literal("continuous"), v.literal("occupied_nights"))),
    rateCents: v.number(),
    earlyDiscountEnabled: v.optional(v.boolean()),
    earlyDiscountPercentage: v.number(),
    earlyDiscountDays: v.number(),
    lateFeeEnabled: v.optional(v.boolean()),
    lateFeeCents: v.number(),
    graceDays: v.number(),
    houseNotes: v.string(),
    houseRules: v.optional(
      v.array(
        v.object({
          id: v.string(),
          category: v.string(),
          title: v.string(),
          description: v.string(),
          required: v.boolean(),
        })
      )
    ),
    rewards: v.optional(
      v.object({
        enabled: v.boolean(),
        coinName: v.string(),
        centsPerPoint: v.number(),
        maxCreditPerPeriodCents: v.number(),
      })
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_stay", ["stayId"])
    .index("by_stay_version", ["stayId", "version"])
    .index("by_stay_and_guest", ["stayId", "guestUserId"]),

  termsAcceptances: defineTable({
    stayId: v.id("stays"),
    termsId: v.id("terms"),
    userId: v.id("users"),
    acceptedAt: v.number(),
  })
    .index("by_terms_user", ["termsId", "userId"])
    .index("by_stay_terms", ["stayId", "termsId"]),

  paymentScheduleRequests: defineTable({
    stayId: v.id("stays"),
    guestUserId: v.id("users"),
    sourceTermsId: v.optional(v.id("terms")),
    requestedCadence: v.union(v.literal("daily"), v.literal("weekly")),
    requestedPaymentDayOfWeek: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    appliedTermsId: v.optional(v.id("terms")),
  })
    .index("by_stay_status", ["stayId", "status"])
    .index("by_guest_status", ["guestUserId", "status"]),

  occupiedNights: defineTable({
    stayId: v.id("stays"),
    guestUserId: v.id("users"),
    nightDate: v.string(),
    termsId: v.id("terms"),
    obligationId: v.id("obligations"),
    amountCents: v.number(),
    recordedBy: v.id("users"),
    recordedAt: v.number(),
    voidedAt: v.optional(v.number()),
    voidedBy: v.optional(v.id("users")),
  })
    .index("by_stay_guest_night", ["stayId", "guestUserId", "nightDate"])
    .index("by_obligation", ["obligationId"]),

  obligations: defineTable({
    stayId: v.id("stays"),
    termsId: v.optional(v.id("terms")),
    guestUserId: v.optional(v.id("users")),
    type: v.optional(v.union(v.literal("cadence"), v.literal("adhoc"), v.literal("occupancy"))),
    title: v.optional(v.string()),
    periodStart: v.string(),
    periodEnd: v.string(),
    dueDate: v.string(),
    baseAmountCents: v.number(),
    lateFeeWaivedAt: v.optional(v.number()),
    lateFeeWaivedBy: v.optional(v.id("users")),
    voidedAt: v.optional(v.number()),
    voidedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_stay", ["stayId"])
    .index("by_terms", ["termsId"])
    .index("by_terms_and_guest", ["termsId", "guestUserId"])
    .index("by_stay_and_guest", ["stayId", "guestUserId"])
    .index("by_stay_guest_and_voided", ["stayId", "guestUserId", "voidedAt"])
    .index("by_due_date", ["dueDate"]),

  contributions: defineTable({
    stayId: v.id("stays"),
    guestUserId: v.optional(v.id("users")),
    createdBy: v.id("users"),
    type: v.union(v.literal("payment"), v.literal("groceries"), v.literal("supplies"), v.literal("house_work"), v.literal("other")),
    amountCents: v.number(),
    date: v.string(),
    note: v.string(),
    countsTowardBalance: v.boolean(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("disputed"), v.literal("voided")),
    confirmedBy: v.optional(v.id("users")),
    confirmedAt: v.optional(v.number()),
    disputedBy: v.optional(v.id("users")),
    voidedBy: v.optional(v.id("users")),
    voidedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_stay", ["stayId"])
    .index("by_stay_status", ["stayId", "status"])
    .index("by_stay_date", ["stayId", "date"])
    .index("by_stay_guest_and_date", ["stayId", "guestUserId", "date"]),

  chores: defineTable({
    stayId: v.id("stays"),
    createdBy: v.id("users"),
    title: v.string(),
    note: v.string(),
    assignee: v.union(v.literal("host"), v.literal("guest"), v.literal("shared")),
    assigneeUserId: v.optional(v.id("users")),
    dueDate: v.string(),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    voidedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stay", ["stayId"])
    .index("by_stay_due_date", ["stayId", "dueDate"])
    .index("by_due_date", ["dueDate"]),

  announcements: defineTable({
    stayId: v.id("stays"),
    createdBy: v.id("users"),
    title: v.string(),
    body: v.string(),
    pinnedUntil: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_stay", ["stayId"]),

  contributionRules: defineTable({
    stayId: v.id("stays"),
    title: v.string(),
    category: v.union(v.literal("cleaning"), v.literal("groceries"), v.literal("maintenance"), v.literal("cooking"), v.literal("care"), v.literal("other")),
    pointsAwarded: v.number(),
    description: v.string(),
    cadenceLimit: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_stay", ["stayId"])
    .index("by_stay_and_active", ["stayId", "isActive"]),

  pointClaims: defineTable({
    stayId: v.id("stays"),
    guestUserId: v.id("users"),
    ruleId: v.optional(v.id("contributionRules")),
    title: v.string(),
    points: v.number(),
    note: v.string(),
    date: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("disputed"), v.literal("voided")),
    confirmedBy: v.optional(v.id("users")),
    confirmedAt: v.optional(v.number()),
    disputedBy: v.optional(v.id("users")),
    voidedBy: v.optional(v.id("users")),
    voidedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_stay", ["stayId"])
    .index("by_stay_and_guest", ["stayId", "guestUserId"])
    .index("by_stay_guest_and_status", ["stayId", "guestUserId", "status"]),

  pointRedemptions: defineTable({
    stayId: v.id("stays"),
    guestUserId: v.id("users"),
    pointsRedeemed: v.number(),
    amountCents: v.number(),
    date: v.string(),
    contributionId: v.id("contributions"),
    createdAt: v.number(),
  })
    .index("by_stay", ["stayId"])
    .index("by_stay_and_guest", ["stayId", "guestUserId"]),

  activity: defineTable({
    stayId: v.id("stays"),
    actorUserId: v.id("users"),
    guestUserId: v.optional(v.id("users")),
    kind: v.union(v.literal("stay"), v.literal("terms"), v.literal("invite"), v.literal("contribution"), v.literal("chore"), v.literal("check_in"), v.literal("obligation"), v.literal("announcement"), v.literal("notification"), v.literal("reward")),
    action: v.string(),
    detail: v.string(),
    entityId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_stay_created_at", ["stayId", "createdAt"])
    .index("by_stay_guest_and_created_at", ["stayId", "guestUserId", "createdAt"]),

  notifications: defineTable({
    userId: v.id("users"),
    stayId: v.optional(v.id("stays")),
    workflow: v.string(),
    entityId: v.optional(v.string()),
    sentAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_workflow_and_entity", ["userId", "workflow", "entityId"]),
});
