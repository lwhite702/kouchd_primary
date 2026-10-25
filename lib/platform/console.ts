import "server-only";

import { notFound } from "next/navigation";
import { isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import { requirePlatformAdmin, type PlatformAdminUser } from "./platform-admin";

/** Validate discovery routing only; never authorizes platform data. */
export function requirePlatformEntryKey(consoleKey: string) {
  const configured = process.env.PLATFORM_CONSOLE_SLUG;
  if (isAuthBypassEnabled() || !configured || !/^[a-f0-9]{32,64}$/.test(configured) || consoleKey !== configured) {
    notFound();
  }
}

/**
 * Enforces explicit platform-admin authorization on the canonical `/platform` route
 * without relying on an obscure URL for security. Fails closed on missing grant or bypass mode.
 */
export async function requirePlatformOpsAccess(): Promise<PlatformAdminUser> {
  if (isAuthBypassEnabled()) {
    notFound();
  }
  try {
    return await requirePlatformAdmin();
  } catch {
    notFound();
  }
}

/** Discovery protection + mandatory authenticated platform grant for `/console/[consoleKey]`. */
export async function requirePlatformConsole(consoleKey: string): Promise<PlatformAdminUser> {
  requirePlatformEntryKey(consoleKey);
  try {
    return await requirePlatformAdmin();
  } catch {
    // Unknown route, missing grant, bypass mode and failed auth all fail closed.
    notFound();
  }
}
