"use client";

import { analyticsRoute } from "@/lib/telemetry-privacy";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

function PostHogPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && typeof window !== "undefined" && posthog.__loaded) {
      const route = analyticsRoute(pathname);
      posthog.capture("$pageview", { $current_url: `${window.location.origin}${route}` });
    }
  }, [pathname]);

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
  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      <PostHogAuthSync />
      {children}
    </PHProvider>
  );
}
