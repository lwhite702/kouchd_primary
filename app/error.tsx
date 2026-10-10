"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="route-state">
      <p className="eyebrow">The cushions shifted</p>
      <h1>Something went sideways.</h1>
      <p className="muted">Your shared record has not been changed.</p>
      <button className="button primary" type="button" onClick={reset}>Try again</button>
    </main>
  );
}
