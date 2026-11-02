"use client";

import { AlertTriangle, ExternalLink, LifeBuoy, Lock, Mail, ShieldAlert } from "lucide-react";
import type { FreshdeskOpsStatus } from "@/lib/platform/providers";

export function SupportExplorer({ status }: { status: FreshdeskOpsStatus }) {
  const isBlocked = status.status === "setup_blocked";

  return (
    <div>
      <div className="console-guardrail-banner">
        <strong>Customer Support Privacy &amp; Access Boundary:</strong> Freshdesk is reserved for customer-support conversations (`{status.supportEmail}`). Support threads are strictly isolated from household members and unrelated staff. Kouchd never copies full support message bodies into household records, and this console does not permit replying, creating tickets, or mutating ticket status.
      </div>

      {isBlocked && (
        <div className="console-blocker-banner" role="alert">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
            <AlertTriangle size={22} color="#8f6412" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: "0.96rem", display: "block", marginBottom: 4 }}>
                Freshdesk Integration Setup Blocker (Unverified Portal &amp; API Key)
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
            No synthetic or fabricated ticket metrics shown
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
          <span className="console-stat-label">Freshdesk Portal Domain</span>
          <span className="console-stat-value" style={{ fontSize: "1.05rem" }}>
            {status.credentialsConfigured.hasDomain ? status.domain : "Not Configured"}
          </span>
          <span className="console-stat-subtext">
            <code>FRESHDESK_DOMAIN</code>
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">API Key Configuration</span>
          <span className="console-stat-value" style={{ fontSize: "1.1rem" }}>
            {status.credentialsConfigured.hasApiKey ? "Configured" : "Not Configured"}
          </span>
          <span className="console-stat-subtext">
            <code>FRESHDESK_API_KEY</code>
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
              Use the official Freshdesk agent portal for ticket triage, customer communication, and support resolution.
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
              Open Freshdesk Portal <ExternalLink size={14} />
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
              <li>Provision the Kouchd support portal in Freshdesk (e.g., <code>kouchd.freshdesk.com</code> or custom domain).</li>
              <li>Configure incoming support email forwarding for <code>support@kouchd.com</code> and <code>help@kouchd.com</code>.</li>
              <li>Generate a least-privileged Freshdesk API Key (read-only Tickets scope).</li>
              <li>Configure server-only environment variables: <code>FRESHDESK_DOMAIN</code> and <code>FRESHDESK_API_KEY</code>.</li>
              <li>Never expose Freshdesk credentials to browser bundles (<code>NEXT_PUBLIC_*</code> is prohibited).</li>
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
