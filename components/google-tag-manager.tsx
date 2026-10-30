"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { adsConsented } from "@/lib/analytics/consent";
import { analyticsRoute } from "@/lib/telemetry-privacy";

/** Google Tag Manager container for app.kouchd.com (kouchd.com uses GTM-NXXR2VT5). */
export const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-P39F6XRN";

type DataLayerWindow = Window & { dataLayer?: unknown[] };

function dataLayer(): unknown[] {
  const win = window as DataLayerWindow;
  win.dataLayer = win.dataLayer || [];
  return win.dataLayer;
}

// gtag commands must reach the dataLayer as an Arguments object, as in Google's snippet.
function gtag(..._args: unknown[]): void;
function gtag() {
  // eslint-disable-next-line prefer-rest-params
  dataLayer().push(arguments);
}

let loaded = false;

function loadContainer() {
  if (loaded) return;
  loaded = true;
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  const ads = adsConsented(document.cookie, gpc) ? "granted" : "denied";
  gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  });
  gtag("js", new Date());
  dataLayer().push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.appendChild(script);
}

/**
 * Loads the app's Tag Manager container on every page. Google Consent Mode
 * keeps analytics storage granted but every advertising signal denied unless
 * the visitor allowed ads on kouchd.com (the shared kouchd_consent cookie) and
 * the browser does not send Global Privacy Control.
 *
 * Invitation links carry bearer tokens in the path, so tags in the container
 * should read `page_path` from the `kouchd_page_view` event (route categories
 * from lib/telemetry-privacy.ts) rather than the raw page URL.
 */
export function GoogleTagManager() {
  const pathname = usePathname();

  useEffect(() => {
    loadContainer();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    dataLayer().push({ event: "kouchd_page_view", page_path: analyticsRoute(pathname) });
  }, [pathname]);

  return null;
}
