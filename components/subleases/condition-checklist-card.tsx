"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, FileCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ConditionChecklistCardProps {
  stayId: Id<"stays">;
  isHost: boolean;
  isSublease: boolean;
  subleaseLayout?: "whole_place" | "private_room";
  isLocked?: boolean;
  guestUserId?: Id<"users">;
  onNotify?: (message: string) => void;
}

export function ConditionChecklistCard({
  stayId,
  isHost,
  isSublease,
  subleaseLayout = "whole_place",
  isLocked = false,
  guestUserId,
  onNotify,
}: ConditionChecklistCardProps) {
  const [activeTab, setActiveTab] = useState<"move_in" | "move_out">("move_in");
  const [expanded, setExpanded] = useState(true);
  const [reviewNote, setReviewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checklists = useQuery(api.checklists.getByStay, {
    stayId,
    guestUserId,
  });

  const submitChecklist = useMutation(api.checklists.submit);
  const reviewChecklist = useMutation(api.checklists.review);

  if (!isSublease) return null;

  const currentChecklist =
    activeTab === "move_in" ? checklists?.moveIn : checklists?.moveOut;

  const handleQuickSubmit = async () => {
    if (!guestUserId && isHost) {
      onNotify?.("Select a guest to record an inspection checklist.");
      return;
    }
    setIsSubmitting(true);
    try {
      const defaultItems =
        subleaseLayout === "private_room"
          ? [
              {
                id: "priv_1",
                area: "Private Bedroom",
                category: "private" as const,
                item: "Walls, windows & flooring",
                condition: "good" as const,
              },
              {
                id: "priv_2",
                area: "Private Bedroom",
                category: "private" as const,
                item: "Furnishings & mattress",
                condition: "good" as const,
              },
              {
                id: "share_1",
                area: "Shared Kitchen",
                category: "shared" as const,
                item: "Appliances & countertops",
                condition: "good" as const,
              },
              {
                id: "share_2",
                area: "Shared Living Area",
                category: "shared" as const,
                item: "Furniture & surfaces",
                condition: "good" as const,
              },
            ]
          : [
              {
                id: "wp_1",
                area: "Living Room",
                category: "shared" as const,
                item: "Flooring & furnishings",
                condition: "good" as const,
              },
              {
                id: "wp_2",
                area: "Kitchen",
                category: "shared" as const,
                item: "Appliances & cabinets",
                condition: "good" as const,
              },
              {
                id: "wp_3",
                area: "Bedrooms",
                category: "shared" as const,
                item: "Doors, windows & fixtures",
                condition: "good" as const,
              },
              {
                id: "wp_4",
                area: "Bathroom",
                category: "shared" as const,
                item: "Plumbing, tub & vanity",
                condition: "good" as const,
              },
            ];

      await submitChecklist({
        stayId,
        guestUserId: guestUserId!,
        type: activeTab,
        items: defaultItems,
      });
      onNotify?.(`${activeTab === "move_in" ? "Move-in" : "Move-out"} inspection checklist submitted.`);
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Failed to submit checklist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (action: "confirm" | "dispute") => {
    if (!currentChecklist) return;
    setIsSubmitting(true);
    try {
      await reviewChecklist({
        checklistId: currentChecklist._id,
        action,
        reviewNote: reviewNote.trim() ? reviewNote.trim() : undefined,
      });
      onNotify?.(
        action === "confirm"
          ? "Checklist confirmed."
          : "Dispute note recorded on checklist.",
      );
      setReviewNote("");
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Failed to review checklist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  interface ChecklistItem {
    id: string;
    area: string;
    category: "private" | "shared";
    item: string;
    condition: "good" | "fair" | "damaged" | "not_applicable";
    notes?: string;
    disputeNote?: string;
  }

  const items: ChecklistItem[] = (currentChecklist?.items as ChecklistItem[]) ?? [];
  const privateItems = items.filter((i) => i.category === "private");
  const sharedItems = items.filter((i) => i.category === "shared");

  return (
    <article className="house-card checklist-card" style={{ marginTop: 16 }}>
      <div
        className="house-card-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="house-icon access">
            <FileCheck size={20} />
          </span>
          <div>
            <p className="overline" style={{ margin: 0 }}>Sublease Records</p>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Condition Checklists</h3>
          </div>
        </div>
        <button
          type="button"
          aria-label={expanded ? "Collapse checklist section" : "Expand checklist section"}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="house-card-body" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              className={`pill-button ${activeTab === "move_in" ? "active" : ""}`}
              onClick={() => setActiveTab("move_in")}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid var(--line)",
                background: activeTab === "move_in" ? "var(--forest)" : "var(--surface)",
                color: activeTab === "move_in" ? "#ffffff" : "var(--ink)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Move-in Checklist
            </button>
            <button
              type="button"
              className={`pill-button ${activeTab === "move_out" ? "active" : ""}`}
              onClick={() => setActiveTab("move_out")}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid var(--line)",
                background: activeTab === "move_out" ? "var(--forest)" : "var(--surface)",
                color: activeTab === "move_out" ? "#ffffff" : "var(--ink)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Move-out Checklist
            </button>
          </div>

          {!currentChecklist ? (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <p style={{ color: "var(--muted)", margin: "0 0 12px 0" }}>
                No {activeTab === "move_in" ? "move-in" : "move-out"} inspection recorded yet.
              </p>
              {!isLocked && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleQuickSubmit}
                  disabled={isSubmitting}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "var(--lime)",
                    color: "var(--forest)",
                    border: "1.5px solid var(--forest)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isSubmitting ? "Submitting..." : `Start ${activeTab === "move_in" ? "Move-in" : "Move-out"} Inspection`}
                </button>
              )}
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background:
                    currentChecklist.status === "confirmed"
                      ? "rgba(46, 125, 50, 0.1)"
                      : currentChecklist.status === "disputed"
                      ? "rgba(211, 47, 47, 0.1)"
                      : "rgba(2, 136, 209, 0.1)",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {currentChecklist.status === "confirmed" ? (
                    <CheckCircle2 size={16} color="var(--green)" />
                  ) : (
                    <AlertCircle size={16} color="var(--forest)" />
                  )}
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", textTransform: "capitalize" }}>
                    Status: {currentChecklist.status}
                  </span>
                </div>
                {currentChecklist.submittedAt && (
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    Submitted {new Date(currentChecklist.submittedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {subleaseLayout === "private_room" && privateItems.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "var(--forest)" }}>
                    Private Room Areas
                  </h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {privateItems.map((item) => (
                      <li
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 0",
                          borderBottom: "1px solid var(--line)",
                          fontSize: "0.9rem",
                        }}
                      >
                        <div>
                          <strong>{item.area}:</strong> {item.item}
                          {item.notes && <p style={{ margin: "2px 0 0 0", color: "var(--muted)", fontSize: "0.8rem" }}>{item.notes}</p>}
                          {item.disputeNote && <p style={{ margin: "2px 0 0 0", color: "var(--red)", fontSize: "0.8rem" }}>Dispute: {item.disputeNote}</p>}
                        </div>
                        <span style={{ textTransform: "capitalize", fontWeight: 600, color: item.condition === "good" ? "var(--green)" : "var(--muted)" }}>
                          {item.condition}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "var(--forest)" }}>
                  {subleaseLayout === "private_room" ? "Shared Spaces" : "Inspected Areas"}
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {(subleaseLayout === "private_room" ? sharedItems : items).map((item) => (
                    <li
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--line)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <div>
                        <strong>{item.area}:</strong> {item.item}
                        {item.notes && <p style={{ margin: "2px 0 0 0", color: "var(--muted)", fontSize: "0.8rem" }}>{item.notes}</p>}
                        {item.disputeNote && <p style={{ margin: "2px 0 0 0", color: "var(--red)", fontSize: "0.8rem" }}>Dispute: {item.disputeNote}</p>}
                      </div>
                      <span style={{ textTransform: "capitalize", fontWeight: 600, color: item.condition === "good" ? "var(--green)" : "var(--muted)" }}>
                        {item.condition}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {currentChecklist.status === "submitted" && !isLocked && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 8px 0" }}>
                    Review this inspection checklist to confirm conditions or record an itemized dispute note.
                  </p>
                  <textarea
                    placeholder="Optional review or dispute note..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      marginBottom: 8,
                      fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleReview("confirm")}
                      disabled={isSubmitting}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        background: "var(--forest)",
                        color: "#fff",
                        border: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Confirm Checklist
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview("dispute")}
                      disabled={isSubmitting}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        background: "var(--surface)",
                        color: "var(--ink)",
                        border: "1px solid var(--line)",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Add Dispute Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
