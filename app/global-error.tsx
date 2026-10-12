"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    Sentry.captureException(error);
    console.error("[global-error]", error);
  }, [error]);

  const handleRetry = () => {
    setAttempts((prev) => prev + 1);
    reset();
  };

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fcfbf7", color: "#1c211d" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", color: "#667064" }}>
            The cushions shifted
          </p>
          <h1 style={{ margin: "0.5rem 0 1rem", fontSize: "2rem", fontWeight: 600 }}>
            Something went sideways.
          </h1>
          <p style={{ color: "#667064", maxWidth: "28rem", margin: "0 0 1.5rem" }}>
            An unexpected error occurred in the application shell.
          </p>
          {error?.digest && (
            <p style={{ fontSize: "0.85rem", color: "#8a9488", margin: "0 0 1.5rem" }}>
              Reference: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                background: "#1c3829",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.6rem 1.2rem",
                fontSize: "0.95rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {attempts >= 1 && (
              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                style={{
                  background: "transparent",
                  color: "#1c3829",
                  border: "1px solid #c9d1c7",
                  borderRadius: "0.5rem",
                  padding: "0.6rem 1.2rem",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Reload app
              </button>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
