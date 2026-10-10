"use client";

import React from "react";
import { useGuide } from "@knocklabs/react";
import { Sparkles, X, ArrowRight } from "lucide-react";

interface GuideBannerProps {
  guideKey?: string;
  fallbackTitle?: string;
  fallbackBody?: string;
  className?: string;
}

/**
 * Renders an in-app notice or announcement banner powered by Knock Guides.
 * If Knock Guides is configured and a guide matches, renders live content and handles engagement.
 */
export function KouchdGuideBanner({
  guideKey = "household-notice-banner",
  fallbackTitle,
  fallbackBody,
  className,
}: GuideBannerProps) {
  let guideContext: ReturnType<typeof useGuide> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    guideContext = useGuide({ key: guideKey });
  } catch {
    // Not within a KnockGuideProvider or Knock not configured
  }

  const guide = guideContext?.guide;
  const step = guideContext?.step;
  const client = guideContext?.client;

  const content = (step?.content as {
    title?: string;
    body?: string;
    primary_button?: { text: string; action: string };
    dismissible?: boolean;
  }) ?? {
    title: fallbackTitle,
    body: fallbackBody,
  };

  if (!guide && !fallbackTitle) {
    return null;
  }

  const handleDismiss = async () => {
    if (guide && step && client) {
      await client.markAsArchived(guide, step);
    }
  };

  const handlePrimaryClick = async () => {
    if (guide && step && client) {
      await client.markAsInteracted(guide, step);
    }
    if (content.primary_button?.action) {
      window.open(content.primary_button.action, "_self");
    }
  };

  return (
    <div
      className={className ?? "agreement-callout"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "16px",
        background: "#e9f3ec",
        border: "1px solid #b8d2c1",
        borderRadius: "20px",
        padding: "16px 20px",
      }}
      role="region"
      aria-label="Household Notice"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "12px",
            background: "#184f3a",
            color: "#dff25e",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={18} />
        </div>
        <div>
          {content.title && (
            <strong style={{ display: "block", fontSize: "0.95rem", color: "#17251f" }}>
              {content.title}
            </strong>
          )}
          {content.body && (
            <span style={{ fontSize: "0.85rem", color: "#59675f", lineHeight: 1.4 }}>
              {content.body}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {content.primary_button && (
          <button
            type="button"
            className="button primary compact"
            onClick={handlePrimaryClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "12px",
              background: "#184f3a",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.84rem",
              border: 0,
              cursor: "pointer",
            }}
          >
            <span>{content.primary_button.text}</span>
            <ArrowRight size={14} />
          </button>
        )}
        {(content.dismissible ?? true) && (
          <button
            type="button"
            className="icon-button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "transparent",
              border: 0,
              color: "#59675f",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

interface GuideModalProps {
  guideKey?: string;
  fallbackTitle?: string;
  fallbackBody?: string;
}

/**
 * Renders an in-app modal / popup powered by Knock Guides (e.g. Welcome Modal, Feature Announcement).
 */
export function KouchdGuideModal({
  guideKey = "welcome-modal",
  fallbackTitle,
  fallbackBody,
}: GuideModalProps) {
  let guideContext: ReturnType<typeof useGuide> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    guideContext = useGuide({ key: guideKey });
  } catch {
    // Not within provider
  }

  const guide = guideContext?.guide;
  const step = guideContext?.step;
  const client = guideContext?.client;

  if (!guide && !fallbackTitle) return null;

  const content = (step?.content as {
    title?: string;
    body?: string;
    primary_button?: { text: string; action: string };
    dismissible?: boolean;
  }) ?? {
    title: fallbackTitle,
    body: fallbackBody,
  };

  const handleClose = async () => {
    if (guide && step && client) {
      await client.markAsArchived(guide, step);
    }
  };

  const handleAction = async () => {
    if (guide && step && client) {
      await client.markAsInteracted(guide, step);
    }
    if (content.primary_button?.action) {
      window.open(content.primary_button.action, "_self");
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(23, 37, 31, 0.45)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: "16px",
        zIndex: 100,
      }}
    >
      <div
        className="modal-card"
        style={{
          background: "#fffdf8",
          border: "1px solid #ded8ce",
          borderRadius: "28px",
          padding: "36px",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 24px 70px rgba(23, 37, 31, 0.18)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "#59675f",
          }}
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "16px",
            background: "#e5edde",
            color: "#184f3a",
            display: "grid",
            placeItems: "center",
            marginBottom: "20px",
          }}
        >
          <Sparkles size={24} />
        </div>

        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#17251f", margin: "0 0 10px 0" }}>
          {content.title}
        </h2>
        <p style={{ color: "#59675f", fontSize: "0.95rem", lineHeight: 1.55, margin: "0 0 28px 0" }}>
          {content.body}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          {(content.dismissible ?? true) && (
            <button
              type="button"
              className="button ghost"
              onClick={handleClose}
              style={{
                border: "1px solid #ded8ce",
                borderRadius: "14px",
                background: "transparent",
                color: "#17251f",
                padding: "12px 20px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          )}
          {content.primary_button && (
            <button
              type="button"
              className="button primary"
              onClick={handleAction}
              style={{
                border: 0,
                borderRadius: "14px",
                background: "#184f3a",
                color: "#fff",
                padding: "12px 24px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {content.primary_button.text}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
