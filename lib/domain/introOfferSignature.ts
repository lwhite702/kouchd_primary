/**
 * Apple introductory-offer eligibility signature (ES256 compact JWS), matching
 * Apple's App Store Server Library `IntroductoryOfferEligibilitySignatureCreator`:
 * header { alg: ES256, kid, typ: JWT }, claims { iss, iat, aud:
 * "introductory-offer-eligibility", bid, nonce, productId,
 * allowIntroductoryOffer, transactionId }.
 * https://developer.apple.com/documentation/storekit/generating-jws-to-sign-app-store-requests
 *
 * Uses Web Crypto only, so it runs in the default Convex runtime.
 */

export interface IntroOfferSigningConfig {
  /** In-App Purchase key ID from App Store Connect → Users and Access → Integrations. */
  keyId: string;
  /** Issuer ID from the same page. */
  issuerId: string;
  bundleId: string;
  /** Contents of the downloaded .p8 file (PKCS #8 PEM). */
  privateKeyPem: string;
}

export function readIntroOfferSigningConfig(env: Record<string, string | undefined>): IntroOfferSigningConfig | null {
  const keyId = env.APP_STORE_IAP_KEY_ID?.trim();
  const issuerId = env.APP_STORE_IAP_ISSUER_ID?.trim();
  const bundleId = env.APP_STORE_BUNDLE_ID?.trim();
  // Convex env values are single-line; accept "\n" escapes in the PEM.
  const privateKeyPem = env.APP_STORE_IAP_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!keyId || !issuerId || !bundleId || !privateKeyPem) return null;
  return { keyId, issuerId, bundleId, privateKeyPem };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlJson(value: unknown): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function createIntroOfferEligibilityJws(
  config: IntroOfferSigningConfig,
  claims: { productId: string; allowIntroductoryOffer: boolean; transactionId: string },
  options: { nowMs?: number; nonce?: string } = {},
): Promise<string> {
  const header = { alg: "ES256", kid: config.keyId, typ: "JWT" };
  const payload = {
    iss: config.issuerId,
    iat: Math.floor((options.nowMs ?? Date.now()) / 1000),
    aud: "introductory-offer-eligibility",
    bid: config.bundleId,
    nonce: options.nonce ?? crypto.randomUUID(),
    productId: claims.productId,
    allowIntroductoryOffer: claims.allowIntroductoryOffer,
    transactionId: claims.transactionId,
  };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(config.privateKeyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  // Web Crypto returns the raw r||s (IEEE P1363) form JWS ES256 requires.
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}
