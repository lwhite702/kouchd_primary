"use client";

import React, { useId, useState } from "react";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delayMs?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delayMs = 150,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const id = useId();

  const show = () => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
    setTimeoutId(timer);
  };

  const hide = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  return (
    <span
      className={`kouchd-tooltip-wrapper ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={-1}
      style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}
    >
      <span aria-describedby={isVisible ? id : undefined} style={{ display: "inline-flex", width: "100%", height: "100%" }}>
        {children}
      </span>
      {isVisible && content && (
        <span
          id={id}
          role="tooltip"
          className={`kouchd-tooltip-bubble position-${position}`}
          style={{
            position: "absolute",
            zIndex: 100,
            whiteSpace: "normal",
            pointerEvents: "none",
            animation: "kouchdTooltipFade 140ms ease-out both",
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
