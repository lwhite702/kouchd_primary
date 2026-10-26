"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MessageCircle, Plus } from "lucide-react";

import { useHouseholdAction } from "./use-household-action";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { trackEvent } from "@/lib/analytics/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

type CheckIn = Doc<"checkIns"> & { guestName: string };
type GuestOption = { id: Id<"users">; name: string };

export function CheckInBoard({
  stayId,
  viewerId,
  isHost,
  isEnded,
  today,
  guests,
}: {
  stayId: Id<"stays">;
  viewerId: Id<"users">;
  isHost: boolean;
  isEnded: boolean;
  today: string;
  guests: GuestOption[];
}) {
  const items = useQuery(api.checkIns.list, { stayId }) as
    CheckIn[] | undefined;
  const createCheckIn = useMutation(api.checkIns.create);
  const respond = useMutation(api.checkIns.respond);
  const setStatus = useMutation(api.checkIns.setStatus);
  const [showForm, setShowForm] = useState(false);
  const { busy, error, run } = useHouseholdAction();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checkInDate = String(form.get("checkInDate") ?? "");
    if (
      await run(
        () =>
          createCheckIn({
            stayId,
            ...(isHost
              ? { guestUserId: String(form.get("guestUserId")) as Id<"users"> }
              : {}),
            checkInDate,
            topic: String(form.get("topic") ?? ""),
            note: String(form.get("note") ?? ""),
          }),
        "Could not start this check-in.",
      )
    ) {
      trackEvent(ANALYTICS_EVENTS.CHECK_IN_SUBMITTED, { stayId, date: checkInDate });
      setShowForm(false);
    }
  }

  async function addResponse(event: FormEvent<HTMLFormElement>, item: CheckIn) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (
      await run(
        () =>
          respond({
            checkInId: item._id,
            body: String(form.get("body") ?? ""),
          }),
        "Could not add your response.",
      )
    ) {
      formElement.reset();
    }
  }

  return (
    <div className="screen-transition">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Living agreements</p>
          <h1>House check-ins</h1>
          <p className="subhead">
            Share a concern, agree on a next step, and keep the follow-up with
            your stay.
          </p>
        </div>
        {!isEnded && (!isHost || guests.length > 0) && (
          <button
            className="button primary"
            type="button"
            disabled={busy}
            onClick={() => setShowForm((value) => !value)}
          >
            <Plus size={16} /> New check-in
          </button>
        )}
      </div>
      {showForm && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Start a conversation</p>
              <h2>What should you check in about?</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={(event) => void create(event)}>
            {isHost && (
              <label>
                <span>Guest</span>
                <select name="guestUserId" required>
                  {guests.map((guest) => (
                    <option value={guest.id} key={guest.id}>
                      {guest.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Date</span>
              <input
                name="checkInDate"
                type="date"
                defaultValue={today}
                required
              />
            </label>
            <label>
              <span>Topic</span>
              <input
                name="topic"
                maxLength={120}
                required
                placeholder="Shared kitchen routine"
              />
            </label>
            <label className="full">
              <span>Notes</span>
              <textarea
                name="note"
                maxLength={2000}
                rows={3}
                required
                placeholder="What would be helpful to discuss?"
              />
            </label>
            {error && (
              <p className="form-error full" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions full">
              <button
                className="button ghost"
                type="button"
                disabled={busy}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="button primary" type="submit" disabled={busy}>
                Start check-in
              </button>
            </div>
          </form>
        </section>
      )}
      {error && !showForm && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Shared record</p>
            <h2>Check-in history</h2>
          </div>
        </div>
        {!items ? (
          <p className="muted">Loading check-ins…</p>
        ) : items.length === 0 ? (
          <p className="muted">
            {isHost && guests.length === 0 && !isEnded
              ? "Invite a guest before starting a check-in. Shared conversations will appear here."
              : "No check-ins yet. Use them to capture a conversation and any agreed follow-up."}
          </p>
        ) : (
          <div className="check-in-list">
            {items.map((item) => (
              <article className="check-in-card" key={item._id}>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      {item.guestName} · {item.checkInDate}
                    </p>
                    <h3>{item.topic}</h3>
                  </div>
                  <span className="badge">
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="check-in-note">{item.note}</p>
                {item.responses.map((response, index) => (
                  <div
                    className="check-in-response"
                    key={`${response.createdAt}-${index}`}
                  >
                    <MessageCircle size={15} />
                    <span>
                      {response.userId === viewerId
                        ? "You"
                        : isHost
                          ? item.guestName
                          : "Your host"}
                      : {response.body}
                    </span>
                  </div>
                ))}
                {!isEnded && item.status !== "resolved" && (
                  <form
                    className="check-in-reply"
                    onSubmit={(event) => void addResponse(event, item)}
                  >
                    <label>
                      <span className="sr-only">Add a response</span>
                      <input
                        name="body"
                        maxLength={2000}
                        required
                        placeholder="Add a response or next step"
                      />
                    </label>
                    <button
                      className="mini-button"
                      type="submit"
                      disabled={busy}
                    >
                      Reply
                    </button>
                  </form>
                )}
                {!isEnded && (
                  <div className="row-actions">
                    <button
                      className="mini-button"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            setStatus({
                              checkInId: item._id,
                              status:
                                item.status === "follow_up"
                                  ? "open"
                                  : "follow_up",
                            }),
                          "Could not update this check-in.",
                        )
                      }
                    >
                      {item.status === "follow_up"
                        ? "Clear follow-up"
                        : "Needs follow-up"}
                    </button>
                    {item.status !== "resolved" && (
                      <button
                        className="mini-button"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              setStatus({
                                checkInId: item._id,
                                status: "resolved",
                              }),
                            "Could not update this check-in.",
                          )
                        }
                      >
                        Mark resolved
                      </button>
                    )}
                    {item.status === "resolved" && (
                      <button
                        className="mini-button"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              setStatus({
                                checkInId: item._id,
                                status: "open",
                              }),
                            "Could not update this check-in.",
                          )
                        }
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
