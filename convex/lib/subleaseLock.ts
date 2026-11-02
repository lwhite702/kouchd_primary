import { calendarDateInTimezone } from "../../lib/domain/dates";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { recordActivity } from "./activity";
import {
  ensureObligationsForTerms,
  listActiveGuestObligations,
} from "./obligations";
import {
  getEffectiveSubscriptionForAccount,
  resolveHouseholdOwnerForStay,
} from "./subscriptionAccess";

export const SUBLEASE_BILLING_RETRY_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export const HOST_SUBLEASE_LOCK_MESSAGE =
  "Your Plus subscription has ended. This sublease is locked and exports are blocked until you have an active subscription.";

export const GUEST_SUBLEASE_LOCK_MESSAGE =
  "This sublease is read-only and exports are blocked until the host renews. Your sublease agreement still applies, so keep paying rent as agreed. Kouchd's record being locked doesn't change it.";

export const HOST_BILLING_RETRY_WARNING_MESSAGE =
  "We couldn't process your Kouchd Plus payment. Update your billing method within 7 days to keep this sublease active and unlocked.";

export interface SubleaseLockEvaluation {
  locked: boolean;
  billingRetryWarning: boolean;
  operationalAlert: boolean;
  reason: string | null;
}

export type SubleaseLockSnapshotInput = Pick<
  Doc<"subscriptionSnapshots">,
  | "status"
  | "entitlement"
  | "currentPeriodEndsAt"
  | "billingRetryStartedAt"
  | "latestProviderEventAt"
  | "updatedAt"
>;

export function evaluateSubleaseLockFromSnapshot(args: {
  arrangement?: "home_stay" | "sublease";
  environmentConfigured: boolean;
  snapshot: SubleaseLockSnapshotInput | null;
  nowMs?: number;
}): SubleaseLockEvaluation {
  const nowMs = args.nowMs ?? Date.now();

  if (args.arrangement !== "sublease") {
    return {
      locked: false,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: null,
    };
  }

  if (!args.environmentConfigured) {
    return {
      locked: false,
      billingRetryWarning: false,
      operationalAlert: true,
      reason: null,
    };
  }

  if (!args.snapshot) {
    return {
      locked: true,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: "no_subscription",
    };
  }

  const hasPaidEntitlement =
    args.snapshot.entitlement === "plus" || args.snapshot.entitlement === "pro";

  switch (args.snapshot.status) {
    case "unknown":
      return {
        locked: false,
        billingRetryWarning: false,
        operationalAlert: true,
        reason: null,
      };
    case "expired":
    case "refunded":
      return {
        locked: true,
        billingRetryWarning: false,
        operationalAlert: false,
        reason: args.snapshot.status,
      };
    case "billing_retry": {
      const retryStart =
        args.snapshot.billingRetryStartedAt ??
        args.snapshot.latestProviderEventAt ??
        args.snapshot.updatedAt;
      if (nowMs - retryStart > SUBLEASE_BILLING_RETRY_GRACE_MS) {
        return {
          locked: true,
          billingRetryWarning: false,
          operationalAlert: false,
          reason: "billing_retry_exceeded",
        };
      }
      return {
        locked: false,
        billingRetryWarning: true,
        operationalAlert: false,
        reason: null,
      };
    }
    case "grace_period":
      if (
        args.snapshot.currentPeriodEndsAt !== undefined &&
        nowMs < args.snapshot.currentPeriodEndsAt &&
        hasPaidEntitlement
      ) {
        return {
          locked: false,
          billingRetryWarning: false,
          operationalAlert: false,
          reason: null,
        };
      }
      return {
        locked: true,
        billingRetryWarning: false,
        operationalAlert: false,
        reason: "grace_ended",
      };
    case "active":
    case "canceled":
      if (
        args.snapshot.currentPeriodEndsAt !== undefined &&
        nowMs < args.snapshot.currentPeriodEndsAt &&
        hasPaidEntitlement
      ) {
        return {
          locked: false,
          billingRetryWarning: false,
          operationalAlert: false,
          reason: null,
        };
      }
      return {
        locked: true,
        billingRetryWarning: false,
        operationalAlert: false,
        reason: "period_ended",
      };
    default:
      return {
        locked: false,
        billingRetryWarning: false,
        operationalAlert: true,
        reason: null,
      };
  }
}

export async function getSubleaseLockState(
  ctx: QueryCtx | MutationCtx,
  stay: Doc<"stays">,
  nowMs = Date.now(),
): Promise<SubleaseLockEvaluation> {
  if (stay.arrangement !== "sublease") {
    return {
      locked: false,
      billingRetryWarning: false,
      operationalAlert: false,
      reason: null,
    };
  }

  const env = process.env.SUBSCRIPTION_EXPECTED_ENVIRONMENT;
  const environmentConfigured = env === "production" || env === "sandbox";
  if (!environmentConfigured) {
    return evaluateSubleaseLockFromSnapshot({
      arrangement: stay.arrangement,
      environmentConfigured: false,
      snapshot: null,
      nowMs,
    });
  }

  const owner = await resolveHouseholdOwnerForStay(ctx, stay);
  if (!owner.householdAccountId) {
    return evaluateSubleaseLockFromSnapshot({
      arrangement: stay.arrangement,
      environmentConfigured: true,
      snapshot: null,
      nowMs,
    });
  }

  const { snapshot } = await getEffectiveSubscriptionForAccount(
    ctx,
    owner.householdAccountId,
    env,
    nowMs,
  );

  return evaluateSubleaseLockFromSnapshot({
    arrangement: stay.arrangement,
    environmentConfigured: true,
    snapshot,
    nowMs,
  });
}

export async function assertSubleaseUnlocked(
  ctx: QueryCtx | MutationCtx,
  stayOrId: Doc<"stays"> | Id<"stays">,
  options?: { allowHostEnd?: boolean; viewerRole?: "host" | "guest" },
): Promise<void> {
  const stay =
    typeof stayOrId === "string" ? await ctx.db.get(stayOrId) : stayOrId;
  if (!stay) return;
  if (stay.arrangement !== "sublease") return;
  if (options?.allowHostEnd && options?.viewerRole === "host") return;

  const lock = await getSubleaseLockState(ctx, stay);
  if (lock.locked) {
    throw new Error(
      options?.viewerRole === "guest"
        ? GUEST_SUBLEASE_LOCK_MESSAGE
        : HOST_SUBLEASE_LOCK_MESSAGE,
    );
  }
}

const SCAN_LIMIT = 50;

export async function reconcileAccountSubleaseLocks(
  ctx: MutationCtx,
  householdAccountId: Id<"householdAccounts">,
  environment: string,
  nowMs = Date.now(),
): Promise<void> {
  const account = await ctx.db.get(householdAccountId);
  if (!account) return;

  const groups = await Promise.all(
    (["active", "pending"] as const).flatMap((status) => [
      ctx.db
        .query("stays")
        .withIndex("by_household_account_status", (q) =>
          q.eq("householdAccountId", householdAccountId).eq("status", status),
        )
        .take(SCAN_LIMIT),
      ctx.db
        .query("stays")
        .withIndex("by_host_account_status", (q) =>
          q
            .eq("hostUserId", account.ownerUserId)
            .eq("householdAccountId", undefined)
            .eq("status", status),
        )
        .take(SCAN_LIMIT),
    ]),
  );

  const stays = [
    ...new Map(groups.flat().map((stay) => [stay._id, stay])).values(),
  ].filter(
    (stay) => stay.arrangement === "sublease" && stay.status !== "ended",
  );
  if (stays.length === 0) return;

  const { snapshot } = await getEffectiveSubscriptionForAccount(
    ctx,
    householdAccountId,
    environment,
    nowMs,
  );
  const envConfigured =
    environment === "production" || environment === "sandbox";

  for (const stay of stays) {
    const lock = evaluateSubleaseLockFromSnapshot({
      arrangement: stay.arrangement,
      environmentConfigured: envConfigured,
      snapshot,
      nowMs,
    });
    const stayName = stay.name ?? "Sublease";
    const guestMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_stay_role_status", (q) =>
        q.eq("stayId", stay._id).eq("role", "guest").eq("status", "active"),
      )
      .take(SCAN_LIMIT);

    if (lock.locked && !stay.subleaseLockedAt) {
      await ctx.db.patch(stay._id, {
        subleaseLockedAt: nowMs,
        updatedAt: nowMs,
      });
      await recordActivity(ctx, {
        stayId: stay._id,
        actorType: "system",
        kind: "stay",
        action: "sublease_locked",
        detail: HOST_SUBLEASE_LOCK_MESSAGE,
        entityId: stay._id,
      });
      await ctx.scheduler.runAfter(0, internal.knock.triggerWorkflow, {
        userId: stay.hostUserId,
        stayId: stay._id,
        workflow: "sublease-lock-notice",
        entityId: `sublease-lock:${stay._id}:${nowMs}`,
        data: {
          role: "host",
          message: HOST_SUBLEASE_LOCK_MESSAGE,
          detail: HOST_SUBLEASE_LOCK_MESSAGE,
          action: "sublease_locked",
          stayName,
        },
      });
      for (const guest of guestMemberships) {
        await ctx.scheduler.runAfter(0, internal.knock.triggerWorkflow, {
          userId: guest.userId,
          stayId: stay._id,
          workflow: "sublease-lock-notice",
          entityId: `sublease-lock:${stay._id}:${guest.userId}:${nowMs}`,
          data: {
            role: "guest",
            message: GUEST_SUBLEASE_LOCK_MESSAGE,
            detail: GUEST_SUBLEASE_LOCK_MESSAGE,
            action: "sublease_locked",
            stayName,
          },
        });
      }
    } else if (!lock.locked && stay.subleaseLockedAt) {
      const lockedStartDate = calendarDateInTimezone(
        new Date(stay.subleaseLockedAt),
        stay.timezone,
      );
      const today = calendarDateInTimezone(new Date(nowMs), stay.timezone);
      await ctx.db.patch(stay._id, {
        subleaseLockedAt: undefined,
        updatedAt: nowMs,
      });

      for (const guest of guestMemberships) {
        if (guest.acceptedTermsId) {
          await ensureObligationsForTerms(
            ctx,
            stay._id,
            guest.acceptedTermsId,
            guest.userId,
            stay.hostUserId,
          );
        }
        const obligations = await listActiveGuestObligations(
          ctx,
          stay._id,
          guest.userId,
        );
        for (const obligation of obligations) {
          if (
            !obligation.lateFeeWaivedAt &&
            obligation.dueDate >= lockedStartDate &&
            obligation.dueDate <= today
          ) {
            await ctx.db.patch(obligation._id, {
              lateFeeWaivedAt: nowMs,
              lateFeeWaivedBy: stay.hostUserId,
            });
          }
        }
        const renewalDetail =
          "Your sublease workspace is active again. Scheduled rent records for the locked period are up to date with no late fees for that time.";
        await ctx.scheduler.runAfter(0, internal.knock.triggerWorkflow, {
          userId: guest.userId,
          stayId: stay._id,
          workflow: "sublease-renewed-summary",
          entityId: `sublease-renewed:${stay._id}:${guest.userId}:${nowMs}`,
          data: {
            stayName,
            detail: renewalDetail,
            message: renewalDetail,
            action: "sublease_unlocked",
          },
        });
      }

      await recordActivity(ctx, {
        stayId: stay._id,
        actorType: "system",
        kind: "stay",
        action: "sublease_unlocked",
        detail:
          "Plus subscription renewed; sublease unlocked and locked-period late fees waived",
        entityId: stay._id,
      });
    } else if (lock.billingRetryWarning) {
      await ctx.scheduler.runAfter(0, internal.knock.triggerWorkflow, {
        userId: stay.hostUserId,
        stayId: stay._id,
        workflow: "sublease-billing-retry-warning",
        entityId: `sublease-retry:${stay._id}:${snapshot?.billingRetryStartedAt ?? nowMs}`,
        data: {
          stayName,
          detail: HOST_BILLING_RETRY_WARNING_MESSAGE,
          message: HOST_BILLING_RETRY_WARNING_MESSAGE,
          action: "sublease_billing_retry_warning",
        },
      });
    }
  }
}
