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

function isUsableName(name?: string): name is string {
  const normalized = name?.trim().replace(/\s+/g, " ").toLowerCase();
  return Boolean(normalized && !["guest", "host", "kouchd member", "unknown guest", "unknown member"].includes(normalized));
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
  if (isUsableName(explicit)) {
    return explicit;
  }

  // 2. Identity name claim from JWT (e.g. "Lee White")
  const idName = candidate.identityName?.trim();
  if (isUsableName(idName)) {
    return idName;
  }

  // 3. Combined given_name and family_name
  const combined = [candidate.givenName, candidate.familyName].filter(Boolean).join(" ").trim();
  if (isUsableName(combined)) {
    return combined;
  }

  // 4. Nickname or preferred username
  const nick = candidate.nickname?.trim();
  if (isUsableName(nick)) {
    return nick;
  }
  const preferred = candidate.preferredUsername?.trim();
  if (isUsableName(preferred)) {
    return preferred;
  }

  // 5. Keep a saved profile name only when it is not a generic role fallback.
  const existing = candidate.existingName?.trim();
  if (isUsableName(existing)) {
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
