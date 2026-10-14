"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        // Invitation URLs contain bearer tokens. Do not send these paths
        // to analytics, even after the invitation has been accepted.
        const pathname = new URL(event.url).pathname;
        return pathname.startsWith("/invite/") ? null : event;
      }}
    />
  );
}
