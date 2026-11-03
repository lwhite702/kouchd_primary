import { isValidReferralCodeFormat, normalizeReferralCode } from "@/lib/referral";

/**
 * Query parameter that carries a guest's invite code from the signed-out
 * Start page, through sign-up, back to the workspace's "Join with code" step.
 * Joining still happens through `api.referral.joinWithCode`, which needs a
 * signed-in account, so the code only pre-fills the existing join card.
 */
export const JOIN_CODE_PARAM = "join";

/**
 * Where the Start page sends a guest after they enter an invite code.
 * Returns null when the code is not a valid household code.
 */
export function guestJoinSignUpHref(rawCode: string): string | null {
  const code = normalizeReferralCode(rawCode);
  if (!isValidReferralCodeFormat(code)) return null;
  const returnUrl = `/?${JOIN_CODE_PARAM}=${encodeURIComponent(code)}`;
  return `/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`;
}

/** Reads a valid, normalized invite code from a URL search string. */
export function readJoinCodeParam(search: string): string | null {
  const raw = new URLSearchParams(search).get(JOIN_CODE_PARAM);
  if (!raw) return null;
  const code = normalizeReferralCode(raw);
  return isValidReferralCodeFormat(code) ? code : null;
}
