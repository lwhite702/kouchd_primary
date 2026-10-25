import "server-only";

import fs from "node:fs";
import path from "node:path";
import { HELP_LINKS } from "@/lib/help-links";
import { requirePlatformAdmin } from "@/lib/platform/platform-admin";

const HELP_BASE_URL = HELP_LINKS.home;

export interface HelpScoutOpsStatus {
  provider: "helpscout";
  status: "setup_blocked" | "configured";
  dashboardUrl: string;
  supportEmail: string;
  credentialsConfigured: {
    hasAppId: boolean;
    hasAppSecret: boolean;
    hasInboxId: boolean;
  };
  missingEnvKeys: string[];
  blockerSummary: string;
  guardrails: string[];
}

export interface HelpScoutLookupResult {
  allowed: boolean;
  status: "setup_blocked" | "ready";
  message: string;
  conversations: Array<{
    id: string;
    number: number;
    subject: string;
    status: "active" | "pending" | "closed" | "spam";
    updatedAt: string;
    helpscoutUrl: string;
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

/**
 * Inspects Help Scout server-side configuration without returning any secret values.
 * Because Kouchd records and environment do not confirm an active Help Scout inbox or
 * API credentials, this reports an explicit setup blocker when unconfigured.
 */
export function getHelpScoutOpsStatus(): HelpScoutOpsStatus {
  const hasAppId = Boolean(process.env.HELPSCOUT_APP_ID?.trim());
  const hasAppSecret = Boolean(process.env.HELPSCOUT_APP_SECRET?.trim());
  const hasInboxId = Boolean(process.env.HELPSCOUT_INBOX_ID?.trim());

  const missingEnvKeys: string[] = [];
  if (!hasAppId) missingEnvKeys.push("HELPSCOUT_APP_ID");
  if (!hasAppSecret) missingEnvKeys.push("HELPSCOUT_APP_SECRET");
  if (!hasInboxId) missingEnvKeys.push("HELPSCOUT_INBOX_ID");

  const isConfigured = missingEnvKeys.length === 0;

  return {
    provider: "helpscout",
    status: isConfigured ? "configured" : "setup_blocked",
    dashboardUrl: "https://secure.helpscout.net",
    supportEmail: "help@kouchd.com",
    credentialsConfigured: {
      hasAppId,
      hasAppSecret,
      hasInboxId,
    },
    missingEnvKeys,
    blockerSummary: isConfigured
      ? "Help Scout OAuth2 credentials and Inbox ID are present in the server environment."
      : "Setup blocked: No verified Kouchd Help Scout Inbox ID or OAuth2 API credentials are configured in this environment. Do not invent an inbox ID or fabricate support conversation health.",
    guardrails: [
      "Read-only metadata lookup only (ticket number, subject, status, updated timestamp, and direct Help Scout link).",
      "Full conversation bodies and attachments remain in Help Scout and are never copied into Kouchd or exposed to household members.",
      "Every staff support lookup requires an explicit platform-admin grant and an audit reason.",
      "No ticket creation, reply sending, or status mutation is permitted from this console.",
    ],
  };
}

/**
 * Server-side read-only support lookup gate. Enforces platform-admin authorization,
 * requires a reason for auditability, and fails closed with the setup blocker until
 * verified Help Scout credentials and inbox configuration are provisioned.
 */
export async function lookupHelpScoutConversations(params: {
  query: string;
  reason: string;
}): Promise<HelpScoutLookupResult> {
  await requirePlatformAdmin();

  const trimmedReason = params.reason.trim();
  if (trimmedReason.length < 5) {
    throw new Error("Audit reason is required (minimum 5 characters) for support lookup");
  }

  const status = getHelpScoutOpsStatus();
  if (status.status === "setup_blocked") {
    return {
      allowed: false,
      status: "setup_blocked",
      message: `Lookup unavailable: Missing server environment configuration (${status.missingEnvKeys.join(", ")}). Use the Help Scout dashboard directly.`,
      conversations: [],
    };
  }

  return {
    allowed: true,
    status: "ready",
    message: "Help Scout credentials detected; live OAuth2 mailbox query is disabled in local/sandbox mode.",
    conversations: [],
  };
}

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
