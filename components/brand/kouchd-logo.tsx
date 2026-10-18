import React from "react";

export interface CouchSymbolProps {
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

export interface KouchdWordmarkProps {
  size?: "sm" | "md" | "lg";
  theme?: "forest" | "cream" | "monochrome" | "lime" | "white";
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
  const isLime = theme === "lime";
  const isWhite = theme === "white";

  const textColor = isCream
    ? "var(--kouchd-paper, #f5f0e8)"
    : isMono
    ? "var(--kouchd-ink, #17251f)"
    : isLime
    ? "var(--kouchd-lime, #dff25e)"
    : isWhite
    ? "#ffffff"
    : "var(--kouchd-forest, #184f3a)";

  const iconColor = textColor;
  const accentColor = isLime
    ? "var(--kouchd-forest, #184f3a)"
    : "var(--kouchd-lime, #dff25e)";

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
      <span style={{ ...textStyles[size], fontFamily: "var(--font-family-title, inherit)", color: textColor }}>kouchd</span>
    </span>
  );
}

export type KouchdLogoVariant = "horizontal" | "vertical" | "logomark" | "wordmark" | "app-icon" | "symbol";
export type KouchdLogoTheme = "forest" | "lime" | "cream" | "monochrome" | "white" | "dark";

export interface KouchdLogoLockupProps {
  variant?: KouchdLogoVariant;
  orientation?: KouchdLogoVariant;
  theme?: KouchdLogoTheme;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function KouchdLogoLockup({
  variant,
  orientation = "horizontal",
  theme = "forest",
  size = "md",
  className = "",
}: KouchdLogoLockupProps) {
  const actualOrientation = variant || orientation;
  const isDark = theme === "dark" || theme === "monochrome";
  const isCream = theme === "cream";
  const isLime = theme === "lime";
  const isWhite = theme === "white";

  const textColor = isCream
    ? "#f5f0e8"
    : isDark
    ? "#17251f"
    : isLime
    ? "#dff25e"
    : isWhite
    ? "#ffffff"
    : "#184f3a";

  const iconColor = textColor;
  const accentColor = isLime ? "#184f3a" : "#dff25e";

  const sizeConfigs = {
    xs: { symbolSize: 18, fontSize: "0.95rem", gap: "6px", iconPad: 6 },
    sm: { symbolSize: 24, fontSize: "1.2rem", gap: "8px", iconPad: 8 },
    md: { symbolSize: 36, fontSize: "1.75rem", gap: "12px", iconPad: 12 },
    lg: { symbolSize: 52, fontSize: "2.5rem", gap: "16px", iconPad: 16 },
    xl: { symbolSize: 72, fontSize: "3.5rem", gap: "24px", iconPad: 20 },
  };

  const currentSize = sizeConfigs[size];

  if (actualOrientation === "app-icon") {
    return (
      <div
        className={className}
        style={{
          width: currentSize.symbolSize * 1.8,
          height: currentSize.symbolSize * 1.8,
          borderRadius: `${currentSize.symbolSize * 0.45}px`,
          background: theme === "lime" ? "#dff25e" : "#184f3a",
          display: "inline-grid",
          placeItems: "center",
          boxShadow: "0 8px 24px rgba(23, 37, 31, 0.16)",
        }}
      >
        <CouchSymbol
          size={currentSize.symbolSize}
          color={theme === "lime" ? "#184f3a" : "#ffffff"}
          accentColor={theme === "lime" ? "#184f3a" : "#dff25e"}
        />
      </div>
    );
  }

  if (actualOrientation === "logomark" || actualOrientation === "symbol") {
    return (
      <div className={className} style={{ display: "inline-flex" }}>
        <CouchSymbol
          size={currentSize.symbolSize}
          color={iconColor}
          accentColor={accentColor}
        />
      </div>
    );
  }

  if (actualOrientation === "wordmark") {
    return (
      <span
        className={className}
        style={{
          fontFamily: "var(--font-family-title, inherit)",
          fontWeight: 800,
          fontSize: currentSize.fontSize,
          letterSpacing: "-0.04em",
          color: textColor,
          lineHeight: 1,
        }}
      >
        kouchd
      </span>
    );
  }

  if (actualOrientation === "vertical") {
    return (
      <div
        className={className}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: currentSize.gap,
          textAlign: "center",
        }}
      >
        <CouchSymbol
          size={currentSize.symbolSize}
          color={iconColor}
          accentColor={accentColor}
        />
        <span
          style={{
            fontFamily: "var(--font-family-title, inherit)",
            fontWeight: 800,
            fontSize: currentSize.fontSize,
            letterSpacing: "-0.04em",
            color: textColor,
            lineHeight: 1,
          }}
        >
          kouchd
        </span>
      </div>
    );
  }

  // Horizontal (Default)
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: currentSize.gap,
        lineHeight: 1,
      }}
    >
      <CouchSymbol
        size={currentSize.symbolSize}
        color={iconColor}
        accentColor={accentColor}
      />
      <span
        style={{
          fontFamily: "var(--font-family-title, inherit)",
          fontWeight: 800,
          fontSize: currentSize.fontSize,
          letterSpacing: "-0.04em",
          color: textColor,
          lineHeight: 1,
        }}
      >
        kouchd
      </span>
    </div>
  );
}

/**
 * Visual clearspace blueprint component (X/2 construction diagram)
 */
export function KouchdLogoClearspace({
  variant = "horizontal",
}: {
  variant?: "horizontal" | "logomark";
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        border: "1.5px dashed #2b6b50",
        borderRadius: "16px",
        padding: "36px",
        background: "rgba(24, 79, 58, 0.04)",
      }}
    >
      {/* Clearspace boundary labels */}
      <span
        style={{
          position: "absolute",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "11px",
          fontWeight: 800,
          color: "#2b6b50",
          letterSpacing: "0.06em",
        }}
      >
        CLEARSPACE = X / 2
      </span>
      <span
        style={{
          position: "absolute",
          left: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "11px",
          fontWeight: 800,
          color: "#2b6b50",
        }}
      >
        X/2
      </span>
      <span
        style={{
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "11px",
          fontWeight: 800,
          color: "#2b6b50",
        }}
      >
        X/2
      </span>
      <span
        style={{
          position: "absolute",
          bottom: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "11px",
          fontWeight: 800,
          color: "#2b6b50",
        }}
      >
        X/2
      </span>

      <div style={{ background: "#ffffff", padding: "20px 28px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {variant === "horizontal" ? (
          <KouchdLogoLockup orientation="horizontal" size="md" />
        ) : (
          <KouchdLogoLockup orientation="logomark" size="lg" />
        )}
      </div>
    </div>
  );
}

/**
 * Options for rendering SVG logo strings
 */
export interface RenderSvgOptions {
  variant?: KouchdLogoVariant;
  theme?: KouchdLogoTheme;
}

/**
 * Returns raw standalone SVG string for client-side download in Brand Asset Repository
 */
export function renderKouchdLogoSvgString(
  optionsOrVariant: RenderSvgOptions | KouchdLogoVariant = "horizontal",
  themeArg: KouchdLogoTheme = "forest"
): string {
  let variant: KouchdLogoVariant = "horizontal";
  let theme: KouchdLogoTheme = themeArg;

  if (typeof optionsOrVariant === "object" && optionsOrVariant !== null) {
    variant = optionsOrVariant.variant ?? "horizontal";
    theme = optionsOrVariant.theme ?? "forest";
  } else if (typeof optionsOrVariant === "string") {
    variant = optionsOrVariant;
  }

  const primaryColor =
    theme === "cream"
      ? "#f5f0e8"
      : theme === "lime"
      ? "#dff25e"
      : theme === "monochrome" || theme === "dark"
      ? "#17251f"
      : theme === "white"
      ? "#ffffff"
      : "#184f3a";

  const accentColor = theme === "lime" ? "#184f3a" : "#dff25e";

  if (variant === "symbol" || variant === "logomark") {
    return `<svg width="128" height="128" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M14.4 33.6V23.2C14.4 16 19.2 12.8 25.6 12.8H38.4C44.8 12.8 49.6 16 49.6 23.2V33.6" stroke="${primaryColor}" stroke-width="7" stroke-linecap="round"/>
  <path d="M9.6 29.6C12.8 29.6 15.2 32 15.2 35.2V39.2H48.8V35.2C48.8 32 51.2 29.6 54.4 29.6C57.6 29.6 60 32 60 35.2V44.8C60 48.8 56.8 52 52.8 52H11.2C7.2 52 4 48.8 4 44.8V35.2C4 32 6.4 29.6 9.6 29.6Z" fill="${primaryColor}"/>
  <path d="M13.6 51.2V56M50.4 51.2V56" stroke="${primaryColor}" stroke-width="6" stroke-linecap="round"/>
  <path d="M22.4 28H28M36 28H41.6" stroke="${accentColor}" stroke-width="5" stroke-linecap="round"/>
</svg>`;
  }

  if (variant === "app-icon") {
    const bg = theme === "lime" ? "#dff25e" : "#184f3a";
    const iconC = theme === "lime" ? "#184f3a" : "#ffffff";
    const accC = theme === "lime" ? "#184f3a" : "#dff25e";
    return `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="${bg}"/>
  <g transform="translate(96, 96) scale(5)">
    <path d="M14.4 33.6V23.2C14.4 16 19.2 12.8 25.6 12.8H38.4C44.8 12.8 49.6 16 49.6 23.2V33.6" stroke="${iconC}" stroke-width="7" stroke-linecap="round"/>
    <path d="M9.6 29.6C12.8 29.6 15.2 32 15.2 35.2V39.2H48.8V35.2C48.8 32 51.2 29.6 54.4 29.6C57.6 29.6 60 32 60 35.2V44.8C60 48.8 56.8 52 52.8 52H11.2C7.2 52 4 48.8 4 44.8V35.2C4 32 6.4 29.6 9.6 29.6Z" fill="${iconC}"/>
    <path d="M13.6 51.2V56M50.4 51.2V56" stroke="${iconC}" stroke-width="6" stroke-linecap="round"/>
    <path d="M22.4 28H28M36 28H41.6" stroke="${accC}" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`;
  }

  if (variant === "vertical") {
    return `<svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(88, 20)">
    <path d="M14.4 33.6V23.2C14.4 16 19.2 12.8 25.6 12.8H38.4C44.8 12.8 49.6 16 49.6 23.2V33.6" stroke="${primaryColor}" stroke-width="7" stroke-linecap="round"/>
    <path d="M9.6 29.6C12.8 29.6 15.2 32 15.2 35.2V39.2H48.8V35.2C48.8 32 51.2 29.6 54.4 29.6C57.6 29.6 60 32 60 35.2V44.8C60 48.8 56.8 52 52.8 52H11.2C7.2 52 4 48.8 4 44.8V35.2C4 32 6.4 29.6 9.6 29.6Z" fill="${primaryColor}"/>
    <path d="M13.6 51.2V56M50.4 51.2V56" stroke="${primaryColor}" stroke-width="6" stroke-linecap="round"/>
    <path d="M22.4 28H28M36 28H41.6" stroke="${accentColor}" stroke-width="5" stroke-linecap="round"/>
  </g>
  <text x="120" y="140" text-anchor="middle" fill="${primaryColor}" font-family="Manrope, system-ui, sans-serif" font-weight="800" font-size="34" letter-spacing="-1.2">kouchd</text>
</svg>`;
  }

  // Horizontal Wordmark + Symbol
  return `<svg width="320" height="80" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(10, 8)">
    <path d="M14.4 33.6V23.2C14.4 16 19.2 12.8 25.6 12.8H38.4C44.8 12.8 49.6 16 49.6 23.2V33.6" stroke="${primaryColor}" stroke-width="7" stroke-linecap="round"/>
    <path d="M9.6 29.6C12.8 29.6 15.2 32 15.2 35.2V39.2H48.8V35.2C48.8 32 51.2 29.6 54.4 29.6C57.6 29.6 60 32 60 35.2V44.8C60 48.8 56.8 52 52.8 52H11.2C7.2 52 4 48.8 4 44.8V35.2C4 32 6.4 29.6 9.6 29.6Z" fill="${primaryColor}"/>
    <path d="M13.6 51.2V56M50.4 51.2V56" stroke="${primaryColor}" stroke-width="6" stroke-linecap="round"/>
    <path d="M22.4 28H28M36 28H41.6" stroke="${accentColor}" stroke-width="5" stroke-linecap="round"/>
  </g>
  <text x="85" y="52" fill="${primaryColor}" font-family="Manrope, system-ui, sans-serif" font-weight="800" font-size="38" letter-spacing="-1.5">kouchd</text>
</svg>`;
}
