import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

export interface PlatformAdminUser {
  userId: string;
  email?: string;
  name: string;
  role: "platform_admin";
}

/**
 * Validates that the current authenticated caller holds a valid platform admin grant.
 * Fails closed by throwing an Error if unauthenticated or unauthorized.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminUser> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthenticated: Sign-in required for platform console");
  }

  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
    ?? user?.emailAddresses?.[0]?.emailAddress;

  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const adminUserIds = (process.env.PLATFORM_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const hasEmailMatch = primaryEmail ? adminEmails.includes(primaryEmail.toLowerCase()) : false;
  const hasIdMatch = adminUserIds.includes(userId);
  const metadataRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const hasMetadataRole = metadataRole === "platform_admin" || metadataRole === "admin";

  if (!hasEmailMatch && !hasIdMatch && !hasMetadataRole) {
    throw new Error("Unauthorized: Platform admin grant required");
  }

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
    || user?.username
    || primaryEmail
    || "Platform Operator";

  return {
    userId,
    email: primaryEmail,
    name: displayName,
    role: "platform_admin",
  };
}
