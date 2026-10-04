import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const version = read("VERSION").trim();
const changelog = read("CHANGELOG.md");
const unreleased = changelog.split(/^## \[Unreleased\]/m)[1]?.split(/^## \[/m)[0]?.trim();
if (!unreleased || unreleased.length < 60) throw new Error("A substantive [Unreleased] changelog entry is required");

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
} catch {
  console.log("No comparable base ref; checked local release artifacts only.");
}
const runtime = changed.some((path) => /^(app|components|convex|ios|lib|worker)\//.test(path) || /^(package\.json|next\.config\.ts)$/.test(path));
if (runtime && baseVersion) {
  const compare = (value) => value.split("-")[0].split(".").map(Number);
  const next = compare(version);
  const previous = compare(baseVersion);
  if (!next.some((number, index) => number > previous[index] && next.slice(0, index).every((part, prior) => part === previous[prior]))) {
    throw new Error(`Runtime changes require a unique, increasing version after ${baseVersion}`);
  }
}
if (runtime && !changed.some((path) => /^(help|docs)\//.test(path))) throw new Error("Runtime changes require updated documentation");
if (runtime && !changed.includes("CHANGELOG.md")) throw new Error("Runtime changes require a changelog update");
console.log(`Release artifacts checked for ${version}; runtime changes: ${runtime}.`);
