"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState } from "react";

import { PostHogProvider } from "@/components/posthog-provider";

function ConfiguredProviders({ children, convexUrl }: { children: React.ReactNode; convexUrl: string }) {
  const [convex] = useState(() => new ConvexReactClient(convexUrl));
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <PostHogProvider>{children}</PostHogProvider>
    </ConvexProviderWithClerk>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return <PostHogProvider>{children}</PostHogProvider>;
  }

  return <ConfiguredProviders convexUrl={convexUrl}>{children}</ConfiguredProviders>;
}
