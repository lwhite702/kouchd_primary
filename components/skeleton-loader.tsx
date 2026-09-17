"use client";

import React from "react";

export function SkeletonBox({
  width,
  height,
  borderRadius = 12,
  className = "",
  style = {},
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function DashboardSkeleton({
  message = "Setting out the clean sheets...",
}: {
  message?: string;
}) {
  return (
    <div className="app-shell production-shell skeleton-dashboard-wrap" role="status" aria-label="Loading stay details">
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SkeletonBox width={110} height={32} borderRadius={8} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SkeletonBox width={75} height={36} borderRadius={16} />
          <SkeletonBox width={36} height={36} borderRadius={18} />
        </div>
      </header>

      <main style={{ padding: "30px 20px 120px", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        {/* Soft status chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div className="skeleton-status-pill">
            <span className="spinner-dots" />
            <span>{message}</span>
          </div>
        </div>

        {/* Hero Stay Card Skeleton */}
        <div
          style={{
            background: "var(--kouchd-forest, #184f3a)",
            borderRadius: 28,
            padding: 30,
            color: "white",
            marginBottom: 20,
            opacity: 0.95,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <SkeletonBox width={80} height={12} borderRadius={4} style={{ background: "rgba(255,255,255,0.2)", marginBottom: 10 }} />
              <SkeletonBox width={220} height={28} borderRadius={6} style={{ background: "rgba(255,255,255,0.3)" }} />
            </div>
            <SkeletonBox width={64} height={32} borderRadius={99} style={{ background: "rgba(223,242,94,0.4)" }} />
          </div>
          <SkeletonBox width={160} height={14} borderRadius={4} style={{ background: "rgba(255,255,255,0.2)", marginBottom: 24 }} />
          <SkeletonBox width="100%" height={10} borderRadius={99} style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* 3 Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 30 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: i === 1 ? "var(--kouchd-sky, #c9e7f0)" : "var(--kouchd-surface, #fffdf8)",
                border: "1px solid var(--kouchd-line, #ded8ce)",
                borderRadius: 24,
                padding: 24,
              }}
            >
              <SkeletonBox width={70} height={12} borderRadius={4} style={{ marginBottom: 12, opacity: 0.6 }} />
              <SkeletonBox width={120} height={36} borderRadius={8} style={{ marginBottom: 10 }} />
              <SkeletonBox width={160} height={14} borderRadius={4} style={{ opacity: 0.7 }} />
            </div>
          ))}
        </div>

        {/* List Section Skeleton */}
        <div style={{ border: "1px solid var(--kouchd-line, #ded8ce)", borderRadius: 24, background: "white", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <SkeletonBox width={140} height={20} borderRadius={6} />
            <SkeletonBox width={70} height={14} borderRadius={4} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(222,216,206,0.5)",
                }}
              >
                <SkeletonBox width={40} height={40} borderRadius={12} />
                <div style={{ flex: 1 }}>
                  <SkeletonBox width="60%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                  <SkeletonBox width="40%" height={12} borderRadius={4} style={{ opacity: 0.6 }} />
                </div>
                <SkeletonBox width={50} height={18} borderRadius={6} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export function InlineLoadingSpinner({
  size = 18,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      className="inline-spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}
