import React from "react";

interface CouchSymbolProps {
  size?: number;
  color?: string;
  accentColor?: string;
  className?: string;
}

export function CouchSymbol({
  size = 32,
  color = "var(--kouchd-forest, #184f3a)",
  accentColor = "var(--kouchd-lime, #dff25e)",
  className = "",
}: CouchSymbolProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
      aria-hidden="true"
    >
      <path
        d="M14.4 33.6V23.2C14.4 16 19.2 12.8 25.6 12.8H38.4C44.8 12.8 49.6 16 49.6 23.2V33.6"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M9.6 29.6C12.8 29.6 15.2 32 15.2 35.2V39.2H48.8V35.2C48.8 32 51.2 29.6 54.4 29.6C57.6 29.6 60 32 60 35.2V44.8C60 48.8 56.8 52 52.8 52H11.2C7.2 52 4 48.8 4 44.8V35.2C4 32 6.4 29.6 9.6 29.6Z"
        fill={color}
      />
      <path
        d="M13.6 51.2V56M50.4 51.2V56"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M22.4 28H28M36 28H41.6"
        stroke={accentColor}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface KouchdWordmarkProps {
  size?: "sm" | "md" | "lg";
  theme?: "forest" | "cream" | "monochrome";
  className?: string;
  showIcon?: boolean;
}

export function KouchdWordmark({
  size = "md",
  theme = "forest",
  className = "",
  showIcon = true,
}: KouchdWordmarkProps) {
  const isCream = theme === "cream";
  const isMono = theme === "monochrome";

  const textColor = isCream
    ? "var(--kouchd-paper, #f5f0e8)"
    : isMono
    ? "var(--kouchd-ink, #17251f)"
    : "var(--kouchd-forest, #184f3a)";

  const iconColor = textColor;
  const accentColor = isCream ? "var(--kouchd-lime, #dff25e)" : "var(--kouchd-lime, #dff25e)";

  const iconSizes = { sm: 20, md: 28, lg: 40 };
  const textStyles = {
    sm: { fontSize: "1.1rem", letterSpacing: "-0.03em" },
    md: { fontSize: "1.45rem", letterSpacing: "-0.04em" },
    lg: { fontSize: "2.2rem", letterSpacing: "-0.05em" },
  };

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "lg" ? "12px" : "8px",
        fontWeight: 800,
        color: textColor,
        textDecoration: "none",
        lineHeight: 1,
      }}
    >
      {showIcon && (
        <CouchSymbol
          size={iconSizes[size]}
          color={iconColor}
          accentColor={accentColor}
        />
      )}
      <span style={{ ...textStyles[size], fontFamily: "inherit" }}>kouchd</span>
    </span>
  );
}
