"use client";

import { useQuery } from "convex/react";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Home,
  LifeBuoy,
  Mail,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { HelpScoutOpsStatus, MintlifyOpsStatus } from "@/lib/platform/providers";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatMoney(cents: number) {
  return money.format(cents / 100);
}

function formatTimestamp(ms: number | null | undefined) {
  if (!ms) return "No events recorded";
  return new Date(ms).toLocaleString();
}

export function OverviewDashboard({
  consoleKey,
  basePath: explicitBasePath,
  helpScoutStatus,
  mintlifyStatus,
}: {
  consoleKey?: string;
  basePath?: string;
  helpScoutStatus?: HelpScoutOpsStatus;
  mintlifyStatus?: MintlifyOpsStatus;
}) {
  const stats = useQuery(api.admin.getOverviewStats, {});
  const opsOverview = useQuery(api.admin.getPlatformOpsOverview, {});

  if (stats === undefined || opsOverview === undefined) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--kouchd-muted)" }}>
        Loading Platform Ops status and provider telemetry...
      </div>
    );
  }

  const basePath = explicitBasePath ?? (consoleKey ? `/console/${consoleKey}` : "/platform");
  const { providers, recentAuditLogs } = opsOverview;

  return (
    <div>
      <div className="console-guardrail-banner">
        <strong>Source-of-Truth & Responsibility Boundary:</strong> Clerk is authoritative for identity; Convex is authoritative for household entitlements and access. Guests stay free, and household contributions are shared records—Kouchd never collects, holds, or transfers money. This console provides read-only operational visibility and narrowly scoped, audited reconciliation/retry tools without replacing provider dashboards.
      </div>

      {/* 5-Provider Operational Status Matrix */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Provider Operational Visibility</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Live environment configuration, latest ingested event timestamps, recent failure counts, and direct links to each provider’s canonical dashboard.
            </p>
          </div>
        </div>

        <div className="console-provider-grid">
          {/* 1. RevenueCat */}
          <div className="console-provider-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.98rem" }}>
                  <CreditCard size={16} color="var(--kouchd-forest)" />
                  RevenueCat
                </strong>
                {providers.revenueCat.expectedEnvironment ? (
                  <span className={`console-env-badge ${providers.revenueCat.expectedEnvironment}`}>
                    {providers.revenueCat.expectedEnvironment}
                  </span>
                ) : (
                  <span className="console-env-badge blocked">Env Unset</span>
                )}
              </div>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                Host subscription purchase lifecycle & webhook ingestion. Convex remains authoritative for household entitlements.
              </p>
              <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
                <div><strong>Snapshots:</strong> {providers.revenueCat.snapshotsCount} ({providers.revenueCat.householdAccountsCount} accounts)</div>
                <div><strong>Last Event:</strong> {formatTimestamp(providers.revenueCat.lastEventAt)}</div>
                <div>
                  <strong>Webhook Errors:</strong>{" "}
                  <span style={{ color: providers.revenueCat.recentFailuresCount > 0 ? "#a82d1c" : "inherit", fontWeight: 700 }}>
                    {providers.revenueCat.recentFailuresCount}
                  </span>
                </div>
                {providers.revenueCat.missingHouseholdLinksCount > 0 && (
                  <div style={{ color: "#8f6412", fontWeight: 700 }}>
                    {providers.revenueCat.missingHouseholdLinksCount} stay(s) need ownership reconciliation
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f0ebe1" }}>
              <Link href={`${basePath}/subscriptions`} className="button soft compact" style={{ fontSize: "0.78rem", padding: "4px 10px" }}>
                Inspect Subscriptions
              </Link>
              <a
                href={providers.revenueCat.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.78rem", color: "var(--kouchd-forest)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}
              >
                Dashboard <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* 2. Knock */}
          <div className="console-provider-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.98rem" }}>
                  <Bell size={16} color="var(--kouchd-forest)" />
                  Knock
                </strong>
                <span className={`console-status-pill ${providers.knock.configured ? "configured" : "pending"}`}>
                  {providers.knock.configured ? "Configured" : "Key Unset"}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                Transactional notifications & 1/day capped household reminders.
              </p>
              <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
                <div><strong>Recent Deliveries:</strong> {providers.knock.recentSentCount}</div>
                <div><strong>Last Delivery:</strong> {formatTimestamp(providers.knock.lastEventAt)}</div>
                <div>
                  <strong>Recent Failures:</strong>{" "}
                  <span style={{ color: providers.knock.recentFailuresCount > 0 ? "#a82d1c" : "inherit", fontWeight: 700 }}>
                    {providers.knock.recentFailuresCount}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f0ebe1" }}>
              <Link href={`${basePath}/notifications`} className="button soft compact" style={{ fontSize: "0.78rem", padding: "4px 10px" }}>
                Inspect Workflows
              </Link>
              <a
                href={providers.knock.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.78rem", color: "var(--kouchd-forest)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}
              >
                Dashboard <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* 3. Loops */}
          <div className="console-provider-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.98rem" }}>
                  <Mail size={16} color="var(--kouchd-forest)" />
                  Loops
                </strong>
                <span className={`console-status-pill ${providers.loops.configured ? "configured" : "pending"}`}>
                  {providers.loops.configured ? "Configured" : "Marketing Env"}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                Opted-in marketing newsletter only (`mail.kouchd.com`). Never auto-adds hosts or guests.
              </p>
              <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
                <div><strong>Subscribed:</strong> {providers.loops.subscribedCount}</div>
                <div><strong>Unsubscribed / Suppressed:</strong> {providers.loops.suppressedOrUnsubscribedCount}</div>
                <div><strong>Last Consent Update:</strong> {formatTimestamp(providers.loops.lastEventAt)}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f0ebe1" }}>
              <Link href={`${basePath}/marketing`} className="button soft compact" style={{ fontSize: "0.78rem", padding: "4px 10px" }}>
                Inspect Consent
              </Link>
              <a
                href={providers.loops.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.78rem", color: "var(--kouchd-forest)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}
              >
                Dashboard <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* 4. Help Scout */}
          <div className="console-provider-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.98rem" }}>
                  <LifeBuoy size={16} color="var(--kouchd-forest)" />
                  Help Scout
                </strong>
                <span className={`console-env-badge ${helpScoutStatus?.status === "configured" ? "production" : "blocked"}`}>
                  {helpScoutStatus?.status === "configured" ? "Configured" : "Setup Blocked"}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                Customer support conversations (`help@kouchd.com`). Isolated from household members.
              </p>
              <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
                <div>
                  <strong>Missing Keys:</strong>{" "}
                  {helpScoutStatus?.missingEnvKeys?.length
                    ? helpScoutStatus.missingEnvKeys.join(", ")
                    : "None"}
                </div>
                <div><strong>Support Address:</strong> {helpScoutStatus?.supportEmail ?? "help@kouchd.com"}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f0ebe1" }}>
              <Link href={`${basePath}/support`} className="button soft compact" style={{ fontSize: "0.78rem", padding: "4px 10px" }}>
                View Setup Blocker
              </Link>
              <a
                href={helpScoutStatus?.dashboardUrl ?? "https://secure.helpscout.net"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.78rem", color: "var(--kouchd-forest)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}
              >
                Help Scout <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* 5. Mintlify */}
          <div className="console-provider-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.98rem" }}>
                  <BookOpen size={16} color="var(--kouchd-forest)" />
                  Mintlify
                </strong>
                <span className={`console-status-pill ${mintlifyStatus?.docsJsonValid && (mintlifyStatus?.missingPageFiles.length ?? 0) === 0 ? "configured" : "pending"}`}>
                  {mintlifyStatus?.docsJsonValid ? "Repo Config Valid" : "Check Config"}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                Public help center, roadmap, and customer changelog (`help/*.mdx` + `docs.json`).
              </p>
              <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
                <div>
                  <strong>Configured Pages:</strong> {mintlifyStatus?.totalConfiguredPages ?? 16} across {mintlifyStatus?.navigationGroupsCount ?? 7} groups
                </div>
                <div>
                  <strong>Missing MDX Files:</strong> {mintlifyStatus?.missingPageFiles.length ?? 0}
                </div>
                <div>
                  <strong>Live Deploy Status:</strong> Unverified in console (verify via GitHub/Mintlify)
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f0ebe1" }}>
              <Link href={`${basePath}/docs`} className="button soft compact" style={{ fontSize: "0.78rem", padding: "4px 10px" }}>
                Inspect Docs Tree
              </Link>
              <a
                href={mintlifyStatus?.canonicalDocsUrl ?? "https://help.kouchd.com"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.78rem", color: "var(--kouchd-forest)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}
              >
                help.kouchd.com <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Core Household & Record Metrics */}
      <div className="console-grid-stats">
        <div className="console-stat-card">
          <span className="console-stat-label">Total Users</span>
          <span className="console-stat-value">{stats.totalUsers}</span>
          <span className="console-stat-subtext">Clerk-authenticated profiles</span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Active Households</span>
          <span className="console-stat-value">{stats.activeStays}</span>
          <span className="console-stat-subtext">
            {stats.pendingStays} pending &middot; {stats.endedStays} ended
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Recorded Schedule Volume</span>
          <span className="console-stat-value">{formatMoney(stats.totalObligationsCents)}</span>
          <span className="console-stat-subtext">Shared contribution records (non-custodial)</span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Confirmed Contributions</span>
          <span className="console-stat-value">{formatMoney(stats.totalConfirmedCents)}</span>
          <span className="console-stat-subtext">Confirmed between hosts & guests</span>
        </div>

        <div className="console-stat-card" style={stats.disputedContributionsCount > 0 ? { borderColor: "#fae4df", background: "#fdf8f7" } : {}}>
          <span className="console-stat-label">Open Ledger Disputes</span>
          <span className="console-stat-value" style={stats.disputedContributionsCount > 0 ? { color: "#a82d1c" } : {}}>
            {stats.disputedContributionsCount}
          </span>
          <span className="console-stat-subtext">
            {stats.pendingContributionsCount} pending host confirmation
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">10DLC SMS Opt-Ins</span>
          <span className="console-stat-value">{stats.smsOptIns}</span>
          <span className="console-stat-subtext">{stats.smsOptOuts} total opt-outs</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        {/* Privileged Staff Audit Log */}
        <div className="console-card">
          <div className="console-card-header">
            <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} color="var(--kouchd-forest)" />
              Recent Privileged Staff Actions
            </h2>
          </div>
          <div>
            {recentAuditLogs.map((log) => (
              <div key={log._id} className="console-activity-item">
                <span className="console-activity-dot" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.86rem" }}>
                    <code>{log.action}</code> &middot; <span style={{ color: "var(--kouchd-forest)" }}>{log.actorEmail ?? log.actorClerkUserId}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--kouchd-ink)", marginTop: 2 }}>
                    Reason: “{log.reason}”
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)", marginTop: 2 }}>
                    Target: {log.targetType} ({log.targetId ?? "—"})
                  </div>
                </div>
                <span style={{ fontSize: "0.74rem", color: "var(--kouchd-muted)", whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
            {recentAuditLogs.length === 0 && (
              <p style={{ color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
                No privileged staff mutations recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* Internal Directory & Compliance Shortcuts */}
        <div className="console-card">
          <div className="console-card-header">
            <h2>Internal Records & Compliance</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link
              href={`${basePath}/users`}
              className="button soft"
              style={{ justifyContent: "flex-start", padding: "12px 16px" }}
            >
              <Users size={18} />
              <div style={{ textAlign: "left" }}>
                <strong>User Directory & Admin Grants</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                  Inspect Clerk-synced profiles, household memberships, and audited admin grants
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
                <strong>Household & Stay Explorer (Redacted)</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                  Inspect stay status and terms without exposing Wi-Fi passwords or door codes
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
                <strong>Contribution Records & Disputes</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                  Review shared contribution records and disputed ledger entries
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
                <strong>10DLC SMS Consent Audit Trail</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                  Inspect explicit transactional SMS opt-in and opt-out records
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
