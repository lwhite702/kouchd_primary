import React from "react";

export type RelatableGraphicType =
  | "cushion"
  | "lamp"
  | "mug"
  | "archway"
  | "common-ground"
  | "foliage";

export type LegacyGraphicType =
  | "globe"
  | "squares"
  | "net"
  | "triangle"
  | "halo"
  | "inception";

export type GraphicType = RelatableGraphicType | LegacyGraphicType;
export type BrandShapeType = GraphicType;

export const RELATABLE_BRAND_SHAPES: RelatableGraphicType[] = [
  "cushion",
  "lamp",
  "mug",
  "archway",
  "common-ground",
  "foliage",
];

export const RELATABLE_SHAPE_METADATA: Record<
  RelatableGraphicType,
  { name: string; subtitle: string; description: string; metaphor: string }
> = {
  cushion: {
    name: "The Cushion",
    subtitle: "Open Seat & Comfort",
    description: "Plush, rounded living room seating and having a soft place to land.",
    metaphor: "Warm hospitality, rest, and private shared spaces where everyone feels comfortable.",
  },
  lamp: {
    name: "The Lamp",
    subtitle: "Evening Glow & Sanctuary",
    description: "Leaving the porch light on, quiet evening hours, and safe arrivals.",
    metaphor: "Calm sanctuary and peace of mind when returning home after a long day.",
  },
  mug: {
    name: "The Mug",
    subtitle: "Morning Cup & Connection",
    description: "Morning coffee over the counter and the shared rhythms of home life.",
    metaphor: "Casual, unhurried conversations that turn housemates into a household.",
  },
  archway: {
    name: "The Archway",
    subtitle: "Open Door & Hospitality",
    description: "Welcoming entryway, smooth check-ins, and trusted boundaries.",
    metaphor: "Seamless coming and going with clear house rules and mutual respect.",
  },
  "common-ground": {
    name: "Common Ground",
    subtitle: "Shared Space & Harmony",
    description: "Where host and guest align on agreements, contributions, and care.",
    metaphor: "Transparent coordination without tension, awkwardness, or debt dynamics.",
  },
  foliage: {
    name: "The Foliage",
    subtitle: "Houseplants & Lived-in Care",
    description: "A cared-for home with sunlight, leafy plants, and organic warmth.",
    metaphor: "Genuine lived-in spaces with vitality and domestic care, never sterile or staged.",
  },
};

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
    // -------------------------------------------------------------------------
    // RELATABLE HOME MOTIFS (Kouchd Signature)
    // -------------------------------------------------------------------------
    case "cushion":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill={fillColor}
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-label="The Cushion — Open Seat & Comfort"
        >
          <path
            d="M20 22 C38 25 62 25 80 22 C83 40 83 60 80 78 C62 75 38 75 20 78 C17 60 17 40 20 22 Z"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="50" r="5" fill={strokeColor} />
          <path
            d="M50 36 V43 M50 57 V64 M36 50 H43 M57 50 H64"
            stroke={strokeColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );

    case "lamp":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill={fillColor}
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-label="The Lamp — Evening Glow & Sanctuary"
        >
          <path
            d="M32 46 L39 24 C40 21 42 19 45 19 H55 C58 19 60 21 61 24 L68 46 C69 49 67 52 64 52 H36 C33 52 31 49 32 46 Z"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <line x1="50" y1="52" x2="50" y2="78" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
          <path d="M34 78 H66" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
          <path d="M21 34 C16 42 16 52 20 60" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="3 5" />
          <path d="M79 34 C84 42 84 52 80 60" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="3 5" />
        </svg>
      );

    case "mug":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill={fillColor}
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-label="The Mug — Morning Cup & Rituals"
        >
          <rect x="22" y="38" width="46" height="42" rx="14" stroke={strokeColor} strokeWidth="6" />
          <path
            d="M68 46 C77 46 84 52 84 60 C84 68 77 72 68 72"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="M36 26 C33 21 37 17 35 13" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
          <path d="M52 28 C49 23 53 19 51 14" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case "archway":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill={fillColor}
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-label="The Archway — Open Door & Hospitality"
        >
          <path
            d="M24 82 V42 C24 27.6 35.6 16 50 16 C64.4 16 76 27.6 76 42 V82"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M38 82 V46 C38 39.4 43.4 34 50 34 C56.6 34 62 39.4 62 46 V82"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line x1="16" y1="82" x2="84" y2="82" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
          <circle cx="56" cy="62" r="3" fill={strokeColor} />
        </svg>
      );

    case "common-ground":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill={fillColor}
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-label="Common Ground — Shared Space & Harmony"
        >
          <circle cx="40" cy="50" r="28" stroke={strokeColor} strokeWidth="6" />
          <circle cx="60" cy="50" r="28" stroke={strokeColor} strokeWidth="6" />
          <ellipse cx="50" cy="50" rx="10" ry="19" fill={strokeColor} opacity={0.25} />
          <circle cx="50" cy="50" r="6" fill={strokeColor} />
        </svg>
      );

    case "foliage":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill={fillColor}
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-label="The Foliage — Houseplants & Lived-in Care"
        >
          <path d="M34 62 L38 82 H62 L66 62 Z" stroke={strokeColor} strokeWidth="6" strokeLinejoin="round" />
          <line x1="50" y1="62" x2="50" y2="28" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
          <path d="M50 44 C40 38 28 42 26 50 C36 52 46 48 50 44 Z" stroke={strokeColor} strokeWidth="5" strokeLinejoin="round" />
          <path d="M50 36 C60 30 72 34 74 42 C64 44 54 40 50 36 Z" stroke={strokeColor} strokeWidth="5" strokeLinejoin="round" />
          <path d="M50 28 C45 20 50 14 50 14 C50 14 55 20 50 28 Z" stroke={strokeColor} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      );

    // -------------------------------------------------------------------------
    // LEGACY / GEOMETRIC FALLBACKS
    // -------------------------------------------------------------------------
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
          type={scene === "kitchen" ? "mug" : scene === "ledger" ? "common-ground" : scene === "agreement" ? "archway" : "lamp"}
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
