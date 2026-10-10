"use client";

import React, { useMemo } from "react";
import { KnockProvider, KnockGuideProvider } from "@knocklabs/react";

interface KnockGuidesProviderProps {
  userId?: string;
  userProperties?: Record<string, unknown>;
  children: React.ReactNode;
}

export function KnockGuidesProvider({
  userId,
  userProperties,
  children,
}: KnockGuidesProviderProps) {
  const knockApiKey = process.env.NEXT_PUBLIC_KNOCK_PUBLIC_API_KEY;
  const guideChannelId = process.env.NEXT_PUBLIC_KNOCK_GUIDES_CHANNEL_ID;

  const targetParams = useMemo(() => {
    return userProperties ? { data: userProperties } : undefined;
  }, [userProperties]);

  // If Knock public key or guide channel ID isn't configured, render children cleanly without erroring
  if (!knockApiKey || !guideChannelId) {
    return <>{children}</>;
  }

  return (
    <KnockProvider
      apiKey={knockApiKey}
      user={{ id: userId ?? null, ...(userProperties ?? {}) }}
      enabled={Boolean(userId)}
    >
      <KnockGuideProvider
        channelId={guideChannelId}
        readyToTarget={Boolean(userId)}
        targetParams={targetParams}
        trackLocationFromWindow={true}
      >
        {children}
      </KnockGuideProvider>
    </KnockProvider>
  );
}
