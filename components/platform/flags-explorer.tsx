"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, CheckCircle, Flag, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import { ALL_FEATURE_FLAGS, type FeatureFlagKey } from "@/lib/flags/config";

export function FlagsExplorer() {
  const overrides = useQuery(api.flags.list);
  const setOverride = useMutation(api.flags.setOverride);
  const resetOverrides = useMutation(api.flags.resetOverrides);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const overrideMap = useMemo(() => {
    const map = new Map<string, { override: "enabled" | "disabled" | "default"; note?: string; updatedAt?: number }>();
    if (overrides) {
      for (const item of overrides) {
        map.set(item.key, item);
      }
    }
    return map;
  }, [overrides]);

  const categories = useMemo(() => {
    const cats = new Set(ALL_FEATURE_FLAGS.map((f) => f.category));
    return ["all", ...Array.from(cats)];
  }, []);

  const filteredFlags = useMemo(() => {
    return ALL_FEATURE_FLAGS.filter((flag) => {
      const matchesSearch =
        flag.key.toLowerCase().includes(search.toLowerCase()) ||
        flag.label.toLowerCase().includes(search.toLowerCase()) ||
        flag.description.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCategory === "all" || flag.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCategory]);

  const stats = useMemo(() => {
    let forcedOn = 0;
    let forcedOff = 0;
    let inheriting = 0;

    for (const flag of ALL_FEATURE_FLAGS) {
      const ov = overrideMap.get(flag.key);
      if (ov?.override === "enabled") forcedOn += 1;
      else if (ov?.override === "disabled") forcedOff += 1;
      else inheriting += 1;
    }

    return { total: ALL_FEATURE_FLAGS.length, forcedOn, forcedOff, inheriting };
  }, [overrideMap]);

  async function handleOverrideChange(key: FeatureFlagKey, newOverride: "enabled" | "disabled" | "default") {
    setUpdatingKey(key);
    setStatusMessage(null);
    try {
      await setOverride({
        key,
        override: newOverride,
        note: `Updated via Platform Console by operator`,
      });
      setStatusMessage({
        text: `Flag ${key} override updated to "${newOverride}".`,
        type: "success",
      });
    } catch (err) {
      setStatusMessage({
        text: err instanceof Error ? err.message : "Failed to update override.",
        type: "error",
      });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleResetAll() {
    try {
      await resetOverrides();
      setStatusMessage({ text: "All database overrides have been cleared to code/PostHog defaults.", type: "success" });
      setConfirmReset(false);
    } catch (err) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Failed to reset overrides.", type: "error" });
    }
  }

  return (
    <div>
      {/* Informational Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1.25rem",
          background: "#f4f7f4",
          border: "1px solid #c8dbcc",
          borderRadius: 14,
          marginBottom: "1.5rem",
          color: "var(--kouchd-forest, #184f3a)",
        }}
      >
        <Flag size={28} />
        <div>
          <strong style={{ fontSize: "1rem" }}>Platform Feature Flag Management</strong>
          <div style={{ fontSize: "0.82rem", marginTop: 2, color: "#36533f" }}>
            Multi-tiered evaluation: Local Dev &rarr; Convex DB Overrides (Emergency Kill Switches) &rarr; PostHog Cloud Rules &rarr; Code Baseline Defaults.
          </div>
        </div>
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
          {statusMessage.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="console-stat-card" style={{ padding: "1rem", background: "#fff", borderRadius: 12, border: "1px solid var(--line, #e6ded2)" }}>
          <span style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted, #6f675b)", fontWeight: 700 }}>Total Registered</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: 4 }}>{stats.total}</strong>
        </div>
        <div className="console-stat-card" style={{ padding: "1rem", background: "#fff", borderRadius: 12, border: "1px solid var(--line, #e6ded2)" }}>
          <span style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted, #6f675b)", fontWeight: 700 }}>Inheriting (Default / PostHog)</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: 4, color: "var(--green, #184f3a)" }}>{stats.inheriting}</strong>
        </div>
        <div className="console-stat-card" style={{ padding: "1rem", background: "#fff", borderRadius: 12, border: "1px solid var(--line, #e6ded2)" }}>
          <span style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted, #6f675b)", fontWeight: 700 }}>Forced ON</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: 4, color: "#1971c2" }}>{stats.forcedOn}</strong>
        </div>
        <div className="console-stat-card" style={{ padding: "1rem", background: "#fff", borderRadius: 12, border: "1px solid var(--line, #e6ded2)" }}>
          <span style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted, #6f675b)", fontWeight: 700 }}>Forced OFF (Kill Switch)</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: 4, color: "#d9480f" }}>{stats.forcedOff}</strong>
        </div>
      </div>

      {/* Controls Card */}
      <div className="console-card">
        <div className="console-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2>Feature Flags Explorer ({filteredFlags.length})</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted, #6f675b)", fontSize: "0.85rem" }}>
              Configure runtime kill-switches and emergency overrides across web and backend surfaces.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {confirmReset ? (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="button danger compact"
                  onClick={handleResetAll}
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  Confirm Reset All
                </button>
                <button
                  type="button"
                  className="button ghost compact"
                  onClick={() => setConfirmReset(false)}
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button ghost compact"
                onClick={() => setConfirmReset(true)}
                style={{ fontSize: "0.8rem", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 5 }}
                title="Clear all DB overrides back to default"
              >
                <RotateCcw size={14} /> Reset Overrides
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--line, #e6ded2)", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 260 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="Filter by flag key or label..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: 32,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 8,
                border: "1px solid var(--line, #e6ded2)",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`button ${selectedCategory === cat ? "primary" : "ghost"} compact`}
                style={{ fontSize: "0.78rem", padding: "4px 10px", textTransform: "capitalize" }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Flags Table */}
        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Flag Key & Description</th>
                <th>Category</th>
                <th>Code Default</th>
                <th>Platform Override</th>
                <th>Effective Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlags.map((flag) => {
                const currentOverride = overrideMap.get(flag.key)?.override ?? "default";
                const isOverridden = currentOverride !== "default";
                const effectiveEnabled = isOverridden
                  ? currentOverride === "enabled"
                  : flag.defaultValue;
                const isBusy = updatingKey === flag.key;

                return (
                  <tr key={flag.key}>
                    <td>
                      <div>
                        <strong style={{ fontSize: "0.92rem", display: "flex", alignItems: "center", gap: 6 }}>
                          <Flag size={14} color="var(--green, #184f3a)" />
                          {flag.label}
                        </strong>
                        <code style={{ fontSize: "0.78rem", color: "var(--muted, #6f675b)", background: "#f5f0e8", padding: "1px 6px", borderRadius: 4 }}>
                          {flag.key}
                        </code>
                        <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#555" }}>
                          {flag.description}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "#e8efdf",
                          color: "var(--kouchd-forest, #184f3a)",
                        }}
                      >
                        {flag.category}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: flag.defaultValue ? "#2b8a3e" : "#868e96" }}>
                        {flag.defaultValue ? "ON (True)" : "OFF (False)"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <select
                          disabled={isBusy}
                          value={currentOverride}
                          onChange={(e) => handleOverrideChange(flag.key, e.target.value as "enabled" | "disabled" | "default")}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: "0.82rem",
                            border: isOverridden ? "1px solid #184f3a" : "1px solid var(--line, #e6ded2)",
                            fontWeight: isOverridden ? 700 : 400,
                            background: isOverridden ? "#f0fdf4" : "#fff",
                          }}
                        >
                          <option value="default">Default (Inherit)</option>
                          <option value="enabled">Forced ON</option>
                          <option value="disabled">Forced OFF (Kill)</option>
                        </select>
                        {isBusy && <RefreshCw size={14} className="spinning" />}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 12,
                          background: effectiveEnabled ? "#d3f9d8" : "#ffe3e3",
                          color: effectiveEnabled ? "#2b8a3e" : "#c92a2a",
                        }}
                      >
                        {effectiveEnabled ? "Active" : "Disabled"}
                        {isOverridden && <span style={{ fontSize: "0.68rem", opacity: 0.8 }}>(Override)</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
