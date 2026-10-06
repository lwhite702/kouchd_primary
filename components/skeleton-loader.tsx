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

      <main style={{ padding: "clamp(20px, 4vw, 36px) clamp(14px, 3.5vw, 24px) 120px", maxWidth: 960, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
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
            borderRadius: "clamp(20px, 4vw, 28px)",
            padding: "clamp(20px, 4vw, 30px)",
            color: "white",
            marginBottom: 20,
            opacity: 0.95,
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "min(100%, 200px)" }}>
              <SkeletonBox width={80} height={12} borderRadius={4} style={{ background: "rgba(255,255,255,0.2)", marginBottom: 10 }} />
              <SkeletonBox width="min(220px, 90%)" height={28} borderRadius={6} style={{ background: "rgba(255,255,255,0.3)" }} />
            </div>
            <SkeletonBox width={64} height={32} borderRadius={99} style={{ background: "rgba(223,242,94,0.4)", flexShrink: 0 }} />
          </div>
          <SkeletonBox width="min(160px, 70%)" height={14} borderRadius={4} style={{ background: "rgba(255,255,255,0.2)", marginBottom: 24 }} />
          <SkeletonBox width="100%" height={10} borderRadius={99} style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* 3 Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16, marginBottom: 30 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: i === 1 ? "var(--kouchd-sky, #c9e7f0)" : "var(--kouchd-surface, #fffdf8)",
                border: "1px solid var(--kouchd-line, #ded8ce)",
                borderRadius: 24,
                padding: "clamp(18px, 4vw, 24px)",
                boxSizing: "border-box",
              }}
            >
              <SkeletonBox width={70} height={12} borderRadius={4} style={{ marginBottom: 12, opacity: 0.6 }} />
              <SkeletonBox width={120} height={36} borderRadius={8} style={{ marginBottom: 10 }} />
              <SkeletonBox width={160} height={14} borderRadius={4} style={{ opacity: 0.7 }} />
            </div>
          ))}
        </div>

        {/* List Section Skeleton */}
        <div style={{ border: "1px solid var(--kouchd-line, #ded8ce)", borderRadius: 24, background: "white", padding: "clamp(18px, 4vw, 24px)", boxSizing: "border-box" }}>
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
                  boxSizing: "border-box",
                }}
              >
                <SkeletonBox width={40} height={40} borderRadius={12} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SkeletonBox width="60%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                  <SkeletonBox width="40%" height={12} borderRadius={4} style={{ opacity: 0.6 }} />
                </div>
                <SkeletonBox width={50} height={18} borderRadius={6} style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export function InviteSkeleton() {
  return (
    <div
      role="status"
      aria-label="Checking your invitation"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: 440,
        margin: "0 auto",
        padding: "clamp(24px, 5vw, 36px) clamp(20px, 4vw, 32px)",
        borderRadius: 24,
        background: "var(--kouchd-surface, #fffdf8)",
        border: "1px solid var(--kouchd-line, #ded8ce)",
        boxShadow: "0 18px 45px rgba(23, 37, 31, 0.08)",
        boxSizing: "border-box",
        animation: "fadeInQuick 240ms ease-out both",
      }}
    >
      <div className="skeleton-status-pill" style={{ marginBottom: 20 }}>
        <span className="spinner-dots" />
        <span>Checking your invitation...</span>
      </div>
      <SkeletonBox width={120} height={14} borderRadius={4} style={{ marginBottom: 12, opacity: 0.6 }} />
      <SkeletonBox width="80%" height={28} borderRadius={8} style={{ marginBottom: 14 }} />
      <SkeletonBox width="95%" height={16} borderRadius={4} style={{ marginBottom: 8, opacity: 0.7 }} />
      <SkeletonBox width="70%" height={16} borderRadius={4} style={{ marginBottom: 24, opacity: 0.7 }} />
      <SkeletonBox width={180} height={44} borderRadius={16} />
    </div>
  );
}

export function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading form"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        width: "100%",
        boxSizing: "border-box",
        animation: "fadeInQuick 240ms ease-out both",
      }}
    >
      <div className="skeleton-status-pill" style={{ alignSelf: "flex-start", marginBottom: 4 }}>
        <span className="spinner-dots" />
        <span>Preparing your account...</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SkeletonBox width={100 + (i % 2) * 30} height={14} borderRadius={4} style={{ opacity: 0.7 }} />
          <SkeletonBox width="100%" height={46} borderRadius={12} />
        </div>
      ))}
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

export function CardSkeleton({
  lines = 2,
  hasHeader = true,
  className = "",
  style = {},
}: {
  lines?: number;
  hasHeader?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`card-skeleton-block ${className}`}
      style={{
        background: "var(--kouchd-surface, #fffdf8)",
        border: "1px solid var(--kouchd-line, #ded8ce)",
        borderRadius: 20,
        padding: "20px 24px",
        boxSizing: "border-box",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
      role="status"
      aria-label="Loading card content"
    >
      {hasHeader && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <SkeletonBox width={140} height={20} borderRadius={6} />
          <SkeletonBox width={50} height={16} borderRadius={99} />
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={i === lines - 1 && lines > 1 ? "65%" : "100%"}
          height={14}
          borderRadius={4}
          style={{ opacity: 0.7 }}
        />
      ))}
    </div>
  );
}

export function LedgerSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="ledger-skeleton-block"
      style={{
        background: "var(--kouchd-surface, #fffdf8)",
        border: "1px solid var(--kouchd-line, #ded8ce)",
        borderRadius: 20,
        padding: "20px 24px",
        width: "100%",
        boxSizing: "border-box",
      }}
      role="status"
      aria-label="Loading ledger records"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <SkeletonBox width={160} height={22} borderRadius={6} />
        <SkeletonBox width={80} height={28} borderRadius={12} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(222, 216, 206, 0.15)",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <SkeletonBox width={32} height={32} borderRadius={8} />
              <div>
                <SkeletonBox width={110} height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonBox width={70} height={11} borderRadius={4} style={{ opacity: 0.6 }} />
              </div>
            </div>
            <SkeletonBox width={60} height={18} borderRadius={6} />
          </div>
        ))}
      </div>
    </div>
  );
}
