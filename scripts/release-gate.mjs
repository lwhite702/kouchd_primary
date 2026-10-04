import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const version = read("VERSION").trim();
const classification = JSON.parse(read("release/change.json"));
if (!["major", "minor", "patch", "none"].includes(classification.type)) {
  throw new Error("Classify the release as major, minor, patch, or none");
}
if (classification.version !== version || !classification.reason?.trim()) {
  throw new Error("Release classification must name VERSION and give a factual reason");
}
const tags = execFileSync("git", ["tag", "--list", `v${version}`], { encoding: "utf8" }).trim();
const changelog = read("CHANGELOG.md");
const unreleased = changelog.split(/^## \[Unreleased\]/m)[1]?.split(/^## \[/m)[0]?.trim();


const hasRemoteMain = (() => {
  try {
    execFileSync("git", ["rev-parse", "--verify", "origin/main"], { stdio: "ignore" });
    return true;
  } catch { return false; }
})();
const base = process.env.RELEASE_BASE_REF || (process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : process.env.GITHUB_EVENT_NAME === "push" ? "HEAD^" : hasRemoteMain ? "origin/main" : "main");
let baseVersion;
let changed = [];
try {
  try { baseVersion = execFileSync("git", ["show", `${base}:VERSION`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { baseVersion = JSON.parse(execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).version; }
  changed = execFileSync("git", ["diff", "--name-only", base], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  changed.push(...execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" }).trim().split("\n").filter(Boolean));
} catch (error) {
  throw new Error(`Cannot verify release baseline ${base}; fetch the base branch before checking`, { cause: error });
}
const runtime = changed.some((path) => {
  if (/\.(md|mdx)$/.test(path)) return false;
  return /^(app|components|convex|ios|lib|worker|scripts)\//.test(path)
    || /^(package(?:-lock)?\.json|next\.config\.ts)$/.test(path);
});
if (runtime && (!unreleased || unreleased.length < 60)) throw new Error("A substantive [Unreleased] changelog entry is required");
if (runtime && tags) throw new Error(`Version ${version} has already been released; prepare a unique version`);
if (runtime && baseVersion) {
  const compare = (value) => value.split("-")[0].split(".").map(Number);
  const next = compare(version);
  const previous = compare(baseVersion);
  const type = classification.type;
  const expected = type === "major" ? [previous[0] + 1, 0, 0]
    : type === "minor" ? [previous[0], previous[1] + 1, 0]
    : type === "patch" ? [previous[0], previous[1], previous[2] + 1] : previous;
  if (type === "none" || !next.every((part, index) => part === expected[index])) {
    throw new Error(`${type} classification requires ${expected.join(".")} from ${baseVersion}`);
  }
  if (!next.some((number, index) => number > previous[index] && next.slice(0, index).every((part, prior) => part === previous[prior]))) {
    throw new Error(`Runtime changes require a unique, increasing version after ${baseVersion}`);
  }
}
if (runtime && !changed.some((path) => /^(help|docs)\//.test(path))) throw new Error("Runtime changes require updated documentation");
if (runtime && !changed.includes("CHANGELOG.md")) throw new Error("Runtime changes require a changelog update");
console.log(`Release artifacts checked for ${version}; runtime changes: ${runtime}.`);
