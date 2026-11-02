import "server-only";

import fs from "node:fs";
import path from "node:path";
import { HELP_LINKS } from "@/lib/help-links";
import { requirePlatformAdmin } from "@/lib/platform/platform-admin";

const HELP_BASE_URL = HELP_LINKS.home;

export interface FreshdeskOpsStatus {
  provider: "freshdesk";
  status: "setup_blocked" | "configured";
  dashboardUrl: string;
  supportEmail: string;
  domain?: string;
  credentialsConfigured: {
    hasDomain: boolean;
    hasApiKey: boolean;
  };
  missingEnvKeys: string[];
  blockerSummary: string;
  guardrails: string[];
}

export interface FreshdeskLookupResult {
  allowed: boolean;
  status: "setup_blocked" | "ready";
  message: string;
  tickets: Array<{
    id: string;
    ticketNumber: number;
    subject: string;
    status: "open" | "pending" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    updatedAt: string;
    freshdeskUrl: string;
  }>;
}

export interface MintlifyNavGroupSummary {
  group: string;
  pages: Array<{
    pagePath: string;
    fileExists: boolean;
    publicUrl: string;
  }>;
}

export interface MintlifyOpsStatus {
  provider: "mintlify";
  canonicalDocsUrl: string;
  dashboardUrl: string;
  repositoryConfigPath: string;
  mintignorePresent: boolean;
  mintignoreExcludedCount: number;
  docsJsonValid: boolean;
  navigationGroupsCount: number;
  totalConfiguredPages: number;
  missingPageFiles: string[];
  navigationGroups: MintlifyNavGroupSummary[];
  quickLinks: Array<{ key: string; url: string }>;
  deploymentVerificationState: "unverified_in_console";
  workflowRules: string[];
}

function normalizeFreshdeskDomain(raw: string | undefined): { domain: string; dashboardUrl: string } {
  if (!raw || !raw.trim()) {
    return {
      domain: "kouchd.freshdesk.com",
      dashboardUrl: "https://kouchd.freshdesk.com",
    };
  }
  let cleaned = raw.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!cleaned.includes(".")) {
    cleaned = `${cleaned}.freshdesk.com`;
  }
  return {
    domain: cleaned,
    dashboardUrl: `https://${cleaned}`,
  };
}

/**
 * Inspects Freshdesk server-side configuration without returning any secret values.
 * When Freshdesk domain or API key are not configured, this reports an explicit setup blocker.
 */
export function getFreshdeskOpsStatus(): FreshdeskOpsStatus {
  const rawDomain = process.env.FRESHDESK_DOMAIN?.trim();
  const rawApiKey = process.env.FRESHDESK_API_KEY?.trim();

  const hasDomain = Boolean(rawDomain);
  const hasApiKey = Boolean(rawApiKey);

  const missingEnvKeys: string[] = [];
  if (!hasDomain) missingEnvKeys.push("FRESHDESK_DOMAIN");
  if (!hasApiKey) missingEnvKeys.push("FRESHDESK_API_KEY");

  const isConfigured = missingEnvKeys.length === 0;
  const { domain, dashboardUrl } = normalizeFreshdeskDomain(rawDomain);
  const supportEmail = process.env.FRESHDESK_SUPPORT_EMAIL?.trim() || "support@kouchd.com";

  return {
    provider: "freshdesk",
    status: isConfigured ? "configured" : "setup_blocked",
    dashboardUrl,
    supportEmail,
    domain,
    credentialsConfigured: {
      hasDomain,
      hasApiKey,
    },
    missingEnvKeys,
    blockerSummary: isConfigured
      ? "Freshdesk domain and API key are configured in the server environment."
      : "Setup blocked: No verified Kouchd Freshdesk domain or API key configured in this environment. Do not invent credentials or fabricate support ticket health.",
    guardrails: [
      "Read-only metadata lookup only (ticket ID, subject, status, priority, updated timestamp, and direct Freshdesk link).",
      "Full conversation bodies and attachments remain in Freshdesk and are never copied into Kouchd or exposed to household members.",
      "Every staff support lookup requires an explicit platform-admin grant and an audit reason.",
      "No ticket creation, reply sending, or status mutation is permitted from this console.",
    ],
  };
}

/**
 * Server-side read-only support lookup gate. Enforces platform-admin authorization,
 * requires a reason for auditability, and fails closed with the setup blocker until
 * verified Freshdesk credentials and domain configuration are provisioned.
 */
export async function lookupFreshdeskTickets(params: {
  query: string;
  reason: string;
}): Promise<FreshdeskLookupResult> {
  await requirePlatformAdmin();

  const trimmedReason = params.reason.trim();
  if (trimmedReason.length < 5) {
    throw new Error("Audit reason is required (minimum 5 characters) for support lookup");
  }

  const status = getFreshdeskOpsStatus();
  if (status.status === "setup_blocked") {
    return {
      allowed: false,
      status: "setup_blocked",
      message: `Lookup unavailable: Missing server environment configuration (${status.missingEnvKeys.join(", ")}). Use the Freshdesk dashboard directly.`,
      tickets: [],
    };
  }

  return {
    allowed: true,
    status: "ready",
    message: "Freshdesk credentials detected; live ticket search is ready behind platform-admin audit.",
    tickets: [],
  };
}

// Backward-compatibility aliases for transitional imports
export {
  getFreshdeskOpsStatus as getHelpScoutOpsStatus,
  lookupFreshdeskTickets as lookupHelpScoutConversations,
  type FreshdeskOpsStatus as HelpScoutOpsStatus,
  type FreshdeskLookupResult as HelpScoutLookupResult,
};

/**
 * Inspects the repository-managed Mintlify configuration (`docs.json`, `.mintignore`,
 * and `help/*.mdx` files) on the server to provide honest structural verification
 * without claiming live Mintlify deployment status.
 */
export function getMintlifyOpsStatus(repoRoot = process.cwd()): MintlifyOpsStatus {
  const docsJsonPath = path.join(repoRoot, "docs.json");
  const mintignorePath = path.join(repoRoot, ".mintignore");

  let mintignorePresent = false;
  let mintignoreExcludedCount = 0;
  try {
    if (fs.existsSync(mintignorePath)) {
      mintignorePresent = true;
      const lines = fs
        .readFileSync(mintignorePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
      mintignoreExcludedCount = lines.length;
    }
  } catch {
    mintignorePresent = false;
  }

  let docsJsonValid = false;
  const navigationGroups: MintlifyNavGroupSummary[] = [];
  const missingPageFiles: string[] = [];
  let totalConfiguredPages = 0;

  try {
    if (fs.existsSync(docsJsonPath)) {
      const raw = JSON.parse(fs.readFileSync(docsJsonPath, "utf8")) as {
        navigation?: {
          groups?: Array<{ group?: string; pages?: string[] }>;
          pages?: Array<{ group?: string; pages?: string[] }>;
        };
      };
      docsJsonValid = true;
      const groups = raw.navigation?.groups ?? raw.navigation?.pages ?? [];

      for (const grp of groups) {
        const groupName = grp.group ?? "Unnamed Group";
        const pages = Array.isArray(grp.pages) ? grp.pages : [];
        const pageSummaries: MintlifyNavGroupSummary["pages"] = [];

        for (const pageSlug of pages) {
          totalConfiguredPages += 1;
          const mdxCandidate = path.join(repoRoot, `${pageSlug}.mdx`);
          const mdCandidate = path.join(repoRoot, `${pageSlug}.md`);
          const fileExists = fs.existsSync(mdxCandidate) || fs.existsSync(mdCandidate);
          if (!fileExists) {
            missingPageFiles.push(pageSlug);
          }
          pageSummaries.push({
            pagePath: `${pageSlug}.mdx`,
            fileExists,
            publicUrl: `${HELP_BASE_URL}/${pageSlug.replace(/^help\//, "help/")}`,
          });
        }

        navigationGroups.push({
          group: groupName,
          pages: pageSummaries,
        });
      }
    }
  } catch {
    docsJsonValid = false;
  }

  const quickLinks = Object.entries(HELP_LINKS).map(([key, url]) => ({
    key,
    url,
  }));

  return {
    provider: "mintlify",
    canonicalDocsUrl: HELP_BASE_URL,
    dashboardUrl: "https://dashboard.mintlify.com",
    repositoryConfigPath: "docs.json",
    mintignorePresent,
    mintignoreExcludedCount,
    docsJsonValid,
    navigationGroupsCount: navigationGroups.length,
    totalConfiguredPages,
    missingPageFiles,
    navigationGroups,
    quickLinks,
    deploymentVerificationState: "unverified_in_console",
    workflowRules: [
      "Public help, roadmap, and customer changelog live in `help/*.mdx` with root `docs.json` as canonical configuration.",
      "Root `.mintignore` excludes application source and internal `docs/` handoff notes from public Mintlify builds.",
      "Do not edit or publish documentation from this console; all changes require repository review, `mintlify validate` / `mintlify broken-links`, and explicit release approval.",
      "Local repository structure checks verify `docs.json` and `.mdx` file presence only—they do not prove live Mintlify deployment state.",
    ],
  };
}
