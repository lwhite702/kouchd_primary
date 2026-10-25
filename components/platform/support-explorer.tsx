"use client";

import { AlertTriangle, ExternalLink, LifeBuoy, Lock, Mail, ShieldAlert } from "lucide-react";
import type { HelpScoutOpsStatus } from "@/lib/platform/providers";

export function SupportExplorer({ status }: { status: HelpScoutOpsStatus }) {
  const isBlocked = status.status === "setup_blocked";

  return (
    <div>
      <div className="console-guardrail-banner">
        <strong>Customer Support Privacy &amp; Access Boundary:</strong> Help Scout is reserved for customer-support conversations (`{status.supportEmail}`). Support threads are strictly isolated from household members and unrelated staff. Kouchd never copies full support message bodies into household records, and this console does not permit replying, creating conversations, or mutating ticket status.
      </div>

      {isBlocked && (
        <div className="console-blocker-banner" role="alert">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
            <AlertTriangle size={22} color="#8f6412" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: "0.96rem", display: "block", marginBottom: 4 }}>
                Help Scout Integration Setup Blocker (Unverified Inbox &amp; Credentials)
              </strong>
              <div>{status.blockerSummary}</div>
              <div style={{ marginTop: 8, fontSize: "0.82rem" }}>
                <strong>Missing Server Environment Variables:</strong>{" "}
                {status.missingEnvKeys.map((k) => (
                  <code key={k} style={{ marginRight: 6, background: "#fffdf8", padding: "2px 6px", borderRadius: 4, border: "1px solid #ebd5ab" }}>
                    {k}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration & Inbox Status Cards */}
      <div className="console-grid-stats">
        <div className="console-stat-card">
          <span className="console-stat-label">Integration Status</span>
          <div style={{ marginTop: 6 }}>
            <span className={`console-env-badge ${isBlocked ? "blocked" : "production"}`}>
              {isBlocked ? "Setup Blocked" : "Configured"}
            </span>
          </div>
          <span className="console-stat-subtext" style={{ marginTop: 4 }}>
            No synthetic or fabricated inbox metrics shown
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Canonical Support Email</span>
          <span className="console-stat-value" style={{ fontSize: "1.2rem" }}>
            {status.supportEmail}
          </span>
          <span className="console-stat-subtext">
            Customer support contact address
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">OAuth2 App Credentials</span>
          <span className="console-stat-value" style={{ fontSize: "1.1rem" }}>
            {status.credentialsConfigured.hasAppId && status.credentialsConfigured.hasAppSecret
              ? "Present"
              : "Not Configured"}
          </span>
          <span className="console-stat-subtext">
            `HELPSCOUT_APP_ID` / `HELPSCOUT_APP_SECRET`
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Verified Mailbox / Inbox ID</span>
          <span className="console-stat-value" style={{ fontSize: "1.1rem" }}>
            {status.credentialsConfigured.hasInboxId ? "Present" : "Unverified"}
          </span>
          <span className="console-stat-subtext">
            `HELPSCOUT_INBOX_ID`
          </span>
        </div>
      </div>

      {/* Safe External Links & Required Provider Setup */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <LifeBuoy size={18} color="var(--kouchd-forest)" />
              Support Operations &amp; Provider Access
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Use the official Help Scout web workspace for support triage and responses.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a
              href={status.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary compact"
              style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Open Help Scout Workspace <ExternalLink size={14} />
            </a>
            <a
              href={`mailto:${status.supportEmail}`}
              className="button soft compact"
              style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Mail size={14} /> {status.supportEmail}
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "#faf8f5", padding: "1rem", borderRadius: 12, border: "1px solid var(--kouchd-line)" }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem", marginBottom: 8 }}>
              <Lock size={15} color="var(--kouchd-forest)" />
              Required Provider Setup Checklist
            </strong>
            <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "var(--kouchd-ink)", lineHeight: 1.6 }}>
              <li>Provision and verify the Kouchd mailbox in Help Scout for <code>help@kouchd.com</code>.</li>
              <li>Create a least-privileged Help Scout OAuth2 application (read-only Mailbox/Conversations scope).</li>
              <li>Configure server-only environment variables: <code>HELPSCOUT_APP_ID</code>, <code>HELPSCOUT_APP_SECRET</code>, and <code>HELPSCOUT_INBOX_ID</code>.</li>
              <li>Never expose Help Scout credentials to browser bundles (`NEXT_PUBLIC_*` is prohibited).</li>
            </ol>
          </div>

          <div style={{ background: "#faf8f5", padding: "1rem", borderRadius: 12, border: "1px solid var(--kouchd-line)" }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem", marginBottom: 8 }}>
              <ShieldAlert size={15} color="var(--kouchd-forest)" />
              Enforced Security &amp; Privacy Guardrails
            </strong>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "var(--kouchd-ink)", lineHeight: 1.6 }}>
              {status.guardrails.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
