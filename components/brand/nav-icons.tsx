import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function HomeNavIcon({ size = 20, color = "currentColor", className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1.32 4.4L5.28 1.32L9.24 4.4V8.8C9.24 8.91669 9.19364 9.02861 9.11113 9.11113C9.02861 9.19364 8.91669 9.24 8.8 9.24H6.6V6.16H3.96V9.24H1.76C1.6433 9.24 1.53139 9.19364 1.44887 9.11113C1.36636 9.02861 1.32 8.91669 1.32 8.8V4.4Z"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ContributionsNavIcon({ size = 20, color = "currentColor", className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7.48 1.32H3.08C2.59399 1.32 2.2 1.71399 2.2 2.2V8.36C2.2 8.84601 2.59399 9.24 3.08 9.24H7.48C7.96601 9.24 8.36 8.84601 8.36 8.36V2.2C8.36 1.71399 7.96601 1.32 7.48 1.32Z"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.52 3.52H7.04M3.52 5.28H7.04M3.52 7.04H5.72"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChoresNavIcon({ size = 20, color = "currentColor", className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1.32 2.64L2.2 3.52L3.52 1.76M4.84 2.64H9.24M1.32 5.72L2.2 6.6L3.52 4.84M4.84 5.72H9.24M1.32 8.8L2.2 9.68L3.52 7.92M4.84 8.8H9.24"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StayNavIcon({ size = 20, color = "currentColor", className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.96 4.4C4.68902 4.4 5.28 3.80902 5.28 3.08C5.28 2.35098 4.68902 1.76 3.96 1.76C3.23098 1.76 2.64 2.35098 2.64 3.08C2.64 3.80902 3.23098 4.4 3.96 4.4Z"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.32 9.24V7.92C1.32 7.21983 1.59814 6.54833 2.09324 6.05324C2.58833 5.55814 3.25983 5.28 3.96 5.28C4.66017 5.28 5.33167 5.55814 5.82676 6.05324C6.32186 6.54833 6.6 7.21983 6.6 7.92V9.24M7.04 1.76C7.39009 1.76 7.72583 1.89907 7.97338 2.14662C8.22093 2.39417 8.36 2.72991 8.36 3.08C8.36 3.43009 8.22093 3.76583 7.97338 4.01338C7.72583 4.26093 7.39009 4.4 7.04 4.4M7.92 5.72C8.3425 5.90255 8.6971 6.213 8.9339 6.60766C9.17069 7.00232 9.27775 7.4613 9.24 7.92V9.24"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
