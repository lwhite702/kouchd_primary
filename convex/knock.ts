"use node";

import Knock from "@knocklabs/node";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const deliveryResult = v.object({
  status: v.union(v.literal("sent"), v.literal("duplicate"), v.literal("disabled"), v.literal("skipped")),
  workflowRunId: v.optional(v.string()),
});

function client() {
  const apiKey = process.env.KNOCK_API_KEY;
  return apiKey ? new Knock({ apiKey }) : null;
}

export const identifyUser = internalAction({
  args: { userId: v.id("users") },
  returns: v.union(v.literal("identified"), v.literal("missing"), v.literal("skipped")),
  handler: async (ctx, { userId }) => {
    const recipient = await ctx.runQuery(internal.notifications.getRecipient, { userId });
    if (!recipient) return "missing";
    const knock = client();
    if (!knock) return "skipped";
    await knock.users.update(recipient.id, {
      name: recipient.name,
      email: recipient.email ?? null,
      phone_number: recipient.phone ?? null,
      role: recipient.role ?? null,
      stayStatus: recipient.stayStatus ?? null,
      stayId: recipient.stayId ?? null,
      preferences: {
        default: {
          channel_types: {
            email: recipient.notifyEmail,
            sms: recipient.notifySms && Boolean(recipient.phone),
            in_app_feed: true,
          },
        },
      },
    });
    return "identified";
  },
});

export const triggerWorkflow = internalAction({
  args: {
    userId: v.id("users"),
    stayId: v.optional(v.id("stays")),
    workflow: v.string(),
    entityId: v.optional(v.string()),
    cancellationKey: v.optional(v.string()),
    data: v.any(),
  },
  returns: deliveryResult,
  handler: async (ctx, args) => {
    const duplicate = await ctx.runQuery(internal.notifications.wasSent, {
      userId: args.userId,
      workflow: args.workflow,
      entityId: args.entityId,
    });
    if (duplicate) return { status: "duplicate" as const };

    const recipient = await ctx.runQuery(internal.notifications.getRecipient, { userId: args.userId });
    if (!recipient) {
      await ctx.runMutation(internal.notifications.recordNotificationOutcome, {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        cancellationKey: args.cancellationKey,
        status: "disabled",
        errorSummary: "Recipient user profile missing or disabled",
      });
      return { status: "disabled" as const };
    }
    const knock = client();
    if (!knock) {
      await ctx.runMutation(internal.notifications.recordNotificationOutcome, {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        cancellationKey: args.cancellationKey,
        status: "skipped",
        errorSummary: "KNOCK_API_KEY not configured",
      });
      return { status: "skipped" as const };
    }

    try {
      await knock.users.update(recipient.id, {
        name: recipient.name,
        email: recipient.email ?? null,
        phone_number: recipient.phone ?? null,
        role: recipient.role ?? null,
        stayStatus: recipient.stayStatus ?? null,
        stayId: recipient.stayId ?? null,
        preferences: {
          default: {
            channel_types: {
              email: recipient.notifyEmail,
              sms: recipient.notifySms && Boolean(recipient.phone),
              in_app_feed: true,
            },
          },
        },
      });
      const response = await knock.workflows.trigger(args.workflow, {
        recipients: [recipient.id],
        data: args.data,
        cancellation_key: args.cancellationKey,
      });
      await ctx.runMutation(internal.notifications.recordSent, {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        cancellationKey: args.cancellationKey,
        workflowRunId: response.workflow_run_id,
        detail: typeof args.data?.detail === "string" ? args.data.detail : undefined,
        action: typeof args.data?.action === "string" ? args.data.action : undefined,
      });
      return { status: "sent" as const, workflowRunId: response.workflow_run_id };
    } catch (error) {
      const errorSummary = error instanceof Error ? error.message : "Knock workflow trigger failed";
      await ctx.runMutation(internal.notifications.recordNotificationOutcome, {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        cancellationKey: args.cancellationKey,
        status: "failed",
        errorSummary,
      });
      throw error;
    }
  },
});

export const deliverAgreementPending = internalAction({
  args: {
    userId: v.id("users"),
    stayId: v.id("stays"),
    workflow: v.string(),
    entityId: v.string(),
    cancellationKey: v.string(),
    data: v.any(),
    expectedTermsId: v.optional(v.id("terms")),
    recipientRole: v.optional(v.union(v.literal("host"), v.literal("guest"))),
    guestUserId: v.optional(v.id("users")),
  },
  returns: deliveryResult,
  handler: async (ctx, args) => {
    if (args.expectedTermsId && args.recipientRole) {
      const isEligible = await ctx.runQuery(internal.notifications.checkAgreementPendingEligibility, {
        stayId: args.stayId,
        userId: args.userId,
        expectedTermsId: args.expectedTermsId,
        recipientRole: args.recipientRole,
        guestUserId: args.guestUserId,
        workflow: args.workflow,
        entityId: args.entityId,
      });
      if (!isEligible) {
        return { status: "skipped" as const };
      }
    } else {
      const duplicate = await ctx.runQuery(internal.notifications.wasSent, {
        userId: args.userId,
        workflow: args.workflow,
        entityId: args.entityId,
      });
      if (duplicate) return { status: "duplicate" as const };
    }

    const recipient = await ctx.runQuery(internal.notifications.getRecipient, { userId: args.userId });
    if (!recipient) {
      await ctx.runMutation(internal.notifications.recordNotificationOutcome, {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        cancellationKey: args.cancellationKey,
        status: "disabled",
        errorSummary: "Recipient user profile missing or disabled",
      });
      return { status: "disabled" as const };
    }
    const knock = client();
    if (!knock) {
      await ctx.runMutation(internal.notifications.recordNotificationOutcome, {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        cancellationKey: args.cancellationKey,
        status: "skipped",
        errorSummary: "KNOCK_API_KEY not configured",
      });
      return { status: "skipped" as const };
    }

    try {
      await knock.users.update(recipient.id, {
        name: recipient.name,
        email: recipient.email ?? null,
        phone_number: recipient.phone ?? null,
        role: recipient.role ?? null,
        stayStatus: recipient.stayStatus ?? null,
        stayId: recipient.stayId ?? null,
        preferences: {
          default: {
            channel_types: {
              email: recipient.notifyEmail,
              sms: recipient.notifySms && Boolean(recipient.phone),
              in_app_feed: true,
            },
          },
        },
      });
      const response = await knock.workflows.trigger(args.workflow, {
        recipients: [recipient.id],
        data: args.data,
        cancellation_key: args.cancellationKey,
      });
      await ctx.runMutation(internal.notifications.recordSent, {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        cancellationKey: args.cancellationKey,
        workflowRunId: response.workflow_run_id,
        detail: typeof args.data?.detail === "string" ? args.data.detail : undefined,
        action: typeof args.data?.action === "string" ? args.data.action : undefined,
      });
      return { status: "sent" as const, workflowRunId: response.workflow_run_id };
    } catch (error) {
      const errorSummary = error instanceof Error ? error.message : "Knock agreement-pending trigger failed";
      await ctx.runMutation(internal.notifications.recordNotificationOutcome, {
        userId: args.userId,
        stayId: args.stayId,
        workflow: args.workflow,
        entityId: args.entityId,
        cancellationKey: args.cancellationKey,
        status: "failed",
        errorSummary,
      });
      throw error;
    }
  },
});


export const cancelWorkflow = internalAction({
  args: {
    workflow: v.string(),
    cancellationKey: v.string(),
    recipients: v.optional(v.array(v.string())),
  },
  returns: v.union(v.literal("cancelled"), v.literal("skipped")),
  handler: async (_ctx, args) => {
    const knock = client();
    if (!knock) return "skipped";
    try {
      await knock.workflows.cancel(args.workflow, {
        cancellation_key: args.cancellationKey,
        recipients: args.recipients ? args.recipients.map((id) => ({ id })) : undefined,
      });
      return "cancelled";
    } catch (error) {
      console.warn(`Knock cancel failed for workflow ${args.workflow}:`, error);
      return "skipped";
    }
  },
});

export const cancelAgreementPending = internalAction({
  args: {
    stayId: v.id("stays"),
    userId: v.id("users"),
    role: v.union(v.literal("host"), v.literal("guest")),
  },
  returns: v.null(),
  handler: async (ctx, { stayId, userId, role }) => {
    const knock = client();
    if (!knock) return null;
    const stay = await ctx.runQuery(internal.notifications.getStayById, { stayId });

    // Cancel self reminder
    try {
      await knock.workflows.cancel("agreement-pending", {
        cancellation_key: `agreement-pending:${stayId}:${userId}`,
      });
    } catch (e) {
      console.warn("Knock cancel (self) failed:", e);
    }

    // If guest accepted, also cancel host's reminder for this guest (both single and consolidated)
    if (role === "guest" && stay?.hostUserId) {
      try {
        await knock.workflows.cancel("agreement-pending", {
          cancellation_key: `agreement-pending:${stayId}:${stay.hostUserId}:${userId}`,
        });
      } catch (e) {
        console.warn("Knock cancel (host-for-guest) failed:", e);
      }
      try {
        await knock.workflows.cancel("agreement-pending", {
          cancellation_key: `agreement-pending:${stayId}:${stay.hostUserId}`,
        });
      } catch (e) {
        console.warn("Knock cancel (host-consolidated) failed:", e);
      }
    }
    return null;
  },
});

export const triggerInvitation = internalAction({
  args: {
    recipientEmail: v.string(),
    hostName: v.string(),
    inviteUrl: v.string(),
    expiresAt: v.number(),
  },
  returns: v.union(v.literal("sent"), v.literal("skipped")),
  handler: async (_ctx, args) => {
    const knock = client();
    if (!knock) return "skipped";
    await knock.workflows.trigger("guest-invitation", {
      recipients: [{ id: args.recipientEmail.toLowerCase(), email: args.recipientEmail.toLowerCase() }],
      data: {
        hostName: args.hostName,
        stayName: "Shared stay",
        inviteUrl: args.inviteUrl,
        expiresAt: new Date(args.expiresAt).toISOString(),
      },
    });
    return "sent";
  },
});

export const retryFailedEvent = internalAction({
  args: {
    eventId: v.id("notificationEvents"),
  },
  returns: v.object({
    status: v.union(v.literal("sent"), v.literal("skipped"), v.literal("duplicate"), v.literal("disabled")),
    reason: v.string(),
    workflowRunId: v.optional(v.string()),
  }),
  handler: async (ctx, { eventId }): Promise<{
    status: "sent" | "skipped" | "duplicate" | "disabled";
    reason: string;
    workflowRunId?: string;
  }> => {
    const check = await ctx.runMutation(internal.notifications.retryEventInternal, { eventId });
    if (!check.eligible || !check.userId || !check.workflow) {
      return {
        status: "skipped",
        reason: check.reason,
      };
    }

    const result = await ctx.runAction(internal.knock.triggerWorkflow, {
      userId: check.userId,
      stayId: check.stayId,
      workflow: check.workflow,
      entityId: check.entityId,
      cancellationKey: check.cancellationKey,
      data: check.data ?? {},
    });

    return {
      status: result.status,
      reason: result.status === "sent" ? "Retry delivered to Knock" : `Retry outcome: ${result.status}`,
      workflowRunId: result.workflowRunId,
    };
  },
});
