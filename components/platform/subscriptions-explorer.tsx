"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

function formatDate(ms: number | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

export function SubscriptionsExplorer() {
  const data = useQuery(api.admin.getRevenueCatOps, {});
  const reconcileOwnership = useMutation(api.admin.reconcileHouseholdOwnership);

  const [envFilter, setEnvFilter] = useState<"all" | "production" | "sandbox">("all");
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileReason, setReconcileReason] = useState("");
  const [reconcileMessage, setReconcileMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  if (data === undefined) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--kouchd-muted)" }}>
        Loading RevenueCat subscription snapshots and webhook telemetry...
      </div>
    );
  }

  const filteredSnapshots = data.snapshots.filter((s) => {
    if (envFilter === "all") return true;
    return s.environment === envFilter;
  });

  async function handleConfirmReconcile() {
    const trimmed = reconcileReason.trim();
    if (trimmed.length < 5) {
      setReconcileMessage({ text: "Please enter an audit reason (minimum 5 characters).", type: "error" });
      return;
    }
    setIsReconciling(true);
    setReconcileMessage(null);
    try {
      const result = await reconcileOwnership({ reason: trimmed });
      setReconcileMessage({
        text: `Ownership reconciliation complete: ${result.linked} stay(s) newly linked, ${result.alreadyLinked} already linked, ${result.ownerMismatches} mismatch(es) flagged. Audit log recorded.`,
        type: "success",
      });
      setShowReconcileModal(false);
      setReconcileReason("");
    } catch (err) {
      setReconcileMessage({
        text: err instanceof Error ? err.message : "Failed to run ownership reconciliation.",
        type: "error",
      });
    } finally {
      setIsReconciling(false);
    }
  }

  return (
    <div>
      <div className="console-guardrail-banner">
        <strong>Authoritative Entitlement Boundary:</strong> Convex (`householdAccounts` &amp; `subscriptionSnapshots`) is authoritative for Kouchd household entitlements; RevenueCat handles subscription purchase lifecycle and store webhooks. Guests stay free. This console does not permit granting paid access, editing local entitlements, or initiating purchases, refunds, or cancellations.
      </div>

      {reconcileMessage && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            marginBottom: "1rem",
            borderRadius: 10,
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: reconcileMessage.type === "success" ? "#eef7ee" : "#fdeeed",
            border: `1px solid ${reconcileMessage.type === "success" ? "#b6dfb6" : "#f5c2c0"}`,
            color: reconcileMessage.type === "success" ? "#1e5e1e" : "#8a1f1b",
          }}
        >
          {reconcileMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{reconcileMessage.text}</span>
        </div>
      )}

      {/* Environment & Reconciliation Summary */}
      <div className="console-grid-stats">
        <div className="console-stat-card">
          <span className="console-stat-label">Expected Environment</span>
          <div style={{ marginTop: 6 }}>
            {data.config.expectedEnvironment ? (
              <span className={`console-env-badge ${data.config.expectedEnvironment}`}>
                {data.config.expectedEnvironment}
              </span>
            ) : (
              <span className="console-env-badge blocked">Unconfigured</span>
            )}
          </div>
          <span className="console-stat-subtext" style={{ marginTop: 4 }}>
            Webhook Auth: {data.config.hasWebhookAuthorization ? "Configured" : "Missing"} &middot; App ID: {data.config.hasAppId ? "Configured" : "Missing"}
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Household Accounts</span>
          <span className="console-stat-value">{data.reconciliation.totalHouseholdAccounts}</span>
          <span className="console-stat-subtext">
            {data.snapshots.length} active/historical snapshot(s)
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Stay Ownership Links</span>
          <span className="console-stat-value">
            {data.reconciliation.linkedStays} / {data.reconciliation.totalStays}
          </span>
          <span className="console-stat-subtext">
            {data.reconciliation.missingAccountLinks} missing link(s) &middot; {data.reconciliation.ownerMismatches} mismatch(es)
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Webhook Error Count</span>
          <span
            className="console-stat-value"
            style={data.webhookErrors.length > 0 ? { color: "#a82d1c" } : {}}
          >
            {data.webhookErrors.length}
          </span>
          <span className="console-stat-subtext">
            Across {data.events.length} recent lifecycle event(s)
          </span>
        </div>
      </div>

      {/* Ownership Reconciliation Card */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Household Ownership &amp; Entitlement Reconciliation</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Ensures every stay is linked to its host’s `householdAccountId` so RevenueCat snapshots matched via Clerk `userId` (`providerAppUserId`) resolve cleanly.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              className="button soft compact"
              onClick={() => setShowReconcileModal(true)}
              style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={14} /> Run Audited Ownership Backfill
            </button>
            <a
              href={data.config.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button ghost compact"
              style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              RevenueCat Dashboard <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Household Subscription Snapshots */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Household Subscription Snapshots ({filteredSnapshots.length})</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Normalized subscription state per household account and store environment (`production` vs `sandbox` are strictly isolated).
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {(["all", "production", "sandbox"] as const).map((env) => (
              <button
                key={env}
                type="button"
                className={`button ${envFilter === env ? "primary" : "ghost"} compact`}
                style={{ fontSize: "0.78rem", padding: "4px 10px", textTransform: "uppercase" }}
                onClick={() => setEnvFilter(env)}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Host / Household Owner</th>
                <th>Environment</th>
                <th>Effective Plan</th>
                <th>Provider Status</th>
                <th>Entitlement / Product</th>
                <th>Period Ends</th>
                <th>Will Renew</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnapshots.map((snap) => (
                <tr key={snap._id}>
                  <td>
                    <strong>{snap.ownerName}</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)" }}>
                      {snap.ownerEmailRedacted ?? "No email"} &middot; <code>{snap.ownerClerkUserId}</code>
                    </div>
                  </td>
                  <td>
                    <span className={`console-env-badge ${snap.environment}`}>
                      {snap.environment}
                    </span>
                    {!snap.environmentMatchesExpected && (
                      <div style={{ fontSize: "0.7rem", color: "#8f6412", marginTop: 2 }}>
                        Ignored by active env filter
                      </div>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: "var(--kouchd-forest)", textTransform: "capitalize" }}>
                      {snap.effectivePlan}
                    </strong>
                  </td>
                  <td>
                    <span className={`console-status-pill ${snap.status}`}>
                      {snap.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem" }}>
                      <strong>{snap.entitlement}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)" }}>
                        <code>{snap.productId}</code>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>{formatDate(snap.currentPeriodEndsAt)}</td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {snap.willRenew === undefined ? "—" : snap.willRenew ? "Yes" : "No"}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                    {formatDate(snap.updatedAt)}
                  </td>
                </tr>
              ))}
              {filteredSnapshots.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No subscription snapshots recorded for this environment filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lifecycle Event History & Webhook Errors */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Lifecycle Event History &amp; Webhook Ingestion ({data.events.length})</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Deduplicated `providerEvents` audit trail from `/revenuecat/webhook`. Out-of-order events are recorded without rolling snapshot state backward.
            </p>
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Environment</th>
                <th>Event Type</th>
                <th>Host</th>
                <th>Product ID</th>
                <th>Occurred At</th>
                <th>Status / Error</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((evt) => (
                <tr key={evt._id}>
                  <td>
                    <code style={{ fontSize: "0.76rem" }}>{evt.providerEventId}</code>
                  </td>
                  <td>
                    <span className={`console-env-badge ${evt.environment}`}>
                      {evt.environment}
                    </span>
                  </td>
                  <td>
                    <strong>{evt.eventType}</strong>
                  </td>
                  <td>{evt.ownerName}</td>
                  <td>
                    <code style={{ fontSize: "0.76rem" }}>{evt.productId}</code>
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>{formatDate(evt.occurredAt)}</td>
                  <td>
                    {evt.processingError ? (
                      <span className="console-status-pill failed" title={evt.processingError}>
                        Error: {evt.processingError}
                      </span>
                    ) : (
                      <span className="console-status-pill confirmed">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.events.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No RevenueCat lifecycle webhook events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showReconcileModal && (
        <div className="console-modal-backdrop" role="dialog" aria-modal="true">
          <div className="console-modal">
            <h3 style={{ margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} color="var(--kouchd-forest)" />
              Reconcile Household Ownership Links
            </h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.86rem", color: "var(--kouchd-muted)" }}>
              This idempotent action scans stays missing a `householdAccountId` and associates them with their host’s household account so RevenueCat subscription snapshots resolve accurately. It never alters plan tiers, prices, or store billing state.
            </p>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 6 }}>
              Audit Reason (required, logged to platformAuditLogs)
            </label>
            <textarea
              rows={3}
              className="console-search-input"
              style={{ width: "100%", marginBottom: "0.75rem" }}
              placeholder="e.g., Backfilling householdAccountId links after host migration..."
              value={reconcileReason}
              onChange={(e) => setReconcileReason(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                className="button ghost compact"
                disabled={isReconciling}
                onClick={() => {
                  setShowReconcileModal(false);
                  setReconcileReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary compact"
                disabled={isReconciling}
                onClick={handleConfirmReconcile}
              >
                {isReconciling ? "Reconciling..." : "Confirm & Reconcile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
