export function formatEmailAsName(email?: string): string | undefined {
  if (!email) return undefined;
  const localPart = email.split("@")[0] || "";
  const parts = localPart.split(/[._-]+/).filter(Boolean);
  if (parts.length > 0) {
    const formatted = parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
    if (formatted) return formatted;
  }
  return localPart ? localPart.charAt(0).toUpperCase() + localPart.slice(1) : undefined;
}

export function resolveMemberName(candidate: {
  explicitName?: string;
  identityName?: string;
  givenName?: string;
  familyName?: string;
  nickname?: string;
  preferredUsername?: string;
  email?: string;
  existingName?: string;
  role?: "host" | "guest";
}): string {
  // 1. Explicit name provided by client (e.g. from Clerk useUser() or settings input)
  const explicit = candidate.explicitName?.trim();
  if (explicit && explicit !== "Kouchd member") {
    return explicit;
  }

  // 2. Identity name claim from JWT (e.g. "Lee White")
  const idName = candidate.identityName?.trim();
  if (idName && idName !== "Kouchd member") {
    return idName;
  }

  // 3. Combined given_name and family_name
  const combined = [candidate.givenName, candidate.familyName].filter(Boolean).join(" ").trim();
  if (combined.length > 0 && combined !== "Kouchd member") {
    return combined;
  }

  // 4. Nickname or preferred username
  const nick = candidate.nickname?.trim();
  if (nick && nick !== "Kouchd member") {
    return nick;
  }
  const preferred = candidate.preferredUsername?.trim();
  if (preferred && preferred !== "Kouchd member") {
    return preferred;
  }

  // 5. Existing user record in database if already valid and not "Kouchd member"
  const existing = candidate.existingName?.trim();
  if (existing && existing !== "Kouchd member") {
    return existing;
  }

  // 6. Name derived from email address
  const fromEmail = formatEmailAsName(candidate.email);
  if (fromEmail) {
    return fromEmail;
  }

  // 7. Role-based fallback or default
  if (candidate.role === "host") return "Host";
  if (candidate.role === "guest") return "Guest";

  return "Kouchd member";
}
