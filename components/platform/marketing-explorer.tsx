"use client";

import { useQuery } from "convex/react";
import { ExternalLink, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

function formatDate(ms: number | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

export function MarketingExplorer() {
  const data = useQuery(api.admin.getLoopsOps, {});
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (data === undefined) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--kouchd-muted)" }}>
        Loading Loops marketing consent and suppression state...
      </div>
    );
  }

  const filteredConsents = data.consents.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  return (
    <div>
      <div className="console-guardrail-banner">
        <strong>Marketing Email &amp; Consent Boundary:</strong> Loops is strictly isolated to optional marketing newsletter signups (`mail.kouchd.com`), separate from Knock transactional reminders and Help Scout customer support. Kouchd <strong>never</strong> adds hosts or guests to Loops automatically. Explicit opt-in and double opt-in confirmation are preserved, and this console does not provide campaign-sending or consent-override controls.
      </div>

      {/* Loops Configuration & Audience Summary */}
      <div className="console-grid-stats">
        <div className="console-stat-card">
          <span className="console-stat-label">Sending Domain &amp; Reply-To</span>
          <span className="console-stat-value" style={{ fontSize: "1.25rem" }}>
            {data.config.sendingDomain}
          </span>
          <span className="console-stat-subtext">
            Reply-To: {data.config.replyToEmail}
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Confirmed Subscribers</span>
          <span className="console-stat-value">{data.counts.subscribed}</span>
          <span className="console-stat-subtext">
            {data.counts.pendingConfirmation} pending double opt-in
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Unsubscribed / Suppressed</span>
          <span className="console-stat-value">
            {data.counts.unsubscribed + data.counts.suppressed}
          </span>
          <span className="console-stat-subtext">
            {data.counts.unsubscribed} unsubscribed &middot; {data.counts.suppressed} suppressed
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Audience Policy</span>
          <div style={{ marginTop: 6 }}>
            <span className="console-status-pill confirmed">
              Explicit Opt-In Only
            </span>
          </div>
          <span className="console-stat-subtext" style={{ marginTop: 4 }}>
            Auto-enrollment of hosts/guests: Disabled
          </span>
        </div>
      </div>

      {/* Audience Isolation & Policy Card */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} color="var(--kouchd-forest)" />
              Loops Audience Isolation &amp; Compliance Rules
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Verified configuration rules from WRE-213 (`codex/WRE-213-main-newsletter`) and `kouchd_marketing`.
            </p>
          </div>
          <a
            href={data.config.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button ghost compact"
            style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Loops Dashboard <ExternalLink size={14} />
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", fontSize: "0.84rem" }}>
          <div style={{ background: "#faf8f5", padding: "0.9rem", borderRadius: 10, border: "1px solid var(--kouchd-line)" }}>
            <strong>Allowed Opt-In Source Filter</strong>
            <div style={{ marginTop: 4, color: "var(--kouchd-muted)" }}>
              <code>{data.config.allowedOptInSource}</code> (rate-limited public marketing form only)
            </div>
          </div>
          <div style={{ background: "#faf8f5", padding: "0.9rem", borderRadius: 10, border: "1px solid var(--kouchd-line)" }}>
            <strong>Double Opt-In &amp; Suppression</strong>
            <div style={{ marginTop: 4, color: "var(--kouchd-muted)" }}>
              Required: {data.config.doubleOptInRequired ? "Yes" : "No"} &middot; Unsubscribe and bounce suppression states are immutable from Platform Ops.
            </div>
          </div>
          <div style={{ background: "#faf8f5", padding: "0.9rem", borderRadius: 10, border: "1px solid var(--kouchd-line)" }}>
            <strong>App Environment Status</strong>
            <div style={{ marginTop: 4, color: "var(--kouchd-muted)" }}>
              API Key in App Env: {data.config.hasApiKey ? "Present" : "Not set in app env (configured on marketing site)"} &middot; Form ID: {data.config.hasFormId ? "Present" : "Marketing site"}
            </div>
          </div>
        </div>
      </div>

      {/* Consent & Suppression Ledger */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Newsletter Consent &amp; Suppression Records ({filteredConsents.length})</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Read-only audit view of newsletter opt-in sources, confirmation status, and unsubscribe/suppression timestamps.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {["all", "subscribed", "pending_confirmation", "unsubscribed", "suppressed"].map((st) => (
              <button
                key={st}
                type="button"
                className={`button ${statusFilter === st ? "primary" : "ghost"} compact`}
                style={{ fontSize: "0.76rem", padding: "4px 10px", textTransform: "capitalize" }}
                onClick={() => setStatusFilter(st)}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Contact (Redacted)</th>
                <th>Status</th>
                <th>Opt-In Source</th>
                <th>Double Opt-In</th>
                <th>Requested At</th>
                <th>Confirmed At</th>
                <th>Unsubscribed / Suppressed</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsents.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Mail size={13} color="var(--kouchd-muted)" />
                      {item.emailRedacted}
                    </strong>
                  </td>
                  <td>
                    <span className={`console-status-pill ${item.status}`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </td>
                  <td><code>{item.source}</code></td>
                  <td>
                    <span className={`console-status-pill ${item.doubleOptInStatus === "confirmed" ? "confirmed" : "pending"}`}>
                      {item.doubleOptInStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>{formatDate(item.requestedAt)}</td>
                  <td style={{ fontSize: "0.8rem" }}>{formatDate(item.confirmedAt)}</td>
                  <td style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                    {formatDate(item.unsubscribedAt ?? item.suppressedAt)}
                  </td>
                </tr>
              ))}
              {filteredConsents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No newsletter consent records synced to this environment yet. Manage live newsletter audiences directly in Loops.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
