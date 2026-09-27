"use client";

import { useQuery } from "convex/react";
import { ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";

export function ComplianceExplorer() {
  const events = useQuery(api.admin.listSmsComplianceEvents, { limit: 100 });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1.25rem",
          background: "#e8efdf",
          border: "1px solid #b8d2c1",
          borderRadius: 14,
          marginBottom: "1.5rem",
          color: "var(--kouchd-forest)",
        }}
      >
        <ShieldCheck size={28} />
        <div>
          <strong style={{ fontSize: "1rem" }}>Carrier 10DLC Regulatory Compliance</strong>
          <div style={{ fontSize: "0.82rem", marginTop: 2 }}>
            Transactional SMS consent events logged in accordance with CTIA guidelines and carrier requirements for Wrelik Brands LLC (operating Kouchd).
          </div>
        </div>
      </div>

      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>SMS Consent Audit Log ({events?.length ?? 0})</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Immutable record of subscriber opt-ins, opt-outs, consent sources, and timestamp audit trails.
            </p>
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Phone Number</th>
                <th>User</th>
                <th>Action</th>
                <th>Opt-in Source</th>
                <th>Consent Version</th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).map((evt) => (
                <tr key={evt._id}>
                  <td>
                    <span style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                      {new Date(evt.recordedAt).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <strong>{evt.phone}</strong>
                  </td>
                  <td>
                    <div>{evt.userName}</div>
                    {evt.userEmail && (
                      <div style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)" }}>
                        {evt.userEmail}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`console-status-pill ${evt.action}`}>
                      {evt.action.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span style={{ textTransform: "capitalize", fontSize: "0.82rem" }}>
                      {evt.source.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: "0.75rem", background: "#f0ede6", padding: "2px 6px", borderRadius: 4 }}>
                      {evt.consentVersion}
                    </code>
                  </td>
                </tr>
              ))}
              {(events ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No consent events recorded.
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
