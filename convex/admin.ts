import { v } from "convex/values";

import { calendarDateInTimezone } from "../lib/domain/dates";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { getOrCreateHouseholdAccount } from "./householdOwnership";
import { recordPlatformAuditLog, requireAuditReason, requirePlatformAdmin } from "./lib/auth";
import { getEffectiveSubscriptionForAccount } from "./lib/subscriptionAccess";
import { extractNotificationCalendarDate, hasUserReceivedReminderOnDate, REMINDER_WORKFLOWS } from "./notifications";

function redactEmail(email: string | undefined): string | undefined {
  if (!email) return undefined;
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0] ?? "*"}*@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}


export const canAccess = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    try {
      await requirePlatformAdmin(ctx);
      return true;
    } catch {
      return false;
    }
  },
});

export const getOverviewStats = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);

    const [users, stays, obligations, contributions, smsEvents, activities] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("stays").collect(),
      ctx.db.query("obligations").collect(),
      ctx.db.query("contributions").collect(),
      ctx.db.query("smsConsentEvents").collect(),
      ctx.db.query("activity").order("desc").take(10),
    ]);

    const activeStays = stays.filter((s) => s.status === "active").length;
    const pendingStays = stays.filter((s) => s.status === "pending").length;
    const endedStays = stays.filter((s) => s.status === "ended").length;

    let totalObligationsCents = 0;
    for (const ob of obligations) {
      if (!ob.voidedAt) {
        totalObligationsCents += ob.baseAmountCents;
      }
    }

    let totalConfirmedCents = 0;
    let pendingContributionsCount = 0;
    let disputedContributionsCount = 0;

    for (const c of contributions) {
      if (c.status === "confirmed") {
        totalConfirmedCents += c.amountCents;
      } else if (c.status === "pending") {
        pendingContributionsCount += 1;
      } else if (c.status === "disputed") {
        disputedContributionsCount += 1;
      }
    }

    const optInCount = smsEvents.filter((e) => e.action === "opted_in").length;
    const optOutCount = smsEvents.filter((e) => e.action === "opted_out").length;

    // Join activity with actor user name
    const enrichedActivities = await Promise.all(
      activities.map(async (act) => {
        const actor = act.actorUserId ? await ctx.db.get(act.actorUserId) : null;
        return {
          ...act,
          actorName: act.actorType === "system" ? "System" : actor?.name ?? "Unknown actor",
        };
      })
    );

    return {
      totalUsers: users.length,
      totalStays: stays.length,
      activeStays,
      pendingStays,
      endedStays,
      totalObligationsCents,
      totalConfirmedCents,
      pendingContributionsCount,
      disputedContributionsCount,
      smsOptIns: optInCount,
      smsOptOuts: optOutCount,
      recentActivity: enrichedActivities,
    };
  },
});

export const listUsers = query({
  args: {
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const users = await ctx.db.query("users").order("desc").take(150);
    const search = args.searchTerm?.trim().toLowerCase();

    const filtered = users.filter((u) => {
      if (!search) return true;
      return (
        u.name.toLowerCase().includes(search) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.phone && u.phone.includes(search)) ||
        u.clerkUserId.toLowerCase().includes(search) ||
        u._id.includes(search)
      );
    });

    const userSummaries = await Promise.all(
      filtered.map(async (user) => {
        const memberships = await ctx.db
          .query("memberships")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        const roles = Array.from(new Set(memberships.map((m) => m.role)));
        const activeStays = memberships.filter((m) => m.status === "active").length;

        return {
          _id: user._id,
          clerkUserId: user.clerkUserId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          imageUrl: user.imageUrl,
          notifyEmail: user.notifyEmail ?? true,
          notifySms: user.notifySms ?? false,
          isAdmin: user.isAdmin ?? false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roles,
          stayCount: memberships.length,
          activeStayCount: activeStays,
        };
      })
    );

    return userSummaries;
  },
});

export const getUserDetail = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const [memberships, smsEvents] = await Promise.all([
      ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("smsConsentEvents")
        .withIndex("by_user_recorded_at", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(50),
    ]);

    const enrichedMemberships = await Promise.all(
      memberships.map(async (m) => {
        const stay = await ctx.db.get(m.stayId);
        const host = stay ? await ctx.db.get(stay.hostUserId) : null;
        return {
          ...m,
          stayStatus: stay?.status ?? "unknown",
          referralCode: stay?.referralCode,
          hostName: host?.name ?? "Unknown Host",
        };
      })
    );

    return {
      user,
      memberships: enrichedMemberships,
      smsEvents,
    };
  },
});

export const listStays = query({
  args: {
    statusFilter: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const stays = await ctx.db.query("stays").order("desc").take(150);
    const search = args.searchTerm?.trim().toLowerCase();

    const staySummaries = await Promise.all(
      stays.map(async (stay) => {
        const [host, memberships, terms, obligations, contributions] = await Promise.all([
          ctx.db.get(stay.hostUserId),
          ctx.db
            .query("memberships")
            .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
            .collect(),
          stay.currentTermsId ? ctx.db.get(stay.currentTermsId) : null,
          ctx.db
            .query("obligations")
            .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
            .collect(),
          ctx.db
            .query("contributions")
            .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
            .collect(),
        ]);

        const guestMemberships = memberships.filter((m) => m.role === "guest" && m.status === "active");
        const guestUsers = await Promise.all(
          guestMemberships.map(async (gm) => {
            const gu = await ctx.db.get(gm.userId);
            return gu?.name ?? "Unknown Guest";
          })
        );

        let totalObligationsCents = 0;
        for (const ob of obligations) {
          if (!ob.voidedAt) totalObligationsCents += ob.baseAmountCents;
        }

        let totalConfirmedCents = 0;
        let disputedCount = 0;
        for (const c of contributions) {
          if (c.status === "confirmed") totalConfirmedCents += c.amountCents;
          if (c.status === "disputed") disputedCount += 1;
        }

        return {
          _id: stay._id,
          status: stay.status,
          referralCode: stay.referralCode,
          timezone: stay.timezone,
          createdAt: stay.createdAt,
          hostName: host?.name ?? "Unknown Host",
          hostEmail: host?.email,
          memberCount: memberships.length,
          guestNames: guestUsers,
          terms: terms
            ? {
                startDate: terms.startDate,
                endDate: terms.endDate,
                rateCents: terms.rateCents,
                cadence: terms.cadence,
              }
            : null,
          totalObligationsCents,
          totalConfirmedCents,
          balanceCents: Math.max(0, totalObligationsCents - totalConfirmedCents),
          disputedContributionsCount: disputedCount,
          houseCityState: stay.houseInfo?.cityStateZip,
        };
      })
    );

    return staySummaries.filter((s) => {
      if (args.statusFilter && args.statusFilter !== "all" && s.status !== args.statusFilter) {
        return false;
      }
      if (search) {
        const matchesRef = s.referralCode?.toLowerCase().includes(search);
        const matchesHost = s.hostName.toLowerCase().includes(search);
        const matchesGuest = s.guestNames.some((g) => g.toLowerCase().includes(search));
        const matchesCity = s.houseCityState?.toLowerCase().includes(search);
        return Boolean(matchesRef || matchesHost || matchesGuest || matchesCity);
      }
      return true;
    });
  },
});

export const getStayDetail = query({
  args: {
    stayId: v.id("stays"),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const stay = await ctx.db.get(args.stayId);
    if (!stay) return null;

    const [host, memberships, terms, obligations, contributions, chores, announcements, recentActivity] =
      await Promise.all([
        ctx.db.get(stay.hostUserId),
        ctx.db
          .query("memberships")
          .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
          .collect(),
        stay.currentTermsId ? ctx.db.get(stay.currentTermsId) : null,
        ctx.db
          .query("obligations")
          .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
          .collect(),
        ctx.db
          .query("contributions")
          .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
          .collect(),
        ctx.db
          .query("chores")
          .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
          .collect(),
        ctx.db
          .query("announcements")
          .withIndex("by_stay", (q) => q.eq("stayId", stay._id))
          .collect(),
        ctx.db
          .query("activity")
          .withIndex("by_stay_created_at", (q) => q.eq("stayId", stay._id))
          .order("desc")
          .take(25),
      ]);

    const enrichedMembers = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                imageUrl: user.imageUrl,
              }
            : null,
        };
      })
    );

    const redactedStay = {
      _id: stay._id,
      _creationTime: stay._creationTime,
      hostUserId: stay.hostUserId,
      householdAccountId: stay.householdAccountId,
      name: stay.name,
      status: stay.status,
      referralCode: stay.referralCode,
      timezone: stay.timezone,
      currentTermsId: stay.currentTermsId,
      nextCheckInDate: stay.nextCheckInDate,
      createdAt: stay.createdAt,
      updatedAt: stay.updatedAt,
      houseInfoSummary: {
        cityStateZip: stay.houseInfo?.cityStateZip,
        hasStreetAddress: Boolean(stay.houseInfo?.streetAddress),
        hasWifiConfigured: Boolean(stay.houseInfo?.wifiNetwork || stay.houseInfo?.wifiPassword),
        hasDoorCodeConfigured: Boolean(stay.houseInfo?.doorCode),
        hasEmergencyContact: Boolean(stay.houseInfo?.emergencyContact),
        hasOtherNotes: Boolean(stay.houseInfo?.otherNotes),
      },
    };

    return {
      stay: redactedStay,
      host: host
        ? {
            _id: host._id,
            clerkUserId: host.clerkUserId,
            name: host.name,
            email: host.email,
            phone: host.phone,
            imageUrl: host.imageUrl,
          }
        : null,
      members: enrichedMembers,
      terms,
      obligations,
      contributions,
      chores,
      announcements,
      activity: recentActivity,
    };
  },
});


export const listDisputesAndLedgers = query({
  args: {
    statusFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const allContributions = await ctx.db.query("contributions").order("desc").take(200);
    const filter = args.statusFilter ?? "all";

    const filtered = allContributions.filter((c) => {
      if (filter === "disputed") return c.status === "disputed";
      if (filter === "pending") return c.status === "pending";
      if (filter === "confirmed") return c.status === "confirmed";
      return true;
    });

    const enrichedContributions = await Promise.all(
      filtered.map(async (c) => {
        const [stay, creator, guest] = await Promise.all([
          ctx.db.get(c.stayId),
          ctx.db.get(c.createdBy),
          c.guestUserId ? ctx.db.get(c.guestUserId) : null,
        ]);
        return {
          ...c,
          referralCode: stay?.referralCode,
          stayStatus: stay?.status,
          creatorName: creator?.name ?? "Unknown user",
          guestName: guest?.name ?? "Household / All",
        };
      })
    );

    // Also collect audited obligations (late fee waived or voided)
    const obligations = await ctx.db.query("obligations").order("desc").take(150);
    const auditedObligations = obligations
      .filter((ob) => ob.lateFeeWaivedAt || ob.voidedAt)
      .map((ob) => ({
        _id: ob._id,
        stayId: ob.stayId,
        title: ob.title,
        dueDate: ob.dueDate,
        baseAmountCents: ob.baseAmountCents,
        type: ob.type,
        lateFeeWaivedAt: ob.lateFeeWaivedAt,
        voidedAt: ob.voidedAt,
        createdAt: ob.createdAt,
      }));

    return {
      contributions: enrichedContributions,
      auditedObligations,
    };
  },
});

export const listSmsComplianceEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const events = await ctx.db
      .query("smsConsentEvents")
      .order("desc")
      .take(args.limit ?? 100);

    const enrichedEvents = await Promise.all(
      events.map(async (evt) => {
        const user = await ctx.db.get(evt.userId);
        return {
          ...evt,
          userName: user?.name ?? "Unknown user",
          userEmail: user?.email,
        };
      })
    );

    return enrichedEvents;
  },
});

export const toggleAdmin = mutation({
  args: {
    userId: v.id("users"),
    isAdmin: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: actorUser, identity, isExplicitEnvAdmin } = await requirePlatformAdmin(ctx);
    if (!isExplicitEnvAdmin) {
      throw new Error("Forbidden: Only explicit environment-allowlisted operators can grant or revoke platform admin access");
    }

    const auditReason = requireAuditReason(args.reason);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    const previousIsAdmin = Boolean(targetUser.isAdmin);
    await ctx.db.patch(args.userId, {
      isAdmin: args.isAdmin,
      updatedAt: Date.now(),
    });

    await recordPlatformAuditLog(ctx, {
      actorUser,
      actorEmail: actorUser.email ?? identity.email,
      action: args.isAdmin ? "platform_admin.grant" : "platform_admin.revoke",
      provider: "clerk_convex",
      targetType: "user",
      targetId: args.userId,
      reason: auditReason,
      metadata: {
        targetClerkUserId: targetUser.clerkUserId,
        previousIsAdmin,
        newIsAdmin: args.isAdmin,
      },
    });

    return { success: true, userId: args.userId, isAdmin: args.isAdmin };
  },
});

export const getPlatformOpsOverview = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);

    const [
      householdAccounts,
      subscriptionSnapshots,
      providerEvents,
      notifications,
      notificationEvents,
      marketingConsents,
      stays,
      auditLogs,
    ] = await Promise.all([
      ctx.db.query("householdAccounts").collect(),
      ctx.db.query("subscriptionSnapshots").collect(),
      ctx.db.query("providerEvents").order("desc").take(100),
      ctx.db.query("notifications").order("desc").take(100),
      ctx.db.query("notificationEvents").withIndex("by_occurred_at").order("desc").take(100),
      ctx.db.query("marketingConsentEvents").withIndex("by_updated_at").order("desc").take(100),
      ctx.db.query("stays").collect(),
      ctx.db.query("platformAuditLogs").withIndex("by_created_at").order("desc").take(25),
    ]);

    const expectedSubEnv = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT ?? null;
    const hasRevenueCatWebhookAuth = Boolean(process.env.REVENUECAT_WEBHOOK_AUTHORIZATION?.trim());
    const hasRevenueCatAppId = Boolean(process.env.REVENUECAT_APP_ID?.trim());
    const hasKnockApiKey = Boolean(process.env.KNOCK_API_KEY?.trim());
    const hasLoopsApiKey = Boolean(process.env.LOOPS_API_KEY?.trim());

    const rcErrors = providerEvents.filter((e) => Boolean(e.processingError));
    const latestRcEventAt = providerEvents[0]?.receivedAt ?? null;

    const failedNotifications = notificationEvents.filter((e) => e.status === "failed");
    const latestKnockSentAt =
      notificationEvents.find((e) => e.status === "sent")?.lastAttemptAt ??
      notifications[0]?.sentAt ??
      null;

    const latestLoopsEventAt = marketingConsents[0]?.updatedAt ?? null;
    const missingAccountLinks = stays.filter((s) => !s.householdAccountId).length;

    return {
      providers: {
        revenueCat: {
          configured: Boolean(expectedSubEnv && hasRevenueCatWebhookAuth),
          expectedEnvironment: expectedSubEnv,
          hasWebhookAuthorization: hasRevenueCatWebhookAuth,
          hasAppId: hasRevenueCatAppId,
          householdAccountsCount: householdAccounts.length,
          snapshotsCount: subscriptionSnapshots.length,
          recentEventsCount: providerEvents.length,
          recentFailuresCount: rcErrors.length,
          lastEventAt: latestRcEventAt,
          missingHouseholdLinksCount: missingAccountLinks,
          dashboardUrl: "https://app.revenuecat.com",
        },
        knock: {
          configured: hasKnockApiKey,
          recentSentCount: notifications.length,
          recentEventsCount: notificationEvents.length,
          recentFailuresCount: failedNotifications.length,
          lastEventAt: latestKnockSentAt,
          dashboardUrl: "https://dashboard.knock.app",
        },
        loops: {
          configured: hasLoopsApiKey,
          totalConsentRecords: marketingConsents.length,
          subscribedCount: marketingConsents.filter((m) => m.status === "subscribed").length,
          suppressedOrUnsubscribedCount: marketingConsents.filter(
            (m) => m.status === "unsubscribed" || m.status === "suppressed",
          ).length,
          lastEventAt: latestLoopsEventAt,
          dashboardUrl: "https://app.loops.so",
        },
      },
      recentAuditLogs: auditLogs,
    };
  },
});

export const getRevenueCatOps = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);

    const [accounts, snapshots, events, stays] = await Promise.all([
      ctx.db.query("householdAccounts").collect(),
      ctx.db.query("subscriptionSnapshots").collect(),
      ctx.db.query("providerEvents").order("desc").take(100),
      ctx.db.query("stays").collect(),
    ]);

    const expectedEnvironment = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT ?? null;
    const validExpectedEnv =
      expectedEnvironment === "production" || expectedEnvironment === "sandbox"
        ? expectedEnvironment
        : undefined;

    const accountMap = new Map(accounts.map((a) => [a._id, a]));
    let missingAccountLinks = 0;
    let ownerMismatches = 0;
    let linkedStays = 0;

    for (const stay of stays) {
      if (!stay.householdAccountId) {
        missingAccountLinks += 1;
        continue;
      }
      linkedStays += 1;
      const acct = accountMap.get(stay.householdAccountId);
      if (!acct || acct.ownerUserId !== stay.hostUserId) {
        ownerMismatches += 1;
      }
    }

    const enrichedSnapshots = await Promise.all(
      snapshots.map(async (snap) => {
        const account = accountMap.get(snap.householdAccountId);
        const owner = account ? await ctx.db.get(account.ownerUserId) : null;
        const effective =
          account && validExpectedEnv
            ? await getEffectiveSubscriptionForAccount(ctx, account._id, validExpectedEnv)
            : null;

        return {
          _id: snap._id,
          householdAccountId: snap.householdAccountId,
          ownerName: owner?.name ?? "Unknown Host",
          ownerEmailRedacted: redactEmail(owner?.email),
          ownerClerkUserId: owner?.clerkUserId ?? snap.providerAppUserId,
          provider: snap.provider,
          environment: snap.environment,
          status: snap.status,
          entitlement: snap.entitlement ?? "none",
          effectivePlan: effective?.plan ?? "starter",
          productId: snap.productId ?? "—",
          startedAt: snap.startedAt,
          currentPeriodEndsAt: snap.currentPeriodEndsAt,
          willRenew: snap.willRenew,
          latestProviderEventAt: snap.latestProviderEventAt,
          updatedAt: snap.updatedAt,
          environmentMatchesExpected: validExpectedEnv ? snap.environment === validExpectedEnv : false,
        };
      }),
    );

    const enrichedEvents = await Promise.all(
      events.map(async (evt) => {
        const account = evt.householdAccountId ? accountMap.get(evt.householdAccountId) : undefined;
        const owner = account ? await ctx.db.get(account.ownerUserId) : null;
        return {
          _id: evt._id,
          provider: evt.provider,
          providerEventId: evt.providerEventId,
          householdAccountId: evt.householdAccountId,
          ownerName: owner?.name ?? "Unknown Host",
          eventType: evt.eventType,
          productId: evt.productId ?? "—",
          environment: evt.environment,
          occurredAt: evt.occurredAt,
          receivedAt: evt.receivedAt,
          processedAt: evt.processedAt,
          processingError: evt.processingError,
        };
      }),
    );

    return {
      config: {
        expectedEnvironment,
        hasWebhookAuthorization: Boolean(process.env.REVENUECAT_WEBHOOK_AUTHORIZATION?.trim()),
        hasAppId: Boolean(process.env.REVENUECAT_APP_ID?.trim()),
        dashboardUrl: "https://app.revenuecat.com",
      },
      reconciliation: {
        totalStays: stays.length,
        linkedStays,
        missingAccountLinks,
        ownerMismatches,
        totalHouseholdAccounts: accounts.length,
      },
      snapshots: enrichedSnapshots.sort((a, b) => b.updatedAt - a.updatedAt),
      events: enrichedEvents,
      webhookErrors: enrichedEvents.filter((e) => Boolean(e.processingError)),
    };
  },
});

export const reconcileHouseholdOwnership = mutation({
  args: {
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { user: actorUser, identity } = await requirePlatformAdmin(ctx);
    const auditReason = requireAuditReason(args.reason);

    const stays = await ctx.db.query("stays").take(250);
    let linked = 0;
    let alreadyLinked = 0;
    let ownerMismatches = 0;

    for (const stay of stays) {
      if (stay.householdAccountId) {
        const account = await ctx.db.get(stay.householdAccountId);
        if (!account || account.ownerUserId !== stay.hostUserId) {
          ownerMismatches += 1;
          continue;
        }
        alreadyLinked += 1;
        continue;
      }
      const householdAccountId = await getOrCreateHouseholdAccount(ctx, stay.hostUserId);
      await ctx.db.patch(stay._id, { householdAccountId });
      linked += 1;
    }

    const auditLogId = await recordPlatformAuditLog(ctx, {
      actorUser,
      actorEmail: actorUser.email ?? identity.email,
      action: "revenuecat.reconcile_household_ownership",
      provider: "revenuecat",
      targetType: "household_accounts",
      targetId: "batch",
      reason: auditReason,
      metadata: {
        scannedStays: stays.length,
        linked,
        alreadyLinked,
        ownerMismatches,
      },
    });

    return {
      scannedStays: stays.length,
      linked,
      alreadyLinked,
      ownerMismatches,
      auditLogId,
    };
  },
});

export const getKnockOps = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);

    const now = Date.now();
    const utcToday = calendarDateInTimezone(new Date(now), "UTC");

    const [notificationEvents, recentSent] = await Promise.all([
      ctx.db.query("notificationEvents").withIndex("by_occurred_at").order("desc").take(100),
      ctx.db.query("notifications").order("desc").take(100),
    ]);

    const cappedUsersToday = new Set<string>();
    for (const n of recentSent) {
      if (!REMINDER_WORKFLOWS.has(n.workflow)) continue;
      const dateStr = extractNotificationCalendarDate(n, "UTC", now);
      if (dateStr === utcToday) {
        cappedUsersToday.add(n.userId.toString());
      }
    }

    const enrichedEvents = await Promise.all(
      notificationEvents.map(async (evt) => {
        const [recipient, stay] = await Promise.all([
          ctx.db.get(evt.userId),
          evt.stayId ? ctx.db.get(evt.stayId) : null,
        ]);
        const retriedBy = evt.retriedByUserId ? await ctx.db.get(evt.retriedByUserId) : null;
        return {
          _id: evt._id,
          userId: evt.userId,
          recipientName: recipient?.name ?? "Unknown User",
          recipientEmailRedacted: redactEmail(recipient?.email),
          stayId: evt.stayId,
          stayReferralCode: stay?.referralCode ?? "—",
          workflow: evt.workflow,
          entityId: evt.entityId ?? "—",
          cancellationKey: evt.cancellationKey ?? "—",
          status: evt.status,
          workflowRunId: evt.workflowRunId,
          errorSummary: evt.errorSummary,
          attemptCount: evt.attemptCount,
          occurredAt: evt.occurredAt,
          lastAttemptAt: evt.lastAttemptAt,
          retriedByName: retriedBy?.name,
          retryReason: evt.retryReason,
          isReminderWorkflow: REMINDER_WORKFLOWS.has(evt.workflow),
        };
      }),
    );

    const enrichedLegacySent = await Promise.all(
      recentSent.slice(0, 50).map(async (n) => {
        const [recipient, stay] = await Promise.all([
          ctx.db.get(n.userId),
          n.stayId ? ctx.db.get(n.stayId) : null,
        ]);
        return {
          _id: n._id,
          userId: n.userId,
          recipientName: recipient?.name ?? "Unknown User",
          recipientEmailRedacted: redactEmail(recipient?.email),
          stayReferralCode: stay?.referralCode ?? "—",
          workflow: n.workflow,
          entityId: n.entityId ?? "—",
          sentAt: n.sentAt,
        };
      }),
    );

    const workflows = [
      {
        key: "payment-due-reminder",
        category: "Reminder (1/day cap, Priority 1)",
        trigger: "Hourly cron (processDueReminders)",
        cancellationPattern: "N/A (deduplicated by entityId & daily cap)",
      },
      {
        key: "agreement-pending",
        category: "Reminder (1/day cap, AM/PM sweep)",
        trigger: "Twice-daily cron (processAgreementPendingSweep)",
        cancellationPattern: "agreement-pending:${stayId}:${userId} (cancelled on acceptTerms)",
      },
      {
        key: "chore-reminder",
        category: "Reminder (1/day cap, Priority 2)",
        trigger: "Hourly cron (processDueReminders)",
        cancellationPattern: "chore:${choreId}:${localDate}",
      },
      {
        key: "check-in-reminder",
        category: "Reminder (1/day cap, Priority 3)",
        trigger: "Hourly cron (processDueReminders)",
        cancellationPattern: "check-in:${stayId}:${localTomorrow}",
      },
      {
        key: "guest-invitation",
        category: "Transactional",
        trigger: "On host invite creation (invites.create)",
        cancellationPattern: "N/A (single transactional invite)",
      },
      {
        key: "adhoc-fee-posted",
        category: "Transactional",
        trigger: "On host posting ad-hoc obligation (obligations.addAdHoc)",
        cancellationPattern: "adhoc-fee:${obligationId}",
      },
    ];

    return {
      config: {
        hasApiKey: Boolean(process.env.KNOCK_API_KEY?.trim()),
        dailyReminderCapPerUser: 1,
        cappedUsersTodayCount: cappedUsersToday.size,
        dashboardUrl: "https://dashboard.knock.app",
      },
      workflows,
      events: enrichedEvents,
      failures: enrichedEvents.filter((e) => e.status === "failed" || e.status === "skipped"),
      cancellations: enrichedEvents.filter((e) => e.status === "cancelled"),
      recentDeliveries: enrichedLegacySent,
    };
  },
});

export const retryNotificationEvent = mutation({
  args: {
    eventId: v.id("notificationEvents"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { user: actorUser, identity } = await requirePlatformAdmin(ctx);
    const auditReason = requireAuditReason(args.reason);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Notification event not found");
    }

    if (event.status !== "failed" && event.status !== "skipped") {
      throw new Error(`Cannot retry notification event in '${event.status}' state; only failed or skipped events can be retried`);
    }

    const alreadySent = await ctx.db
      .query("notifications")
      .withIndex("by_user_workflow_and_entity", (query) =>
        query.eq("userId", event.userId).eq("workflow", event.workflow).eq("entityId", event.entityId),
      )
      .first();
    if (alreadySent) {
      throw new Error("Notification was already delivered for this recipient and entity (idempotency guard)");
    }

    const stay = event.stayId ? await ctx.db.get(event.stayId) : null;
    if (event.stayId && (!stay || stay.status === "ended")) {
      throw new Error("Cannot retry notification for an ended or missing stay");
    }

    const now = Date.now();
    if (REMINDER_WORKFLOWS.has(event.workflow)) {
      const timezone = stay?.timezone ?? "UTC";
      const localToday = calendarDateInTimezone(new Date(now), timezone);
      const capped = await hasUserReceivedReminderOnDate(ctx, event.userId, localToday, timezone, now);
      if (capped) {
        throw new Error("Recipient has already received a reminder today (1/day reminder cap)");
      }
    }

    await ctx.db.patch(event._id, {
      lastAttemptAt: now,
      retriedByUserId: actorUser._id,
      retryReason: auditReason,
    });

    await ctx.scheduler.runAfter(0, internal.knock.retryFailedEvent, {
      eventId: event._id,
    });

    const auditLogId = await recordPlatformAuditLog(ctx, {
      actorUser,
      actorEmail: actorUser.email ?? identity.email,
      action: "knock.retry_notification_event",
      provider: "knock",
      targetType: "notification_event",
      targetId: event._id,
      reason: auditReason,
      metadata: {
        workflow: event.workflow,
        previousStatus: event.status,
        attemptCount: event.attemptCount,
        recipientUserId: event.userId,
      },
    });

    return {
      queued: true,
      eventId: event._id,
      auditLogId,
    };
  },
});

export const getLoopsOps = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);

    const consents = await ctx.db
      .query("marketingConsentEvents")
      .withIndex("by_updated_at")
      .order("desc")
      .take(100);

    const counts = {
      total: consents.length,
      subscribed: consents.filter((c) => c.status === "subscribed").length,
      pendingConfirmation: consents.filter((c) => c.status === "pending_confirmation").length,
      unsubscribed: consents.filter((c) => c.status === "unsubscribed").length,
      suppressed: consents.filter((c) => c.status === "suppressed").length,
    };

    return {
      config: {
        hasApiKey: Boolean(process.env.LOOPS_API_KEY?.trim()),
        hasFormId: Boolean(
          process.env.PUBLIC_LOOPS_FORM_ID?.trim() || process.env.NEXT_PUBLIC_LOOPS_FORM_ID?.trim(),
        ),
        sendingDomain: "mail.kouchd.com",
        replyToEmail: "hello@kouchd.com",
        allowedOptInSource: "Kouchd marketing website",
        doubleOptInRequired: true,
        autoAddHostsOrGuests: false,
        dashboardUrl: "https://app.loops.so",
      },
      counts,
      consents: consents.map((c) => ({
        _id: c._id,
        emailRedacted: redactEmail(c.email) ?? "***",
        status: c.status,
        source: c.source,
        consentConfirmed: c.consentConfirmed,
        doubleOptInStatus: c.doubleOptInStatus,
        requestedAt: c.requestedAt,
        confirmedAt: c.confirmedAt,
        unsubscribedAt: c.unsubscribedAt,
        suppressedAt: c.suppressedAt,
        updatedAt: c.updatedAt,
      })),
    };
  },
});

export const listPlatformAuditLogs = query({
  args: {
    provider: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const limit = Math.min(args.limit ?? 100, 250);

    const logs = args.provider
      ? await ctx.db
          .query("platformAuditLogs")
          .withIndex("by_provider_created_at", (q) => q.eq("provider", args.provider))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("platformAuditLogs")
          .withIndex("by_created_at")
          .order("desc")
          .take(limit);

    return await Promise.all(
      logs.map(async (log) => {
        const actor = await ctx.db.get(log.actorUserId);
        return {
          ...log,
          actorName: actor?.name ?? "Platform Operator",
        };
      }),
    );
  },
});
