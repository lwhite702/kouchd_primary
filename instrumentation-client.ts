import * as Sentry from "@sentry/nextjs";
import { initSecurityRuntime } from "./lib/security-runtime";

initSecurityRuntime();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://f5223ccb49ae6418054cd711f9b1bf6a@o4509756446998528.ingest.us.sentry.io/4512231102808064",

  // Capture 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Replay configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
