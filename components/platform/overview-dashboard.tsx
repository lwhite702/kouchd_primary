"use client";

import { useQuery } from "convex/react";
import { CheckCircle2, Home, Receipt, Users } from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatMoney(cents: number) {
  return money.format(cents / 100);
}

export function OverviewDashboard({ consoleKey }: { consoleKey: string }) {
  const stats = useQuery(api.admin.getOverviewStats, {});

  if (stats === undefined) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--kouchd-muted)" }}>
        Loading platform metrics...
      </div>
    );
  }

  const basePath = `/console/${consoleKey}`;

  return (
    <div>
      <div className="console-grid-stats">
        <div className="console-stat-card">
          <span className="console-stat-label">Total Users</span>
          <span className="console-stat-value">{stats.totalUsers}</span>
          <span className="console-stat-subtext">Registered across platform</span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Active Households</span>
          <span className="console-stat-value">{stats.activeStays}</span>
          <span className="console-stat-subtext">
            {stats.pendingStays} pending &middot; {stats.endedStays} ended
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Tracked Charges</span>
          <span className="console-stat-value">{formatMoney(stats.totalObligationsCents)}</span>
          <span className="console-stat-subtext">Base obligation volume</span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Confirmed Contributions</span>
          <span className="console-stat-value">{formatMoney(stats.totalConfirmedCents)}</span>
          <span className="console-stat-subtext">Verified between hosts & guests</span>
        </div>

        <div className="console-stat-card" style={stats.disputedContributionsCount > 0 ? { borderColor: "#fae4df", background: "#fdf8f7" } : {}}>
          <span className="console-stat-label">Open Disputes</span>
          <span className="console-stat-value" style={stats.disputedContributionsCount > 0 ? { color: "#a82d1c" } : {}}>
            {stats.disputedContributionsCount}
          </span>
          <span className="console-stat-subtext">
            {stats.pendingContributionsCount} pending confirmation
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">10DLC SMS Opt-Ins</span>
          <span className="console-stat-value">{stats.smsOptIns}</span>
          <span className="console-stat-subtext">{stats.smsOptOuts} total opt-outs</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Quick Navigation Cards */}
        <div className="console-card">
          <div className="console-card-header">
            <h2>Platform Management</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link
              href={`${basePath}/users`}
              className="button soft"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
            >
              <Users size={18} />
              <div style={{ textAlign: "left" }}>
                <strong>User Directory</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                  Search users, contact details, and SMS opt-in status
                </div>
              </div>
            </Link>

            <Link
              href={`${basePath}/stays`}
              className="button soft"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
            >
              <Home size={18} />
              <div style={{ textAlign: "left" }}>
                <strong>Household & Stay Explorer</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                  Inspect stays, referral codes, agreements, and member rosters
                </div>
              </div>
            </Link>

            <Link
              href={`${basePath}/financials`}
              className="button soft"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
            >
              <Receipt size={18} />
              <div style={{ textAlign: "left" }}>
                <strong>Ledgers & Disputes Queue</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                  Audit disputed contributions and fee waiver overrides
                </div>
              </div>
            </Link>

            <Link
              href={`${basePath}/compliance`}
              className="button soft"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
            >
              <CheckCircle2 size={18} />
              <div style={{ textAlign: "left" }}>
                <strong>10DLC Carrier Compliance Log</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                  Verify transactional SMS consent audit events
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent System Activity */}
        <div className="console-card">
          <div className="console-card-header">
            <h2>Recent Activity</h2>
          </div>
          <div>
            {stats.recentActivity.map((act) => (
              <div key={act._id} className="console-activity-item">
                <span className="console-activity-dot" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                    {act.actorName} &middot; <span style={{ textTransform: "capitalize", color: "var(--kouchd-forest)" }}>{act.action.replaceAll("_", " ")}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)", marginTop: "2px" }}>
                    {act.detail}
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)", whiteSpace: "nowrap" }}>
                  {new Date(act.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <p style={{ color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
                No recent activity recorded.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
