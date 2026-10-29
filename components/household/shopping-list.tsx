"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { useHouseholdAction } from "./use-household-action";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { trackEvent } from "@/lib/analytics/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

type ShoppingItem = Doc<"shoppingItems">;

export function ShoppingList({
  stayId,
  viewerId,
  isEnded,
}: {
  stayId: Id<"stays">;
  viewerId: Id<"users">;
  isEnded: boolean;
}) {
  const items = useQuery(api.shopping.list, { stayId }) as
    ShoppingItem[] | undefined;
  const createItem = useMutation(api.shopping.create);
  const updateItem = useMutation(api.shopping.update);
  const toggleItem = useMutation(api.shopping.toggle);
  const removeItem = useMutation(api.shopping.remove);
  const [editingId, setEditingId] = useState<Id<"shoppingItems"> | null>(null);
  const { busy, error, run } = useHouseholdAction();

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let newItemId: Id<"shoppingItems"> | null = null;
    if (
      await run(
        async () => {
          newItemId = (await createItem({
            stayId,
            title: String(form.get("title") ?? ""),
            quantity: String(form.get("quantity") ?? "1"),
            note: String(form.get("note") ?? ""),
            visibility:
              form.get("visibility") === "personal" ? "personal" : "shared",
          })) as Id<"shoppingItems">;
        },
        "Could not add this item.",
      )
    ) {
      if (newItemId) {
        trackEvent(ANALYTICS_EVENTS.SHOPPING_ITEM_ADDED, { stayId, itemId: newItemId });
      }
      formElement.reset();
    }
  }

  async function save(event: FormEvent<HTMLFormElement>, item: ShoppingItem) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      await run(
        () =>
          updateItem({
            itemId: item._id,
            title: String(form.get("title") ?? ""),
            quantity: String(form.get("quantity") ?? "1"),
            note: String(form.get("note") ?? ""),
            visibility:
              form.get("visibility") === "personal" ? "personal" : "shared",
          }),
        "Could not update this item.",
      )
    ) {
      setEditingId(null);
    }
  }

  return (
    <div className="screen-transition">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Shared across the house</p>
          <h1>Shopping list</h1>
          <p className="subhead">
            Keep household essentials and personal errands in one place.
          </p>
        </div>
      </div>
      {!isEnded && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Add an item</p>
              <h2>What do you need?</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={(event) => void add(event)}>
            <label>
              <span>Item</span>
              <input
                name="title"
                maxLength={120}
                required
                placeholder="Dish soap"
              />
            </label>
            <label>
              <span>Quantity</span>
              <input
                name="quantity"
                maxLength={40}
                defaultValue="1"
                required
                placeholder="1 bottle"
              />
            </label>
            <label>
              <span>List</span>
              <select name="visibility">
                <option value="shared">Shared with the house</option>
                <option value="personal">Personal (only you can see it)</option>
              </select>
            </label>
            <label>
              <span>Note</span>
              <input
                name="note"
                maxLength={500}
                placeholder="Unscented, please"
              />
            </label>
            <div className="dialog-actions full">
              <button className="button primary" type="submit" disabled={busy}>
                <Plus size={16} /> Add item
              </button>
            </div>
          </form>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      )}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Household list</p>
            <h2>Needed items</h2>
          </div>
          <span className="badge">
            {(items ?? []).filter((item) => !item.checkedAt).length} to get
          </span>
        </div>
        {!items ? (
          <p className="muted">Loading your list…</p>
        ) : items.length === 0 ? (
          <p className="muted">
            Nothing on the list yet. Add the first item above.
          </p>
        ) : (
          <div className="ledger-list">
            {items.map((item) => {
              // Personal items are private to their creator, hosts included.
              const isCreator = item.createdBy === viewerId;
              const canEdit = item.visibility === "shared" || isCreator;
              if (editingId === item._id)
                return (
                  <form
                    className="shopping-edit form-grid"
                    key={item._id}
                    onSubmit={(event) => void save(event, item)}
                  >
                    <label>
                      <span>Item</span>
                      <input
                        name="title"
                        defaultValue={item.title}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label>
                      <span>Quantity</span>
                      <input
                        name="quantity"
                        defaultValue={item.quantity}
                        maxLength={40}
                        required
                      />
                    </label>
                    {isCreator && (
                      <label>
                        <span>List</span>
                        <select name="visibility" defaultValue={item.visibility}>
                          <option value="shared">Shared with the house</option>
                          <option value="personal">Personal (only you can see it)</option>
                        </select>
                      </label>
                    )}
                    <label>
                      <span>Note</span>
                      <input
                        name="note"
                        defaultValue={item.note}
                        maxLength={500}
                      />
                    </label>
                    <div className="row-actions full">
                      <button
                        className="mini-button"
                        type="submit"
                        disabled={busy}
                      >
                        Save
                      </button>
                      <button
                        className="mini-button"
                        type="button"
                        onClick={() => setEditingId(null)}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </form>
                );
              return (
                <article
                  className={`list-row shopping-row ${item.checkedAt ? "done" : ""}`}
                  key={item._id}
                >
                  {!isEnded ? (
                    <button
                      className={`chore-check ${item.checkedAt ? "checked" : ""}`}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void run(
                          () => toggleItem({ itemId: item._id }),
                          "Could not update this item.",
                        );
                        if (!item.checkedAt) {
                          trackEvent(ANALYTICS_EVENTS.SHOPPING_ITEM_PURCHASED, { stayId, itemId: item._id });
                        }
                      }}
                      aria-label={`${item.checkedAt ? "Uncheck" : "Check off"} ${item.title}`}
                    >
                      {item.checkedAt && <Check size={17} />}
                    </button>
                  ) : (
                    <span
                      className={`chore-check ${item.checkedAt ? "checked" : ""}`}
                      aria-hidden="true"
                    >
                      {item.checkedAt && <Check size={17} />}
                    </span>
                  )}
                  <div className="list-copy">
                    <strong>{item.title}</strong>
                    <span>
                      {item.quantity}
                      {item.note ? ` · ${item.note}` : ""}
                    </span>
                    <span className="badge">
                      {item.visibility === "personal" ? "Personal" : "Shared"}
                    </span>
                  </div>
                  {!isEnded && canEdit && (
                    <div className="row-actions">
                      <button
                        className="mini-button"
                        type="button"
                        onClick={() => setEditingId(item._id)}
                        aria-label={`Edit ${item.title}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="mini-button danger"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => removeItem({ itemId: item._id }),
                            "Could not remove this item.",
                          )
                        }
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
