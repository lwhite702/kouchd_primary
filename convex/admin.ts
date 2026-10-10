import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/auth";

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
        const actor = await ctx.db.get(act.actorUserId);
        return {
          ...act,
          actorName: actor?.name ?? "Unknown actor",
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

    return {
      stay,
      host,
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
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      isAdmin: args.isAdmin,
      updatedAt: Date.now(),
    });

    return { success: true, userId: args.userId, isAdmin: args.isAdmin };
  },
});
