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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  stays: defineTable({
    hostUserId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("ended")),
    timezone: v.string(),
    referralCode: v.optional(v.string()),
    currentTermsId: v.optional(v.id("terms")),
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
    .index("by_stay_user", ["stayId", "userId"]),

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
    startDate: v.string(),
    endDate: v.string(),
    cadence: v.union(v.literal("daily"), v.literal("weekly")),
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

  obligations: defineTable({
    stayId: v.id("stays"),
    termsId: v.optional(v.id("terms")),
    guestUserId: v.optional(v.id("users")),
    type: v.optional(v.union(v.literal("cadence"), v.literal("adhoc"))),
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
