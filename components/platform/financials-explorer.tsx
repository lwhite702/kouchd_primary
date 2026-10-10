"use client";

import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatMoney(cents: number) {
  return money.format(cents / 100);
}

export function FinancialsExplorer() {
  const [statusFilter, setStatusFilter] = useState("all");
  const data = useQuery(api.admin.listDisputesAndLedgers, {
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
  });

  const contributions = data?.contributions ?? [];
  const auditedObligations = data?.auditedObligations ?? [];

  const disputedCount = contributions.filter((c) => c.status === "disputed").length;

  return (
    <div>
      {/* Alert Banner if Disputed Items exist */}
      {disputedCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            background: "#fae4df",
            border: "1px solid #e5b3a9",
            borderRadius: 12,
            marginBottom: "1.5rem",
            color: "#8a2012",
          }}
        >
          <ShieldAlert size={22} />
          <div>
            <strong>Attention: {disputedCount} Disputed Contribution{disputedCount === 1 ? "" : "s"}</strong>
            <div style={{ fontSize: "0.82rem" }}>
              A member has contested one or more contribution logs. Review details below.
            </div>
          </div>
        </div>
      )}

      {/* Contributions Queue */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Contributions & Disputes Queue</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Audit logged money transfers, groceries, supplies, and contested records.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className={`button ${statusFilter === "all" ? "primary" : "soft"} compact`}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`button ${statusFilter === "disputed" ? "primary" : "soft"} compact`}
              style={statusFilter === "disputed" ? { background: "#a82d1c", borderColor: "#a82d1c" } : {}}
              onClick={() => setStatusFilter("disputed")}
            >
              Disputed
            </button>
            <button
              type="button"
              className={`button ${statusFilter === "pending" ? "primary" : "soft"} compact`}
              onClick={() => setStatusFilter("pending")}
            >
              Pending
            </button>
            <button
              type="button"
              className={`button ${statusFilter === "confirmed" ? "primary" : "soft"} compact`}
              onClick={() => setStatusFilter("confirmed")}
            >
              Confirmed
            </button>
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Household</th>
                <th>Logged By</th>
                <th>Applied To</th>
                <th>Note</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => (
                <tr key={c._id} style={c.status === "disputed" ? { background: "#fdf8f7" } : {}}>
                  <td>
                    <span style={{ fontSize: "0.82rem" }}>{c.date}</span>
                  </td>
                  <td>
                    <span style={{ textTransform: "capitalize", fontWeight: 700 }}>
                      {c.type.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: "var(--kouchd-forest)" }}>
                      {formatMoney(c.amountCents)}
                    </strong>
                  </td>
                  <td>
                    <span style={{ letterSpacing: "1px", fontWeight: 700 }}>
                      {c.referralCode ?? "KCH-SHARED"}
                    </span>
                  </td>
                  <td>{c.creatorName}</td>
                  <td>{c.guestName}</td>
                  <td>
                    <span style={{ fontSize: "0.82rem", color: c.note ? "inherit" : "var(--kouchd-muted)" }}>
                      {c.note || "No note"}
                    </span>
                  </td>
                  <td>
                    <span className={`console-status-pill ${c.status}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {contributions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No contributions matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audited Fee Waivers & Cancellations */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Audited Fee Waivers & Voided Obligations</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Audit trail of host late-fee waivers and cancelled ad-hoc charges.
            </p>
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Title / Period</th>
                <th>Due Date</th>
                <th>Base Amount</th>
                <th>Type</th>
                <th>Audit Action</th>
                <th>Action Date</th>
              </tr>
            </thead>
            <tbody>
              {auditedObligations.map((ob) => (
                <tr key={ob._id}>
                  <td><strong>{ob.title ?? "Obligation"}</strong></td>
                  <td>{ob.dueDate}</td>
                  <td>{formatMoney(ob.baseAmountCents)}</td>
                  <td><span style={{ textTransform: "capitalize" }}>{ob.type ?? "cadence"}</span></td>
                  <td>
                    {ob.lateFeeWaivedAt && (
                      <span className="console-status-pill pending">Late Fee Waived</span>
                    )}
                    {ob.voidedAt && (
                      <span className="console-status-pill ended">Charge Voided</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.82rem", color: "var(--kouchd-muted)" }}>
                      {new Date(ob.lateFeeWaivedAt ?? ob.voidedAt ?? ob.createdAt).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
              {auditedObligations.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No fee waivers or voided obligations recorded.
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
