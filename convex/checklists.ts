import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { recordActivity } from "./lib/activity";
import { requireMembership } from "./lib/auth";
import { assertSubleaseUnlocked } from "./lib/subleaseLock";

const checklistItemValidator = v.object({
  id: v.string(),
  area: v.string(),
  category: v.union(v.literal("private"), v.literal("shared")),
  item: v.string(),
  condition: v.union(
    v.literal("good"),
    v.literal("fair"),
    v.literal("damaged"),
    v.literal("not_applicable"),
  ),
  notes: v.optional(v.string()),
  disputeNote: v.optional(v.string()),
});

export const checklistValidator = v.object({
  _id: v.id("conditionChecklists"),
  _creationTime: v.number(),
  stayId: v.id("stays"),
  guestUserId: v.id("users"),
  type: v.union(v.literal("move_in"), v.literal("move_out")),
  status: v.union(
    v.literal("draft"),
    v.literal("submitted"),
    v.literal("confirmed"),
    v.literal("disputed"),
  ),
  submittedBy: v.optional(v.id("users")),
  submittedAt: v.optional(v.string()),
  reviewedBy: v.optional(v.id("users")),
  reviewedAt: v.optional(v.string()),
  reviewNote: v.optional(v.string()),
  items: v.array(checklistItemValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const getByStay = query({
  args: {
    stayId: v.id("stays"),
    guestUserId: v.optional(v.id("users")),
  },
  returns: v.object({
    moveIn: v.union(checklistValidator, v.null()),
    moveOut: v.union(checklistValidator, v.null()),
  }),
  handler: async (ctx, { stayId, guestUserId }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const targetGuestId =
      membership.role === "guest"
        ? user._id
        : guestUserId ??
          (
            await ctx.db
              .query("memberships")
              .withIndex("by_stay", (q) => q.eq("stayId", stayId))
              .filter((q) => q.eq(q.field("role"), "guest"))
              .first()
          )?.userId;

    if (!targetGuestId) {
      return { moveIn: null, moveOut: null };
    }

    const checklists = await ctx.db
      .query("conditionChecklists")
      .withIndex("by_stay_guest", (q) =>
        q.eq("stayId", stayId).eq("guestUserId", targetGuestId),
      )
      .collect();

    const moveIn = checklists.find((c) => c.type === "move_in") ?? null;
    const moveOut = checklists.find((c) => c.type === "move_out") ?? null;

    return { moveIn, moveOut };
  },
});

export const submit = mutation({
  args: {
    stayId: v.id("stays"),
    guestUserId: v.id("users"),
    type: v.union(v.literal("move_in"), v.literal("move_out")),
    items: v.array(
      v.object({
        id: v.string(),
        area: v.string(),
        category: v.union(v.literal("private"), v.literal("shared")),
        item: v.string(),
        condition: v.union(
          v.literal("good"),
          v.literal("fair"),
          v.literal("damaged"),
          v.literal("not_applicable"),
        ),
        notes: v.optional(v.string()),
      }),
    ),
  },
  returns: v.id("conditionChecklists"),
  handler: async (ctx, { stayId, guestUserId, type, items }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const stay = await ctx.db.get(stayId);
    if (!stay) throw new Error("Stay not found");
    if (stay.status === "ended") {
      throw new Error("Ended stays cannot submit condition checklists");
    }
    await assertSubleaseUnlocked(ctx, stay, membership.role);

    if (membership.role === "guest" && user._id !== guestUserId) {
      throw new Error("Guests can only submit condition checklists for themselves");
    }

    const existing = await ctx.db
      .query("conditionChecklists")
      .withIndex("by_stay_guest", (q) =>
        q.eq("stayId", stayId).eq("guestUserId", guestUserId),
      )
      .filter((q) => q.eq(q.field("type"), type))
      .first();

    if (existing?.status === "confirmed") {
      throw new Error("Confirmed condition checklists cannot be modified");
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const checklistItems = items.map((i) => ({
      id: i.id,
      area: i.area.trim(),
      category: i.category,
      item: i.item.trim(),
      condition: i.condition,
      notes: i.notes?.trim() ? i.notes.trim() : undefined,
    }));

    let checklistId: Id<"conditionChecklists">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "submitted",
        submittedBy: user._id,
        submittedAt: nowIso,
        items: checklistItems,
        updatedAt: now,
      });
      checklistId = existing._id;
    } else {
      checklistId = await ctx.db.insert("conditionChecklists", {
        stayId,
        guestUserId,
        type,
        status: "submitted",
        submittedBy: user._id,
        submittedAt: nowIso,
        items: checklistItems,
        createdAt: now,
        updatedAt: now,
      });
    }

    await recordActivity(ctx, {
      stayId,
      actorUserId: user._id,
      kind: "stay",
      action: "checklist_submitted",
      detail: `${type === "move_in" ? "Move-in" : "Move-out"} checklist submitted with ${checklistItems.length} items.`,
    });

    return checklistId;
  },
});

export const review = mutation({
  args: {
    checklistId: v.id("conditionChecklists"),
    action: v.union(v.literal("confirm"), v.literal("dispute")),
    reviewNote: v.optional(v.string()),
    itemDisputes: v.optional(
      v.array(
        v.object({
          itemId: v.string(),
          disputeNote: v.string(),
        }),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { checklistId, action, reviewNote, itemDisputes }) => {
    const checklist = await ctx.db.get(checklistId);
    if (!checklist) throw new Error("Checklist not found");

    const { user, membership } = await requireMembership(ctx, checklist.stayId);
    const stay = await ctx.db.get(checklist.stayId);
    if (!stay) throw new Error("Stay not found");
    await assertSubleaseUnlocked(ctx, stay, membership.role);

    if (checklist.status === "confirmed") {
      throw new Error("Checklist has already been confirmed");
    }

    if (checklist.submittedBy === user._id) {
      throw new Error("Checklist must be reviewed and confirmed by the counterpart");
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const disputeMap = new Map(
      (itemDisputes ?? []).map((d) => [d.itemId, d.disputeNote.trim()]),
    );

    const updatedItems = checklist.items.map((item) => {
      const itemDispute = disputeMap.get(item.id);
      if (itemDispute) {
        return { ...item, disputeNote: itemDispute };
      }
      return item;
    });

    await ctx.db.patch(checklist._id, {
      status: action === "confirm" ? "confirmed" : "disputed",
      reviewedBy: user._id,
      reviewedAt: nowIso,
      reviewNote: reviewNote?.trim() ? reviewNote.trim() : undefined,
      items: updatedItems,
      updatedAt: now,
    });

    await recordActivity(ctx, {
      stayId: checklist.stayId,
      actorUserId: user._id,
      kind: "stay",
      action: action === "confirm" ? "checklist_confirmed" : "checklist_disputed",
      detail: `${checklist.type === "move_in" ? "Move-in" : "Move-out"} checklist ${
        action === "confirm" ? "confirmed" : "disputed"
      }.${reviewNote?.trim() ? ` Note: ${reviewNote.trim()}` : ""}`,
    });

    return null;
  },
});
