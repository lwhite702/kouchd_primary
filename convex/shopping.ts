import { v } from "convex/values";
import schema from "./schema";

import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { recordActivity } from "./lib/activity";
import { isFeatureEnabled } from "./flags";
import { FEATURE_FLAGS } from "../lib/flags/config";

function validateItem(title: string, quantity: string, note: string) {
  if (!title.trim() || title.trim().length > 120) throw new Error("Item name must be between 1 and 120 characters");
  if (!quantity.trim() || quantity.trim().length > 40) throw new Error("Quantity must be between 1 and 40 characters");
  if (note.length > 500) throw new Error("Item notes must be 500 characters or fewer");
}

async function requireItemEditor(ctx: MutationCtx, itemId: Id<"shoppingItems">) {
  const item = await ctx.db.get(itemId);
  if (!item || item.deletedAt) throw new Error("Shopping item not found");
  const { user, membership } = await requireMembership(ctx, item.stayId);
  if (item.visibility === "personal" && membership.role !== "host" && item.createdBy !== user._id) {
    throw new Error("You cannot edit another member's personal item");
  }
  const stay = await ctx.db.get(item.stayId);
  if (!stay || stay.status === "ended") throw new Error("Ended stays cannot change shopping items");
  return { item, user, membership };
}

export const list = query({
  args: { stayId: v.id("stays") },
  returns: v.array(v.object({ ...schema.tables.shoppingItems.validator.fields, _id: v.id("shoppingItems"), _creationTime: v.number() })),
  handler: async (ctx, { stayId }) => {
    const { user, membership } = await requireMembership(ctx, stayId);
    const items = await ctx.db.query("shoppingItems")
      .withIndex("by_stay_created_at", (q) => q.eq("stayId", stayId))
      .order("desc")
      .take(200);
    return items.filter((item) => !item.deletedAt && (membership.role === "host" || item.visibility === "shared" || item.createdBy === user._id));
  },
});

export const create = mutation({
  args: {
    stayId: v.id("stays"),
    title: v.string(),
    quantity: v.string(),
    note: v.string(),
    visibility: v.union(v.literal("shared"), v.literal("personal")),
  },
  returns: v.id("shoppingItems"),
  handler: async (ctx, args) => {
    if (!await isFeatureEnabled(ctx, FEATURE_FLAGS.SHOPPING_LIST)) {
      throw new Error("Household shopping list is currently disabled by platform policy.");
    }
    const { user } = await requireMembership(ctx, args.stayId);
    const stay = await ctx.db.get(args.stayId);
    if (!stay || stay.status === "ended") throw new Error("Ended stays cannot add shopping items");
    validateItem(args.title, args.quantity, args.note);
    const now = Date.now();
    const itemId = await ctx.db.insert("shoppingItems", {
      ...args,
      title: args.title.trim(),
      quantity: args.quantity.trim(),
      note: args.note.trim(),
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(ctx, { stayId: args.stayId, actorUserId: user._id, guestUserId: args.visibility === "personal" ? user._id : undefined, kind: "shopping", action: "item_added", detail: `${args.title.trim()} added to the ${args.visibility} list`, entityId: itemId });
    return itemId;
  },
});

export const update = mutation({
  args: {
    itemId: v.id("shoppingItems"),
    title: v.string(),
    quantity: v.string(),
    note: v.string(),
    visibility: v.union(v.literal("shared"), v.literal("personal")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { item, user, membership } = await requireItemEditor(ctx, args.itemId);
    validateItem(args.title, args.quantity, args.note);
    if (args.visibility === "personal" && membership.role !== "host" && item.createdBy !== user._id) {
      throw new Error("Only the creator or host can make this item personal");
    }
    await ctx.db.patch(item._id, { title: args.title.trim(), quantity: args.quantity.trim(), note: args.note.trim(), visibility: args.visibility, updatedAt: Date.now() });
    await recordActivity(ctx, { stayId: item.stayId, actorUserId: user._id, guestUserId: args.visibility === "personal" ? item.createdBy : undefined, kind: "shopping", action: "item_updated", detail: `${args.title.trim()} updated`, entityId: item._id });
    return null;
  },
});

export const toggle = mutation({
  args: { itemId: v.id("shoppingItems") },
  returns: v.boolean(),
  handler: async (ctx, { itemId }) => {
    const { item, user } = await requireItemEditor(ctx, itemId);
    const checked = !item.checkedAt;
    await ctx.db.patch(item._id, { checkedAt: checked ? Date.now() : undefined, checkedBy: checked ? user._id : undefined, updatedAt: Date.now() });
    await recordActivity(ctx, { stayId: item.stayId, actorUserId: user._id, guestUserId: item.visibility === "personal" ? item.createdBy : undefined, kind: "shopping", action: checked ? "item_checked" : "item_unchecked", detail: item.title, entityId: item._id });
    return checked;
  },
});

export const remove = mutation({
  args: { itemId: v.id("shoppingItems") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const { item, user } = await requireItemEditor(ctx, itemId);
    const now = Date.now();
    await ctx.db.patch(item._id, { deletedAt: now, updatedAt: now });
    await recordActivity(ctx, { stayId: item.stayId, actorUserId: user._id, guestUserId: item.visibility === "personal" ? item.createdBy : undefined, kind: "shopping", action: "item_removed", detail: item.title, entityId: item._id });
    return null;
  },
});
