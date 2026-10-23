import {
  scrubErrorEvent,
  scrubTelemetryProperties,
} from "@/lib/telemetry-privacy";
import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (postHogKey) {
  posthog.init(postHogKey, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    disable_session_recording: true,
    before_send: (event) => {
      if (!event) return event;
      scrubTelemetryProperties(event.properties);
      scrubTelemetryProperties(event.$set);
      scrubTelemetryProperties(event.$set_once);
      return event;
    },
  });
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend: scrubErrorEvent,
  beforeSendTransaction: scrubErrorEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
