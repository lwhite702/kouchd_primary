"use client";

import { scrubTelemetryProperties } from "@/lib/telemetry-privacy";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import * as Sentry from "@sentry/nextjs";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && typeof window !== "undefined" && posthog.__loaded) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = `${url}?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

function PostHogAuthSync() {
  const { userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (typeof window === "undefined" || !posthog.__loaded) return;

    if (userId && user) {
      posthog.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
        username: user.username ?? undefined,
        created_at: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
      });

      // Synchronize PostHog session replay with Sentry error monitoring
      try {
        const sessionId = posthog.get_session_id();
        const replayUrl = posthog.get_session_replay_url({ withTimestamp: true });
        if (sessionId) Sentry.setTag("posthog_session_id", sessionId);
        if (replayUrl) Sentry.setTag("posthog_replay_url", replayUrl);
      } catch {
        // Safe no-op if session replay is disabled or initializing
      }
    } else if (!userId) {
      posthog.reset();
    }
  }, [userId, user]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey || posthog.__loaded) return;

    posthog.init(posthogKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      capture_performance: true,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: ".ph-no-capture, [data-sensitive='true']",
        recordCrossOriginIframes: false,
      },
      before_send: (event) => {
        if (!event) return event;
        scrubTelemetryProperties(event.properties);
        scrubTelemetryProperties(event.$set);
        scrubTelemetryProperties(event.$set_once);
        return event;
      },
      rageclick: true,
      persistence: "localStorage+cookie",
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogAuthSync />
      {children}
    </PHProvider>
  );
}
