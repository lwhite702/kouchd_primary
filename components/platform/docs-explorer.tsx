"use client";

import { BookOpen, CheckCircle2, ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";
import type { MintlifyOpsStatus } from "@/lib/platform/providers";

export function DocsExplorer({ status }: { status: MintlifyOpsStatus }) {
  return (
    <div>
      <div className="console-guardrail-banner">
        <strong>Documentation Source-of-Truth Boundary:</strong> Public Kouchd help, roadmap, and customer changelog live in `help/*.mdx` with repository-root `docs.json` as canonical configuration and `.mintignore` excluding application and internal `docs/` files. Do not edit or publish documentation from this console; all changes follow the repository review, `mintlify validate` / `mintlify broken-links`, and explicit release-approval workflow.
      </div>

      {/* Mintlify Status Summary */}
      <div className="console-grid-stats">
        <div className="console-stat-card">
          <span className="console-stat-label">Canonical Help Center</span>
          <span className="console-stat-value" style={{ fontSize: "1.2rem" }}>
            help.kouchd.com
          </span>
          <span className="console-stat-subtext">
            Root `docs.json` + `help/*.mdx`
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Navigation &amp; MDX Tree</span>
          <span className="console-stat-value">
            {status.totalConfiguredPages} pages
          </span>
          <span className="console-stat-subtext">
            Across {status.navigationGroupsCount} navigation groups ({status.missingPageFiles.length} missing)
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">.mintignore Boundary</span>
          <div style={{ marginTop: 6 }}>
            <span className={`console-status-pill ${status.mintignorePresent ? "confirmed" : "failed"}`}>
              {status.mintignorePresent ? `Active (${status.mintignoreExcludedCount} rules)` : "Missing"}
            </span>
          </div>
          <span className="console-stat-subtext" style={{ marginTop: 4 }}>
            Excludes `app/`, `convex/`, `docs/internal/`
          </span>
        </div>

        <div className="console-stat-card">
          <span className="console-stat-label">Live Deployment State</span>
          <div style={{ marginTop: 6 }}>
            <span className="console-status-pill pending">
              Verify in Mintlify / GitHub
            </span>
          </div>
          <span className="console-stat-subtext" style={{ marginTop: 4 }}>
            Repo check does not claim live publish status
          </span>
        </div>
      </div>

      {/* Canonical Links & Workflow Guardrails */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={18} color="var(--kouchd-forest)" />
              Canonical Kouchd Help Links &amp; Repository Workflow
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Direct links to public Kouchd documentation (`lib/help-links.ts`) and Mintlify dashboard.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a
              href={status.canonicalDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button primary compact"
              style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Visit help.kouchd.com <ExternalLink size={14} />
            </a>
            <a
              href={status.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button ghost compact"
              style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Mintlify Dashboard <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.65rem", marginBottom: "1.25rem" }}>
          {status.quickLinks.map((item) => (
            <a
              key={item.key}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0.85rem",
                background: "#faf8f5",
                border: "1px solid var(--kouchd-line)",
                borderRadius: 8,
                textDecoration: "none",
                color: "var(--kouchd-ink)",
                fontSize: "0.82rem",
                fontWeight: 700,
              }}
            >
              <span>{item.key}</span>
              <ExternalLink size={13} color="var(--kouchd-forest)" />
            </a>
          ))}
        </div>

        <div style={{ background: "#faf8f5", padding: "1rem", borderRadius: 12, border: "1px solid var(--kouchd-line)" }}>
          <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.88rem", marginBottom: 6 }}>
            <ShieldCheck size={15} color="var(--kouchd-forest)" />
            Mintlify Repository &amp; Release Rules
          </strong>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", lineHeight: 1.6 }}>
            {status.workflowRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Configured Navigation Groups from docs.json */}
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FileCheck2 size={18} color="var(--kouchd-forest)" />
              Verified `docs.json` Navigation Tree ({status.totalConfiguredPages} Pages)
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Server-side structural verification of every page path configured in repository-root `docs.json`.
            </p>
          </div>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Navigation Group</th>
                <th>Repository Source File</th>
                <th>Local File Check</th>
                <th>Public Article URL</th>
              </tr>
            </thead>
            <tbody>
              {status.navigationGroups.flatMap((grp) =>
                grp.pages.map((page) => (
                  <tr key={`${grp.group}:${page.pagePath}`}>
                    <td>
                      <strong>{grp.group}</strong>
                    </td>
                    <td>
                      <code>{page.pagePath}</code>
                    </td>
                    <td>
                      {page.fileExists ? (
                        <span className="console-status-pill confirmed">
                          <CheckCircle2 size={12} /> Verified in Repo
                        </span>
                      ) : (
                        <span className="console-status-pill failed">Missing File</span>
                      )}
                    </td>
                    <td>
                      <a
                        href={page.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--kouchd-forest)", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}
                      >
                        {page.publicUrl} <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
