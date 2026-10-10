const UNAMBIGUOUS_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  let result = "KCH-";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * UNAMBIGUOUS_CHARSET.length);
    result += UNAMBIGUOUS_CHARSET[randomIndex];
  }
  return result;
}

export function normalizeReferralCode(code: string): string {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.startsWith("KCH") && clean.length > 3) {
    return `KCH-${clean.slice(3)}`;
  }
  return clean.length >= 4 ? `KCH-${clean}` : clean;
}

export function isValidReferralCodeFormat(code: string): boolean {
  const normalized = normalizeReferralCode(code);
  return /^KCH-[A-Z0-9]{4,10}$/.test(normalized);
}
