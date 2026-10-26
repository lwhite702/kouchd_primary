import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const lockConfigPath = join(root, "release/feature-lock.json");
const versionPath = join(root, "VERSION");
const roadmapPath = join(root, "help/product/roadmap.mdx");

function loadLockConfig() {
  if (!existsSync(lockConfigPath)) {
    throw new Error(`Missing feature lock configuration at ${lockConfigPath}`);
  }
  return JSON.parse(readFileSync(lockConfigPath, "utf8"));
}

function getCurrentBranch() {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function parseFlags(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        result[key] = next;
        i += 1;
      } else {
        result[key] = "true";
      }
    }
  }
  return result;
}

function printStatus() {
  const config = loadLockConfig();
  const version = existsSync(versionPath) ? readFileSync(versionPath, "utf8").trim() : "unknown";
  const branch = getCurrentBranch();

  const exemptPRBranches = (config.exemptOpenPullRequests ?? []).map((item) => item.branch);
  const exemptInFlight = config.exemptInFlightBranches ?? [];
  const isExempt = exemptPRBranches.includes(branch) || exemptInFlight.includes(branch);
  const isPostV1WorktreeBranch = branch.startsWith(
    config.newFeaturePolicy?.branchPrefix ?? "codex/post-v1-",
  );

  let branchPolicy = "LOCKED (1.0 RC Launch Line — patches & bug fixes only)";
  if (isExempt) {
    branchPolicy = "EXEMPT PRE-LOCK IN-FLIGHT BRANCH (allowed to complete merge)";
  } else if (isPostV1WorktreeBranch) {
    branchPolicy = "ISOLATED POST-1.0 FEATURE WORKTREE BRANCH (new feature development allowed)";
  }

  console.log("=== Kouchd Version 1.0 Feature Lock Status ===");
  console.log(`Enabled:            ${config.enabled}`);
  console.log(`Release Phase:      ${config.phase} (Target: ${config.targetMajorVersion})`);
  console.log(`Current VERSION:    ${version}`);
  console.log(`Current Candidate:  ${config.currentCandidate}`);
  console.log(`Active Branch:      ${branch}`);
  console.log(`Branch Policy:      ${branchPolicy}`);
  console.log(`Allowed Launch Ops: ${(config.allowedChangeTypes ?? []).join(", ")}, rc`);
  console.log(
    `Pre-lock Open PRs:  ${(config.exemptOpenPullRequests ?? []).map((p) => `#${p.pr} (${p.branch})`).join(", ") || "none"}`,
  );
  console.log(`Feature Worktrees:  ${config.newFeaturePolicy?.worktreeBaseDir}`);
}

function appendToRoadmap({ title, summary, section = "Being explored" }) {
  if (!existsSync(roadmapPath)) {
    throw new Error(`Roadmap file not found at ${roadmapPath}`);
  }
  const content = readFileSync(roadmapPath, "utf8");
  const bullet = `- **${title}:** ${summary}`;

  if (content.includes(`**${title}:**`)) {
    console.log(`Roadmap already contains an entry for "${title}".`);
    return false;
  }

  const normalizedSection =
    section.toLowerCase() === "in progress" ? "## In progress" : "## Being explored";
  const sectionIdx = content.indexOf(normalizedSection);
  if (sectionIdx === -1) {
    throw new Error(`Could not find section "${normalizedSection}" in ${roadmapPath}`);
  }

  const afterHeadingIdx = content.indexOf("\n", sectionIdx);
  const nextSectionIdx = content.indexOf("\n## ", afterHeadingIdx + 1);
  const insertionPoint = nextSectionIdx === -1 ? content.length : nextSectionIdx;

  const before = content.slice(0, insertionPoint).trimEnd();
  const after = content.slice(insertionPoint);
  const updated = `${before}\n${bullet}\n${after}`;
  writeFileSync(roadmapPath, updated, "utf8");
  console.log(`Added "${title}" to ${roadmapPath} under "${normalizedSection}".`);
  return true;
}

function deferFeature(flags) {
  const config = loadLockConfig();
  const title = flags.title?.trim();
  const summary = flags.summary?.trim();
  const slug = (flags.slug || title || "feature")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const issue = flags.issue?.trim();
  const section = flags.section?.trim() || "Being explored";

  if (!title || !summary) {
    throw new Error(
      'Usage: node scripts/feature-lock.mjs defer-feature --title "Feature name" --summary "Plainspoken description" [--issue WRE-XXX] [--slug short-name] [--section "Being explored"|"In progress"]',
    );
  }

  appendToRoadmap({ title, summary, section });

  const prefix = config.newFeaturePolicy?.branchPrefix ?? "codex/post-v1-";
  const branchSuffix = issue ? `${issue}-${slug}` : slug;
  const branchName = `${prefix}${branchSuffix}`;
  const worktreeBase = config.newFeaturePolicy?.worktreeBaseDir ?? "/Volumes/Projects/CodexWorktrees";
  const worktreeDirName = `kouchd-${branchSuffix.toLowerCase()}`;
  const worktreePath = join(worktreeBase, worktreeDirName);

  if ( flags["skip-worktree"] === "true") {
    console.log(`Skipped worktree creation (--skip-worktree). Target branch: ${branchName}`);
    return;
  }

  mkdirSync(worktreeBase, { recursive: true });
  if (existsSync(worktreePath)) {
    console.log(`Isolated feature worktree already exists at: ${worktreePath}`);
    return;
  }

  const baseRef = flags.base || "main";
  execFileSync("git", ["worktree", "add", "-b", branchName, worktreePath, baseRef], {
    cwd: root,
    stdio: "inherit",
  });
  console.log(`\nCreated isolated post-1.0 feature worktree:`);
  console.log(`  Worktree Path: ${worktreePath}`);
  console.log(`  Feature Branch: ${branchName}`);
}

function bumpRc() {
  const current = readFileSync(versionPath, "utf8").trim();
  const rcMatch = current.match(/^(\d+\.\d+\.\d+)-rc\.(\d+)$/);
  let nextVersion = "1.0.0-rc.1";
  if (rcMatch) {
    nextVersion = `${rcMatch[1]}-rc.${Number(rcMatch[2]) + 1}`;
  }
  execFileSync("node", ["scripts/release-version.mjs", "prepare", nextVersion], {
    cwd: root,
    stdio: "inherit",
  });
  const changePath = join(root, "release/change.json");
  if (existsSync(changePath)) {
    const change = JSON.parse(readFileSync(changePath, "utf8"));
    change.version = nextVersion;
    change.type = "rc";
    writeFileSync(changePath, `${JSON.stringify(change, null, 2)}\n`, "utf8");
  }
  console.log(`Updated release candidate to ${nextVersion}.`);
}

const command = process.argv[2] ?? "status";
const flags = parseFlags(process.argv.slice(3));

if (command === "status") {
  printStatus();
} else if (command === "defer-feature") {
  deferFeature(flags);
} else if (command === "bump-rc") {
  bumpRc();
} else {
  throw new Error("Unknown command. Use: status | defer-feature | bump-rc");
}
