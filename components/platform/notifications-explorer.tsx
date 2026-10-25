"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Bell, CheckCircle2, ExternalLink, RotateCcw } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function formatDate(ms: number | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

export function NotificationsExplorer() {
  const data = useQuery(api.admin.getKnockOps, {});
  const retryEvent = useMutation(api.admin.retryNotificationEvent);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEventForRetry, setSelectedEventForRetry] = useState<{
    _id: Id<"notificationEvents">;
    workflow: string;
    recipientName: string;
    entityId: string;
    status: string;
  } | null>(null);
  const [retryReason, setRetryReason] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  if (data === undefined) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--kouchd-muted)" }}>
        Loading Knock notification workflow telemetry and cap status...
      </div>
    );
  }

  const filteredEvents = data.events.filter((evt) => {
    if (statusFilter === "all") return true;
    return evt.status === statusFilter;
  });

  async function handleConfirmRetry() {
    if (!selectedEventForRetry) return;
    const trimmed = retryReason.trim();
    if (trimmed.length < 5) {
      setStatusMessage({ text: "Please enter an audit reason (minimum 5 characters).", type: "error" });
      return;
    }
    setIsRetrying(true);
    setStatusMessage(null);
    try {
      await retryEvent({
        eventId: selectedEventForRetry._id,
        reason: trimmed,
      });
      setStatusMessage({
        text: `Queued idempotent single-recipient retry for ${selectedEventForRetry.workflow} (${selectedEventForRetry.recipientName}). Audit log recorded.`,
        type: "success",
      });
      setSelectedEventForRetry(null);
      setRetryReason("");
    } catch (err) {
      setStatusMessage({
        text: err instanceof Error ? err.message : "Failed to queue notification retry.",
        type: "error",
      });
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div>
      <div className="console-guardrail-banner">
        <strong>Transactional Notification &amp; Privacy Guardrails:</strong> Knock handles transactional notifications and reminders only. Reminders enforce a strict cap of <strong>1 reminder per user per calendar day</strong> across `payment-due-reminder`, `agreement-pending`, `chore-reminder`, and `check-in-reminder`. Raw message payloads and household details are never stored or displayed here, and no broadcast or ad-hoc message composer exists.
      </div>

      {statusMessage && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            marginBottom: "1rem",
            borderRadius: 10,
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: statusMessage.type === "success" ? "#eef7ee" : "#fdeeed",
            border: `1px solid ${statusMessage.type === "success" ? "#b6dfb6" : "#f5c2c0"}`,
            color: statusMessage.type === "success" ? "#1e5e1e" : "#8a1f1b",
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Knock Status & Cap Summary */}
      <div className="console-grid-stats">
        <div className="console-stat-card">
          <span className="console-stat-label">Knock API Key</span>
          <div style={{ marginTop: 6 }}>
            <span className={`console-status-pill ${data.config.hasApiKey ? "configured" : "pending"}`}>
              {data.config.hasApiKey ? "Configured" : "Not Configured (Skips Safe)"}
            </span>
          </div>
          <span className="console-stat-subtext" style={{ marginTop: 4 }}>
            Server-side secret (`KNOCK_API_KEY`)
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Daily Reminder Cap</span>
          <span className="console-stat-value">{data.config.dailyReminderCapPerUser} / day</span>
          <span className="console-stat-subtext">
            {data.config.cappedUsersTodayCount} user(s) reached cap today (UTC)
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Failed / Skipped Events</span>
          <span
            className="console-stat-value"
            style={data.failures.length > 0 ? { color: "#a82d1c" } : {}}
          >
            {data.failures.length}
          </span>
          <span className="console-stat-subtext">
            Eligible for audited single-recipient retry
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Recent Deliveries</span>
          <span className="console-stat-value">{data.recentDeliveries.length}</span>
          <span className="console-stat-subtext">
            {data.cancellations.length} recorded cancellation(s)
          </span>
        </div>
      </div>

      {/* Configured Workflows Contract */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Configured Knock Workflows &amp; Cancellation Contracts</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Canonical workflow keys, trigger schedules, and deterministic cancellation/deduplication rules.
            </p>
          </div>
          <a
            href={data.config.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button ghost compact"
            style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Knock Dashboard <ExternalLink size={14} />
          </a>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Workflow Key</th>
                <th>Category &amp; Cap</th>
                <th>Trigger Source</th>
                <th>Cancellation / Deduplication Key</th>
              </tr>
            </thead>
            <tbody>
              {data.workflows.map((wf) => (
                <tr key={wf.key}>
                  <td>
                    <code>{wf.key}</code>
                  </td>
                  <td>{wf.category}</td>
                  <td>{wf.trigger}</td>
                  <td>
                    <code style={{ fontSize: "0.75rem" }}>{wf.cancellationPattern}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Event Log & Audited Single-Recipient Retry */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Workflow Event Status, Failures &amp; Retry History ({filteredEvents.length})</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Compact, payload-free operational tracking (`notificationEvents`). Retries are restricted to single-recipient `failed` or `skipped` events and enforce deduplication and the 1/day reminder cap.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {["all", "failed", "skipped", "sent", "cancelled", "disabled"].map((st) => (
              <button
                key={st}
                type="button"
                className={`button ${statusFilter === st ? "primary" : "ghost"} compact`}
                style={{ fontSize: "0.76rem", padding: "4px 10px", textTransform: "capitalize" }}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Recipient</th>
                <th>Entity / Cancellation Key</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Error / Retry Audit</th>
                <th>Last Attempt</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt) => {
                const canRetry = evt.status === "failed" || evt.status === "skipped";
                return (
                  <tr key={evt._id}>
                    <td>
                      <code>{evt.workflow}</code>
                      <div style={{ fontSize: "0.72rem", color: "var(--kouchd-muted)" }}>
                        Stay: {evt.stayReferralCode}
                      </div>
                    </td>
                    <td>
                      <strong>{evt.recipientName}</strong>
                      <div style={{ fontSize: "0.74rem", color: "var(--kouchd-muted)" }}>
                        {evt.recipientEmailRedacted ?? "—"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.75rem" }}>
                        <div>Entity: <code>{evt.entityId}</code></div>
                        {evt.cancellationKey !== "—" && (
                          <div style={{ color: "var(--kouchd-muted)" }}>
                            Cancel: <code>{evt.cancellationKey}</code>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`console-status-pill ${evt.status}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", fontWeight: 700 }}>{evt.attemptCount}</td>
                    <td style={{ fontSize: "0.78rem", maxWidth: 260 }}>
                      {evt.errorSummary && (
                        <div style={{ color: "#a82d1c" }}>{evt.errorSummary}</div>
                      )}
                      {evt.retryReason && (
                        <div style={{ color: "var(--kouchd-muted)" }}>
                          Retried by {evt.retriedByName ?? "Operator"}: “{evt.retryReason}”
                        </div>
                      )}
                      {!evt.errorSummary && !evt.retryReason && "—"}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--kouchd-muted)" }}>
                      {formatDate(evt.lastAttemptAt)}
                    </td>
                    <td>
                      {canRetry ? (
                        <button
                          type="button"
                          className="button soft compact"
                          style={{ fontSize: "0.76rem", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                          onClick={() =>
                            setSelectedEventForRetry({
                              _id: evt._id,
                              workflow: evt.workflow,
                              recipientName: evt.recipientName,
                              entityId: evt.entityId,
                              status: evt.status,
                            })
                          }
                        >
                          <RotateCcw size={12} /> Retry
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No notification workflow events matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deduplicated Sent Notifications Log */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Deduplicated Delivery Ledger (`notifications` table)</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Authoritative deduplication records used by `wasSent` and `hasUserReceivedReminderOnDate`.
            </p>
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Recipient</th>
                <th>Stay Code</th>
                <th>Deduplication Entity ID</th>
                <th>Delivered At</th>
              </tr>
            </thead>
            <tbody>
              {data.recentDeliveries.map((item) => (
                <tr key={item._id}>
                  <td><code>{item.workflow}</code></td>
                  <td>
                    <strong>{item.recipientName}</strong>{" "}
                    <span style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)" }}>
                      ({item.recipientEmailRedacted ?? "—"})
                    </span>
                  </td>
                  <td>{item.stayReferralCode}</td>
                  <td><code style={{ fontSize: "0.75rem" }}>{item.entityId}</code></td>
                  <td style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                    {formatDate(item.sentAt)}
                  </td>
                </tr>
              ))}
              {data.recentDeliveries.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No deduplicated notification deliveries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEventForRetry && (
        <div className="console-modal-backdrop" role="dialog" aria-modal="true">
          <div className="console-modal">
            <h3 style={{ margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} color="var(--kouchd-forest)" />
              Retry Single-Recipient Notification
            </h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "var(--kouchd-muted)" }}>
              Workflow: <code>{selectedEventForRetry.workflow}</code> &middot; Recipient: <strong>{selectedEventForRetry.recipientName}</strong>
              <br />
              Entity ID: <code>{selectedEventForRetry.entityId}</code>
            </p>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--kouchd-muted)" }}>
              This retry is idempotent: it will verify that the notification has not already been delivered, that the stay is still active, and that the 1/day reminder cap is respected before calling Knock.
            </p>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 6 }}>
              Audit Reason (required, logged to platformAuditLogs)
            </label>
            <textarea
              rows={3}
              className="console-search-input"
              style={{ width: "100%", marginBottom: "0.75rem" }}
              placeholder="Explain why this failed/skipped notification event is being retried..."
              value={retryReason}
              onChange={(e) => setRetryReason(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                className="button ghost compact"
                disabled={isRetrying}
                onClick={() => {
                  setSelectedEventForRetry(null);
                  setRetryReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary compact"
                disabled={isRetrying}
                onClick={handleConfirmRetry}
              >
                {isRetrying ? "Queueing Retry..." : "Confirm Audited Retry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
