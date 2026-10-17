import * as React from "react";

export type BrandTagSize = "xs" | "sm" | "md" | "lg" | "xl";
export type BrandTagVariant =
  | "primary"
  | "secondary"
  | "light"
  | "dark"
  | "outline"
  | "info"
  | "success"
  | "alert"
  | "error";

export interface BrandTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: BrandTagSize;
  variant?: BrandTagVariant;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  emoji?: string;
  onDismiss?: () => void;
  interactive?: boolean;
}

const sizeClasses: Record<BrandTagSize, { container: string; text: string; icon: string }> = {
  xs: {
    container: "px-2 py-0.5 gap-1 text-[11px] font-medium leading-none tracking-wide",
    text: "text-[11px]",
    icon: "w-3 h-3",
  },
  sm: {
    container: "px-2.5 py-1 gap-1.5 text-[13px] font-medium leading-tight",
    text: "text-[13px]",
    icon: "w-3.5 h-3.5",
  },
  md: {
    container: "px-3.5 py-1.5 gap-2 text-[15px] font-semibold leading-normal",
    text: "text-[15px]",
    icon: "w-4 h-4",
  },
  lg: {
    container: "px-4 py-2 gap-2.5 text-[18px] font-semibold leading-normal",
    text: "text-[18px]",
    icon: "w-5 h-5",
  },
  xl: {
    container: "px-5 py-2.5 gap-3 text-[22px] font-bold leading-normal",
    text: "text-[22px]",
    icon: "w-6 h-6",
  },
};

const variantClasses: Record<BrandTagVariant, string> = {
  primary:
    "bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)] border border-[var(--kouchd-lime-60)] shadow-sm",
  secondary:
    "bg-[var(--kouchd-sage-20)] text-[var(--kouchd-forest-90)] border border-[var(--kouchd-sage-40)]",
  light:
    "bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-forest-80)] border border-[var(--kouchd-neutral-20)]",
  dark:
    "bg-[var(--kouchd-forest-90)] text-[#ffffff] border border-[var(--kouchd-forest-80)] shadow-sm",
  outline:
    "bg-transparent text-[var(--kouchd-forest-80)] border border-[var(--kouchd-neutral-30)] hover:border-[var(--kouchd-forest-50)]",
  info:
    "bg-[var(--kouchd-info-10)] text-[var(--kouchd-info-80)] border border-[var(--kouchd-info-30)]",
  success:
    "bg-[var(--kouchd-success-10)] text-[var(--kouchd-success-80)] border border-[var(--kouchd-success-30)]",
  alert:
    "bg-[var(--kouchd-alert-10)] text-[var(--kouchd-alert-80)] border border-[var(--kouchd-alert-30)]",
  error:
    "bg-[var(--kouchd-error-10)] text-[var(--kouchd-error-80)] border border-[var(--kouchd-error-30)]",
};

export const BrandTag = React.forwardRef<HTMLSpanElement, BrandTagProps>(
  (
    {
      size = "md",
      variant = "secondary",
      iconLeft,
      iconRight,
      emoji,
      onDismiss,
      interactive = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const sizeConfig = sizeClasses[size];
    const variantStyle = variantClasses[variant];

    return (
      <span
        ref={ref}
        className={`inline-flex items-center justify-center font-sans rounded-full transition-all duration-150 select-none ${sizeConfig.container} ${variantStyle} ${
          interactive ? "cursor-pointer hover:opacity-90 active:scale-[0.98]" : ""
        } ${className}`}
        {...props}
      >
        {emoji ? <span className="shrink-0">{emoji}</span> : null}
        {iconLeft ? <span className={`shrink-0 inline-flex items-center ${sizeConfig.icon}`}>{iconLeft}</span> : null}
        <span className="truncate">{children}</span>
        {iconRight ? <span className={`shrink-0 inline-flex items-center ${sizeConfig.icon}`}>{iconRight}</span> : null}
        {onDismiss ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 active:bg-black/20 text-current transition-colors inline-flex items-center justify-center"
            aria-label="Remove tag"
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        ) : null}
      </span>
    );
  }
);

BrandTag.displayName = "BrandTag";
