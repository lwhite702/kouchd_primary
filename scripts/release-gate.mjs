import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const hasFile = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const version = read("VERSION").trim();
const classification = JSON.parse(read("release/change.json"));
if (!["major", "minor", "patch", "rc", "none"].includes(classification.type)) {
  throw new Error("Classify the release as major, minor, patch, rc, or none");
}
if (classification.version !== version || !classification.reason?.trim()) {
  throw new Error("Release classification must name VERSION and give a factual reason");
}

// Versions recorded under a retired number (release/version-history.json) compare by their current number.
const renamed = hasFile("release/version-history.json")
  ? (JSON.parse(read("release/version-history.json")).renamed ?? {})
  : {};
const canonicalVersion = (value) => renamed[value] ?? value;

const currentBranch = (() => {
  try {
    return (
      process.env.GITHUB_HEAD_REF ||
      execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim()
    );
  } catch {
    return "";
  }
})();

// Enforce Version 1.0 Feature Lock (release/feature-lock.json)
if (hasFile("release/feature-lock.json")) {
  const featureLock = JSON.parse(read("release/feature-lock.json"));
  if (featureLock.enabled) {
    const exemptPRBranches = (featureLock.exemptOpenPullRequests ?? []).map((item) => item.branch);
    const exemptInFlight = featureLock.exemptInFlightBranches ?? [];
    const isExemptBranch =
      exemptPRBranches.includes(currentBranch) || exemptInFlight.includes(currentBranch);
    const isIsolatedPostV1Branch =
      typeof featureLock.newFeaturePolicy?.branchPrefix === "string" &&
      currentBranch.startsWith(featureLock.newFeaturePolicy.branchPrefix);

    if (!isExemptBranch && !isIsolatedPostV1Branch) {
      const allowedTypes = new Set([...(featureLock.allowedChangeTypes ?? ["patch", "none"]), "rc"]);
      // Allow the initial transition onto 1.0.0-rc.1 or 1.0.0
      const isInitialV1Promotion =
        classification.type === "major" &&
        (version === "1.0.0" || version.startsWith("1.0.0-rc."));

      if (!allowedTypes.has(classification.type) && !isInitialV1Promotion) {
        throw new Error(
          `[V1 Feature Lock] Version 1.0 launch feature lock is active on branch "${currentBranch}". ` +
            `Only patches and bug fixes (${[...allowedTypes].join(", ")}) are permitted for launch. ` +
            `New features (${classification.type}) must be added to ${featureLock.newFeaturePolicy?.roadmapPath ?? "help/product/roadmap.mdx"} ` +
            `and developed in a separate feature worktree (${featureLock.newFeaturePolicy?.worktreeBaseDir ?? "/Volumes/Projects/CodexWorktrees"}).`,
        );
      }
    }
  }
}

const tags = execFileSync("git", ["tag", "--list", `v${version}`], { encoding: "utf8" }).trim();
const changelog = read("CHANGELOG.md");
const unreleased = changelog.split(/^## \[Unreleased\]/m)[1]?.split(/^## \[/m)[0]?.trim();

const hasRemoteMain = (() => {
  try {
    execFileSync("git", ["rev-parse", "--verify", "origin/main"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const base =
  process.env.RELEASE_BASE_REF ||
  (process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : process.env.GITHUB_EVENT_NAME === "push"
      ? "HEAD^"
      : hasRemoteMain
        ? "origin/main"
        : "main");
let baseVersion;
let changed = [];
try {
  const baselineHistory = execFileSync("git", ["rev-list", "--first-parent", base], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const revision of baselineHistory) {
    try {
      baseVersion = execFileSync("git", ["show", `${revision}:VERSION`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      try {
        baseVersion = JSON.parse(
          execFileSync("git", ["show", `${revision}:package.json`], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          }),
        ).version;
      } catch {
        continue;
      }
    }
    if (baseVersion) break;
  }
  if (!baseVersion) throw new Error(`No release version exists in ${base} or its first-parent history`);
  changed = execFileSync("git", ["diff", "--name-only", base], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  changed.push(
    ...execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean),
  );
} catch (error) {
  throw new Error(`Cannot verify release baseline ${base}; fetch the base branch before checking`, {
    cause: error,
  });
}
const runtime = changed.some((path) => {
  if (/\.(md|mdx)$/.test(path)) return false;
  if (/^scripts\//.test(path)) return false;
  // Edits to the landing page and the brand center do not affect the version number
  if (
    /^(app\/brand|app\/brand-system\.css|components\/brand|components\/ui\/brand-|components\/landing|app\/page\.tsx|public\/brand|public\/landing)/.test(
      path,
    )
  ) {
    return false;
  }
  return (
    /^(app|components|convex|ios|lib|worker)\//.test(path) ||
    /^(package(?:-lock)?\.json|next\.config\.ts)$/.test(path)
  );
});
if (runtime && (!unreleased || unreleased.length < 60)) {
  throw new Error("A substantive [Unreleased] changelog entry is required");
}
if (runtime && tags) {
  throw new Error(`Version ${version} has already been released; prepare a unique version`);
}
// Renaming the base release to its current number is not a new release.
const isRenumberOnly =
  Boolean(baseVersion) &&
  classification.type === "none" &&
  baseVersion !== version &&
  canonicalVersion(baseVersion) === version;
if (runtime && baseVersion && !isRenumberOnly) {
  const parseSemver = (value) => {
    const [core, rcPart] = value.split("-rc.");
    const [maj, min, pat] = core.split(".").map(Number);
    return { maj, min, pat, rc: rcPart ? Number(rcPart) : null };
  };
  const next = parseSemver(version);
  const previous = parseSemver(canonicalVersion(baseVersion));
  const type = classification.type;

  const isValidRcStep =
    next.rc !== null &&
    ((previous.rc === null && next.maj >= previous.maj) ||
      (previous.rc !== null &&
        next.maj === previous.maj &&
        next.min === previous.min &&
        next.pat === previous.pat &&
        next.rc > previous.rc));

  if (!isValidRcStep) {
    const expected =
      type === "major"
        ? [previous.maj + 1, 0, 0]
        : type === "minor"
          ? [previous.maj, previous.min + 1, 0]
          : type === "patch"
            ? [previous.maj, previous.min, previous.pat + 1]
            : [previous.maj, previous.min, previous.pat];
    const nextCore = [next.maj, next.min, next.pat];
    if (type === "none" || !nextCore.every((part, index) => part === expected[index])) {
      throw new Error(`${type} classification requires ${expected.join(".")} from ${baseVersion}`);
    }
    const previousCore = [previous.maj, previous.min, previous.pat];
    if (
      !nextCore.some(
        (number, index) =>
          number > previousCore[index] &&
          nextCore.slice(0, index).every((part, prior) => part === previousCore[prior]),
      )
    ) {
      throw new Error(`Runtime changes require a unique, increasing version after ${baseVersion}`);
    }
  }
}
if (runtime && !changed.some((path) => /^(help|docs)\//.test(path))) {
  throw new Error("Runtime changes require updated documentation");
}
if (runtime && !changed.includes("CHANGELOG.md")) {
  throw new Error("Runtime changes require a changelog update");
}
console.log(`Release artifacts checked for ${version}; runtime changes: ${runtime}.`);
