import React from "react";
import { ArrowLeft, ArrowRight, Loader2, Phone, Apple } from "lucide-react";

export type BrandButtonSize = "sm" | "md" | "lg";
export type BrandButtonVariant = "primary" | "secondary" | "outline" | "outline-white" | "black";
export type BrandButtonState = "default" | "hover" | "focused" | "disabled";

export interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: BrandButtonSize;
  variant?: BrandButtonVariant;
  state?: BrandButtonState;
  loading?: boolean;
  showLeftIcon?: boolean;
  showRightIcon?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children: React.ReactNode;
}

export function BrandButton({
  size = "md",
  variant = "primary",
  state = "default",
  loading = false,
  showLeftIcon = false,
  showRightIcon = false,
  leftIcon,
  rightIcon,
  iconLeft,
  iconRight,
  children,
  className = "",
  style = {},
  disabled,
  ...props
}: BrandButtonProps) {
  const isDisabled = disabled || state === "disabled" || loading;

  const resolvedLeftIcon = iconLeft || leftIcon;
  const resolvedRightIcon = iconRight || rightIcon;

  // Size specifications matching Figma 4370:5514
  const sizeStyles = {
    sm: {
      padding: "8px 14px",
      fontSize: "0.88rem",
      gap: "6px",
      iconSize: 16,
      borderRadius: "10px",
    },
    md: {
      padding: "10px 18px",
      fontSize: "1rem",
      gap: "8px",
      iconSize: 20,
      borderRadius: "12px",
    },
    lg: {
      padding: "12px 24px",
      fontSize: "1.2rem",
      gap: "10px",
      iconSize: 24,
      borderRadius: "14px",
    },
  };

  const currentSize = sizeStyles[size];

  // Variant color definitions
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: state === "hover" ? "#cce43b" : "#dff25e",
      color: "#17251f",
      border: state === "focused" ? "3px solid #8c9e13" : "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    },
    secondary: {
      background: state === "hover" ? "#296d55" : "#184f3a",
      color: "#ffffff",
      border: state === "focused" ? "3px solid #dff25e" : "1px solid transparent",
      boxShadow: "0 2px 8px rgba(24, 79, 58, 0.2)",
    },
    outline: {
      background: state === "hover" ? "rgba(24, 79, 58, 0.06)" : "transparent",
      color: "#184f3a",
      border: "2px solid #184f3a",
    },
    "outline-white": {
      background: state === "hover" ? "rgba(255, 255, 255, 0.12)" : "transparent",
      color: "#ffffff",
      border: "2px solid #ffffff",
    },
    black: {
      background: state === "hover" ? "#2b2b2b" : "#17251f",
      color: "#ffffff",
      border: "1px solid transparent",
    },
  };

  const disabledStyles: React.CSSProperties = isDisabled
    ? {
        background: "#e5e5e5",
        color: "#8c8c8c",
        border: "1px solid #d9d9d9",
        cursor: "not-allowed",
        boxShadow: "none",
        opacity: 0.8,
      }
    : {};

  return (
    <button
      disabled={isDisabled}
      className={`brand-button font-heading ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        letterSpacing: "-0.01em",
        transition: "all 0.18s ease-in-out",
        cursor: isDisabled ? "not-allowed" : "pointer",
        lineHeight: 1,
        ...currentSize,
        ...variantStyles[variant],
        ...disabledStyles,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <Loader2 size={currentSize.iconSize} className="animate-spin" aria-hidden="true" />
      ) : resolvedLeftIcon ? (
        resolvedLeftIcon
      ) : showLeftIcon ? (
        <ArrowLeft size={currentSize.iconSize} aria-hidden="true" />
      ) : null}

      <span>{children}</span>

      {!loading && resolvedRightIcon ? (
        resolvedRightIcon
      ) : showRightIcon && !loading ? (
        <ArrowRight size={currentSize.iconSize} aria-hidden="true" />
      ) : null}
    </button>
  );
}

export type BrandSocialProvider = "google" | "apple" | "phone" | "email" | "custom";

export interface BrandSocialButtonProps {
  provider?: BrandSocialProvider;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function BrandSocialButton({
  provider = "custom",
  label,
  icon,
  onClick,
  className = "",
  style = {},
}: BrandSocialButtonProps) {
  let defaultLabel = label;
  let defaultIcon = icon;

  if (provider === "google") {
    defaultLabel = defaultLabel || "Continue with Google";
    defaultIcon = defaultIcon || (
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
    );
  } else if (provider === "apple") {
    defaultLabel = defaultLabel || "Continue with Apple";
    defaultIcon = defaultIcon || <Apple className="w-4 h-4" />;
  } else if (provider === "phone") {
    defaultLabel = defaultLabel || "Continue with SMS";
    defaultIcon = defaultIcon || <Phone className="w-4 h-4" />;
  }

  defaultLabel = defaultLabel || "Continue";

  return (
    <button
      onClick={onClick}
      className={`font-heading ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 18px",
        borderRadius: "999px",
        background: "#184f3a",
        color: "#ffffff",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        fontWeight: 700,
        fontSize: "0.9rem",
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(24, 79, 58, 0.16)",
        transition: "all 0.18s ease-in-out",
        ...style,
      }}
    >
      {defaultIcon}
      <span>{defaultLabel}</span>
      <ArrowRight size={16} />
    </button>
  );
}
