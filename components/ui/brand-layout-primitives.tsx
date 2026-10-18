import * as React from "react";

export type BrandSpacerSize = 4 | 8 | 12 | 16 | 24 | 32 | 40 | 48 | 56 | 64;

export interface BrandSpacerProps {
  size?: BrandSpacerSize;
  axis?: "vertical" | "horizontal";
  debug?: boolean;
  className?: string;
}

const spacerSizeMap: Record<BrandSpacerSize, string> = {
  4: "4px",
  8: "8px",
  12: "12px",
  16: "16px",
  24: "24px",
  32: "32px",
  40: "40px",
  48: "48px",
  56: "56px",
  64: "64px",
};

export const BrandSpacer: React.FC<BrandSpacerProps> = ({
  size = 16,
  axis = "vertical",
  debug = false,
  className = "",
}) => {
  const dimension = spacerSizeMap[size];
  const isVertical = axis === "vertical";

  return (
    <div
      role="separator"
      aria-hidden="true"
      style={{
        width: isVertical ? "100%" : dimension,
        height: isVertical ? dimension : "100%",
        minWidth: isVertical ? undefined : dimension,
        minHeight: isVertical ? dimension : undefined,
      }}
      className={`shrink-0 ${
        debug
          ? "bg-rose-500/20 border border-dashed border-rose-500/40 relative flex items-center justify-center text-[9px] font-mono text-rose-700 select-none"
          : ""
      } ${className}`}
    >
      {debug ? <span>{size}px</span> : null}
    </div>
  );
};

export interface BrandDividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
}

export const BrandDivider: React.FC<BrandDividerProps> = ({
  orientation = "horizontal",
  label,
  className = "",
  ...props
}) => {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`w-px h-auto self-stretch bg-[var(--kouchd-neutral-20)] ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div className={`flex items-center gap-4 my-4 w-full ${className}`}>
        <div className="flex-1 h-px bg-[var(--kouchd-neutral-20)]" />
        <span className="text-xs font-semibold tracking-wider uppercase text-[var(--kouchd-neutral-60)]">
          {label}
        </span>
        <div className="flex-1 h-px bg-[var(--kouchd-neutral-20)]" />
      </div>
    );
  }

  return (
    <hr
      className={`border-0 h-px bg-[var(--kouchd-neutral-20)] w-full my-4 ${className}`}
      {...props}
    />
  );
};

export interface BrandGridContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  showOverlay?: boolean;
}

export const BrandGridContainer: React.FC<BrandGridContainerProps> = ({
  showOverlay = false,
  className = "",
  children,
  ...props
}) => {
  return (
    <div className={`relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`} {...props}>
      {showOverlay ? (
        <div className="pointer-events-none absolute inset-0 px-4 sm:px-6 lg:px-8 grid grid-cols-4 lg:grid-cols-12 gap-4 lg:gap-8 z-50">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`h-full bg-red-400/10 border-x border-red-400/20 ${
                i >= 4 ? "hidden lg:block" : ""
              }`}
            />
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
};

export interface BrandCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "paper" | "white" | "dark" | "lime" | "sage";
  elevation?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
}

const cardVariantStyles: Record<NonNullable<BrandCardProps["variant"]>, string> = {
  paper: "bg-[var(--kouchd-neutral-0)] border-[var(--kouchd-neutral-20)] text-[var(--kouchd-forest-90)]",
  white: "bg-[#ffffff] border-[var(--kouchd-neutral-20)] text-[var(--kouchd-forest-90)]",
  dark: "bg-[var(--kouchd-forest-90)] border-[var(--kouchd-forest-80)] text-[#ffffff]",
  lime: "bg-[var(--kouchd-lime-40)] border-[var(--kouchd-lime-60)] text-[var(--kouchd-forest-90)]",
  sage: "bg-[var(--kouchd-sage-10)] border-[var(--kouchd-sage-30)] text-[var(--kouchd-forest-90)]",
};

const cardElevationStyles: Record<NonNullable<BrandCardProps["elevation"]>, string> = {
  none: "",
  xs: "shadow-[var(--kouchd-shadow-xs)]",
  sm: "shadow-[var(--kouchd-shadow-sm)]",
  md: "shadow-[var(--kouchd-shadow-md)]",
  lg: "shadow-[var(--kouchd-shadow-lg)]",
  xl: "shadow-[var(--kouchd-shadow-xl)]",
};

export const BrandCard: React.FC<BrandCardProps> = ({
  variant = "paper",
  elevation = "none",
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl lg:rounded-3xl border transition-all duration-200 p-6 lg:p-8 ${cardVariantStyles[variant]} ${cardElevationStyles[elevation]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
