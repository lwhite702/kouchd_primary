/**
 * First- and last-touch campaign attribution shared by kouchd.com and
 * app.kouchd.com through one first-party cookie. The marketing site writes it
 * after analytics consent; the app adds the current visit and attaches the
 * first touch to the PostHog person at sign-in.
 */

export const ATTRIBUTION_COOKIE = "kouchd_attr";
export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Touch = Partial<Record<AttributionKey, string>> & { at?: string };
export type Attribution = { first?: Touch; last?: Touch };

const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
const MAX_VALUE_LENGTH = 200;

/** `.kouchd.com` on Kouchd hosts so both sites share the cookie; host-only elsewhere (previews, localhost). */
export function attributionCookieDomain(hostname: string): string | undefined {
  return hostname === "kouchd.com" || hostname.endsWith(".kouchd.com") ? ".kouchd.com" : undefined;
}

export function touchFromSearch(search: string, now: Date): Touch | null {
  const params = new URLSearchParams(search);
  const touch: Touch = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key)?.trim();
    if (value) touch[key] = value.slice(0, MAX_VALUE_LENGTH);
  }
  if (Object.keys(touch).length === 0) return null;
  touch.at = now.toISOString();
  return touch;
}

export function parseAttribution(cookieHeader: string): Attribution {
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ATTRIBUTION_COOKIE}=`));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.slice(ATTRIBUTION_COOKIE.length + 1)));
    return parsed && typeof parsed === "object" ? (parsed as Attribution) : {};
  } catch {
    return {};
  }
}

/** Keeps the first touch forever; replaces the last touch with any new campaign visit. */
export function mergeTouch(current: Attribution, touch: Touch | null): Attribution {
  if (!touch) return current;
  return { first: current.first ?? touch, last: touch };
}

export function serializeAttributionCookie(attribution: Attribution, hostname: string): string {
  const domain = attributionCookieDomain(hostname);
  return [
    `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(attribution))}`,
    "Path=/",
    `Max-Age=${MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    "Secure",
    ...(domain ? [`Domain=${domain}`] : []),
  ].join("; ");
}

/** Person properties for PostHog `$set_once`, e.g. `initial_utm_source`. */
export function initialTouchProperties(attribution: Attribution): Record<string, string> {
  const props: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = attribution.first?.[key];
    if (value) props[`initial_${key}`] = value;
  }
  return props;
}

/** Records this visit's campaign parameters in the shared cookie and returns the result. */
export function captureAttribution(win: Window = window, now = new Date()): Attribution {
  const current = parseAttribution(win.document.cookie);
  const touch = touchFromSearch(win.location.search, now);
  if (!touch) return current;
  const merged = mergeTouch(current, touch);
  try {
    win.document.cookie = serializeAttributionCookie(merged, win.location.hostname);
  } catch {
    // Cookies may be blocked; attribution is best-effort.
  }
  return merged;
}
