/**
 * Reads the kouchd_consent cookie that kouchd.com writes from its cookie
 * banner (see kouchd_marketing src/lib/consent.ts). The app uses it only for
 * advertising: product analytics in the app is covered by the app's policy.
 */
export const CONSENT_COOKIE = "kouchd_consent";

export function adsConsented(cookieHeader: string, gpc: boolean): boolean {
  if (gpc) return false;
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return false;
  try {
    const consent = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1)));
    return consent?.ads === true && consent?.gpc !== true;
  } catch {
    return false;
  }
}

/** The Meta event ID shared by the browser Pixel and the Conversions API copy of a sign-up. */
export function signupMetaEventId(clerkUserId: string): string {
  return `signup_${clerkUserId}`;
}
