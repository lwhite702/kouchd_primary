"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { adsConsented, signupMetaEventId } from "@/lib/analytics/consent";

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
/** Accounts created this recently count as a fresh sign-up on their first app visit. */
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

function fbq(...args: unknown[]) {
  (window as unknown as { fbq?: Fbq }).fbq?.(...args);
}

function loadPixel(pixelId: string) {
  const queue: Fbq = Object.assign((...args: unknown[]) => queue.queue!.push(args), {
    queue: [] as unknown[],
    loaded: true,
    version: "2.0",
  });
  queue.push = queue;
  (window as unknown as { fbq: Fbq; _fbq: Fbq }).fbq = queue;
  (window as unknown as { _fbq: Fbq })._fbq = queue;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", pixelId);
}

/**
 * Meta Pixel for the web app. Inert unless NEXT_PUBLIC_META_PIXEL_ID is set
 * and the visitor allowed ads on kouchd.com without Global Privacy Control.
 * Do not set the ID until the advertising sections of the privacy and cookie
 * policies are approved and published (docs/internal/META_ADS.md).
 */
export function MetaPixel() {
  const pathname = usePathname();
  const { user } = useUser();
  const started = useRef(false);

  useEffect(() => {
    if (!PIXEL_ID) return;
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
    if (!adsConsented(document.cookie, gpc)) return;
    if (!started.current) {
      loadPixel(PIXEL_ID);
      started.current = true;
    }
    fbq("track", "PageView");
  }, [pathname]);

  useEffect(() => {
    if (!started.current || !user?.createdAt) return;
    if (Date.now() - new Date(user.createdAt).getTime() > NEW_ACCOUNT_WINDOW_MS) return;
    const sentKey = `kouchd_meta_signup_${user.id}`;
    try {
      if (window.localStorage.getItem(sentKey)) return;
      window.localStorage.setItem(sentKey, "1");
    } catch {
      // Without storage the event may repeat; Meta deduplicates on eventID.
    }
    fbq("track", "CompleteRegistration", {}, { eventID: signupMetaEventId(user.id) });
  }, [user, pathname]);

  return null;
}
