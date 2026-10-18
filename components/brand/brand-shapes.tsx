import React from "react";

export type GraphicType = "globe" | "squares" | "net" | "triangle" | "halo" | "inception";
export type BrandShapeType = GraphicType;

export interface BrandGraphicProps {
  type: GraphicType;
  size?: number;
  theme?: "forest" | "lime" | "cream" | "monochrome" | "outline";
  color?: string;
  className?: string;
}

export function BrandGraphic({
  type,
  size = 64,
  theme = "forest",
  color,
  className = "",
}: BrandGraphicProps) {
  const strokeColor =
    color ||
    (theme === "lime"
      ? "#dff25e"
      : theme === "cream"
      ? "#f5f0e8"
      : theme === "monochrome"
      ? "#17251f"
      : theme === "outline"
      ? "currentColor"
      : "#184f3a");

  const fillColor = theme === "lime" ? "#184f3a" : "none";

  switch (type) {
    case "globe":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill={fillColor} xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          <circle cx="50" cy="50" r="44" stroke={strokeColor} strokeWidth="6" />
          <ellipse cx="50" cy="50" rx="44" ry="18" stroke={strokeColor} strokeWidth="5" />
          <line x1="50" y1="6" x2="50" y2="94" stroke={strokeColor} strokeWidth="5" />
          <line x1="6" y1="50" x2="94" y2="50" stroke={strokeColor} strokeWidth="5" />
        </svg>
      );
    case "squares":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill={fillColor} xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          <rect x="12" y="12" width="76" height="76" rx="16" stroke={strokeColor} strokeWidth="6" />
          <rect x="28" y="28" width="44" height="44" rx="8" stroke={strokeColor} strokeWidth="5" />
          <circle cx="50" cy="50" r="6" fill={strokeColor} />
        </svg>
      );
    case "net":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill={fillColor} xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          <circle cx="20" cy="20" r="8" fill={strokeColor} />
          <circle cx="80" cy="20" r="8" fill={strokeColor} />
          <circle cx="50" cy="50" r="8" fill={strokeColor} />
          <circle cx="20" cy="80" r="8" fill={strokeColor} />
          <circle cx="80" cy="80" r="8" fill={strokeColor} />
          <line x1="20" y1="20" x2="80" y2="20" stroke={strokeColor} strokeWidth="4" />
          <line x1="20" y1="20" x2="50" y2="50" stroke={strokeColor} strokeWidth="4" />
          <line x1="80" y1="20" x2="50" y2="50" stroke={strokeColor} strokeWidth="4" />
          <line x1="20" y1="80" x2="50" y2="50" stroke={strokeColor} strokeWidth="4" />
          <line x1="80" y1="80" x2="50" y2="50" stroke={strokeColor} strokeWidth="4" />
          <line x1="20" y1="80" x2="80" y2="80" stroke={strokeColor} strokeWidth="4" />
        </svg>
      );
    case "triangle":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill={fillColor} xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          <path d="M50 12L88 84H12L50 12Z" stroke={strokeColor} strokeWidth="6" strokeLinejoin="round" />
          <circle cx="50" cy="56" r="14" stroke={strokeColor} strokeWidth="5" />
        </svg>
      );
    case "halo":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill={fillColor} xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          <circle cx="50" cy="50" r="42" stroke={strokeColor} strokeWidth="6" strokeDasharray="8 6" />
          <circle cx="50" cy="50" r="26" stroke={strokeColor} strokeWidth="6" />
        </svg>
      );
    case "inception":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill={fillColor} xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
          <rect x="14" y="14" width="72" height="72" rx="36" stroke={strokeColor} strokeWidth="5" />
          <rect x="26" y="26" width="48" height="48" rx="24" stroke={strokeColor} strokeWidth="5" />
          <rect x="38" y="38" width="24" height="24" rx="12" stroke={strokeColor} strokeWidth="5" />
        </svg>
      );
  }
}

export interface BrandImageMaskProps {
  orientation?: "square" | "portrait" | "landscape";
  roundCorner?: "top-left" | "top-right";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function BrandImageMask({
  orientation = "square",
  roundCorner = "top-right",
  children,
  className = "",
  style = {},
}: BrandImageMaskProps) {
  // Asymmetric rounded corner radius matching Figma: 1 corner heavily rounded (e.g. 80px or 45%), other 3 standard (16px)
  const isTopRight = roundCorner === "top-right";

  const borderRadius = isTopRight
    ? "16px 90px 16px 16px"
    : "90px 16px 16px 16px";

  const aspectRatios = {
    square: "1 / 1",
    portrait: "3 / 4",
    landscape: "16 / 10",
  };

  return (
    <div
      className={className}
      style={{
        borderRadius,
        overflow: "hidden",
        aspectRatio: aspectRatios[orientation],
        position: "relative",
        background: "var(--kouchd-forest-5, #dbece4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function BrandIllustrationCard({
  scene,
  title,
  description,
}: {
  scene: "kitchen" | "ledger" | "agreement" | "checkin";
  title: string;
  description: string;
}) {
  const sceneColors = {
    kitchen: { bg: "#e9f3ec", accent: "#184f3a" },
    ledger: { bg: "#fff7e6", accent: "#ed755c" },
    agreement: { bg: "#e5edde", accent: "#296d55" },
    checkin: { bg: "#eef7fa", accent: "#297285" },
  };

  const currentTheme = sceneColors[scene];

  return (
    <div
      style={{
        borderRadius: "20px",
        background: currentTheme.bg,
        border: "1px solid rgba(23, 37, 31, 0.08)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "180px",
          borderRadius: "14px",
          background: "#ffffff",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        <BrandGraphic
          type={scene === "kitchen" ? "globe" : scene === "ledger" ? "squares" : scene === "agreement" ? "triangle" : "halo"}
          size={84}
          theme="forest"
        />
      </div>
      <div>
        <h4 style={{ margin: "0 0 6px", fontSize: "1.1rem", fontWeight: 800, color: "var(--kouchd-ink, #17251f)" }}>
          {title}
        </h4>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--kouchd-muted, #59675f)", lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export const BrandShape = BrandGraphic;

