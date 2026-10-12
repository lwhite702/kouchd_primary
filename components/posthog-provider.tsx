"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

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

  useEffect(() => {
    if (typeof window === "undefined" || !posthog.__loaded) return;

    if (userId) {
      posthog.identify(userId);
    } else {
      posthog.reset();
    }
  }, [userId]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey) return;

    posthog.init(posthogKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
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
