"use client";

import { Check, Plus } from "lucide-react";

import { HelpTip } from "@/components/onboarding/help-tip";

import { Tooltip } from "@/components/ui/tooltip";
import { HELP_LINKS } from "@/lib/help-links";

import { formatDate } from "@/components/workspace/types";

import type { WorkspaceState } from "./use-live-stay";

export function ChoresScreen({ state }: { state: WorkspaceState }) {
  const {
    setPanel,
    isEnded,
    isHost,
    bundle,
    members,
    toggleChore,
    chores,
    setDestructiveAction,
  } = state;
  return (
    <div key="chores" className="screen-transition">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Shared across the house</p>
          <h1>Chore board</h1>
          <p className="subhead">
            Household coordination stays shared while financial records stay
            private.
          </p>
          <HelpTip title="Shared chores" href={HELP_LINKS.houseRulesAndChores}>
            Everyone in the stay can see tasks, assignments, and completion. Use
            the chore form to add a task and set a due date.
          </HelpTip>
        </div>
        {!isEnded && (
          <button
            className="button primary"
            type="button"
            onClick={() => setPanel("chore")}
          >
            <Plus size={18} /> Add chore
          </button>
        )}
      </div>
      <div className="chore-list">
        {chores
          .filter((item) => !item.voidedAt)
          .map((item) => (
            <article
              className={`list-row chore-row ${item.completedAt ? "done" : ""}`}
              key={item._id}
            >
              {!isEnded ? (
                <Tooltip
                  content={
                    item.completedAt
                      ? "Mark chore as open"
                      : "Mark chore as completed"
                  }
                >
                  <button
                    className={`chore-check ${item.completedAt ? "checked" : ""}`}
                    type="button"
                    onClick={() => void toggleChore({ choreId: item._id })}
                    aria-label={`${item.completedAt ? "Reopen" : "Complete"} ${item.title}`}
                  >
                    {item.completedAt && <Check size={18} />}
                  </button>
                </Tooltip>
              ) : (
                <span
                  className={`chore-check ${item.completedAt ? "checked" : ""}`}
                  aria-hidden="true"
                >
                  {item.completedAt && <Check size={18} />}
                </span>
              )}
              <div className="list-copy">
                <strong>{item.title}</strong>
                <span>
                  {item.note ? `${item.note} · ` : ""}Due{" "}
                  {formatDate(item.dueDate)}
                </span>
                <span className="badge">
                  {item.repeatCadence
                    ? `Repeats ${item.repeatCadence}`
                    : "One time"}{" "}
                  ·{" "}
                  {item.assigneeUserId
                    ? members.find(
                        (member) => member.person.id === item.assigneeUserId,
                      )?.person.name &&
                      members.find(
                        (member) => member.person.id === item.assigneeUserId,
                      )!.person.name !== "Kouchd member"
                      ? members.find(
                          (member) => member.person.id === item.assigneeUserId,
                        )!.person.name
                      : "Guest"
                    : item.assignee}
                </span>
              </div>
              {!isEnded &&
                (isHost || item.createdBy === bundle.membership.userId) && (
                  <div className="row-actions">
                    <button
                      className="mini-button danger"
                      type="button"
                      onClick={() =>
                        setDestructiveAction({
                          type: "voidChore",
                          choreId: item._id,
                          title: item.title,
                        })
                      }
                    >
                      Void
                    </button>
                  </div>
                )}
            </article>
          ))}
      </div>
    </div>
  );
}
