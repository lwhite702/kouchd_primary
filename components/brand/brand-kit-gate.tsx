"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { CouchSymbol } from "@/components/brand/kouchd-logo";
import { BrandSystemPortal } from "@/components/brand/brand-system-portal";

const BRANDKIT_PASSWORD = "Wrelik2026!";
const STORAGE_KEY = "kouchd_brandkit_access";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): boolean {
  try {
    return (
      sessionStorage.getItem(STORAGE_KEY) === "granted" ||
      document.cookie.includes(`${STORAGE_KEY}=granted`)
    );
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function BrandKitGate() {
  const isStoredAccess = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [unlockedState, setUnlockedState] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const isUnlocked = isStoredAccess || unlockedState;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === BRANDKIT_PASSWORD) {
      setError(false);
      setUnlockedState(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, "granted");
        document.cookie = `${STORAGE_KEY}=granted; path=/; max-age=604800; SameSite=Lax`;
      } catch {
        // Storage unavailable fallback
      }
    } else {
      setError(true);
    }
  };

  if (isUnlocked) {
    return <BrandSystemPortal />;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--kouchd-paper, #f5f0e8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#fffdf8",
          borderRadius: "24px",
          border: "1px solid #ded8ce",
          boxShadow: "0 20px 48px rgba(23, 37, 31, 0.08)",
          padding: "44px 36px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "var(--kouchd-forest, #184f3a)",
            display: "grid",
            placeItems: "center",
            color: "#fffdf8",
            margin: "0 auto 20px",
            boxShadow: "0 8px 20px rgba(24, 79, 58, 0.2)",
            border: "2px solid rgba(223, 242, 94, 0.35)",
          }}
          aria-hidden="true"
        >
          <CouchSymbol size={32} color="#fffdf8" />
        </div>

        <p
          style={{
            fontSize: "11px",
            fontWeight: 850,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#92582b",
            margin: "0 0 10px",
          }}
        >
          Protected Resource
        </p>

        <h1
          style={{
            margin: "0 0 12px",
            fontSize: "26px",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: "var(--kouchd-ink, #17251f)",
            lineHeight: 1.15,
          }}
        >
          Brand &amp; Press Kit
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            fontSize: "14px",
            lineHeight: 1.55,
            color: "var(--kouchd-muted, #59675f)",
            fontFamily: 'var(--font-inter), "Inter", sans-serif',
          }}
        >
          This portal is password protected. Enter the access password to view brand guidelines, vector logos, and design assets.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ textAlign: "left" }}>
            <label
              htmlFor="brandkit-password"
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 700,
                color: "#37423c",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              id="brandkit-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Enter password"
              autoFocus
              required
              style={{
                width: "100%",
                height: "48px",
                borderRadius: "12px",
                border: error ? "1px solid #ef4444" : "1px solid #c9bea9",
                background: "#ffffff",
                padding: "0 16px",
                fontSize: "15px",
                color: "#17251f",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.18s, box-shadow 0.18s",
              }}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                fontSize: "13px",
                fontWeight: 650,
                color: "#b91c1c",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "10px 14px",
                textAlign: "left",
              }}
            >
              Incorrect password. Please try again.
            </div>
          )}

          <button
            type="submit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              height: "48px",
              width: "100%",
              borderRadius: "999px",
              backgroundColor: "var(--kouchd-lime, #dff25e)",
              color: "#17251f",
              fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
              fontWeight: 800,
              fontSize: "14px",
              border: "1px solid rgba(24, 79, 58, 0.12)",
              boxShadow: "0 4px 14px rgba(24, 79, 58, 0.08)",
              cursor: "pointer",
              transition: "transform 0.18s, background-color 0.18s",
              marginTop: "4px",
            }}
          >
            <LockKeyhole size={16} aria-hidden="true" />
            Unlock Brand Kit
          </button>
        </form>

        <div style={{ marginTop: "28px", borderTop: "1px solid #ded8ce", paddingTop: "20px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--kouchd-forest, #184f3a)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to Kouchd home
          </Link>
        </div>
      </div>
    </main>
  );
}
