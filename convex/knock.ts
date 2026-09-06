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
    if (!recipient) return { status: "disabled" as const };
    const knock = client();
    if (!knock) return { status: "skipped" as const };

    await knock.users.update(recipient.id, {
      name: recipient.name,
      email: recipient.email ?? null,
      phone_number: recipient.phone ?? null,
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
    });
    await ctx.runMutation(internal.notifications.recordSent, {
      userId: args.userId,
      stayId: args.stayId,
      workflow: args.workflow,
      entityId: args.entityId,
    });
    return { status: "sent" as const, workflowRunId: response.workflow_run_id };
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
