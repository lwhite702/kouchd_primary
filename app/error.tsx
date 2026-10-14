"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    Sentry.captureException(error);
    console.error("[route-error]", error);
  }, [error]);

  const handleRetry = () => {
    setAttempts((prev) => prev + 1);
    reset();
  };

  return (
    <main className="route-state">
      <p className="eyebrow">The cushions shifted</p>
      <h1>Something went sideways.</h1>
      <p className="muted">Your shared record has not been changed.</p>
      {error?.digest && (
        <p className="muted" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
          Reference: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button className="button primary" type="button" onClick={handleRetry}>
          Try again
        </button>
        {attempts >= 1 && (
          <Link className="button secondary" href="/">
            Back to Home
          </Link>
        )}
      </div>
    </main>
  );
}

