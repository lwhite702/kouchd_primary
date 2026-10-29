import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixtures: string[] = [];
afterEach(() => { for (const path of fixtures.splice(0)) rmSync(path, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "kouchd-release-"));
  fixtures.push(root);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const write = (path: string, content: string) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  git("init", "-b", "main");
  git("config", "user.name", "Release test");
  git("config", "user.email", "release-test@example.invalid");
  write("VERSION", "0.3.0\n");
  write("CHANGELOG.md", "## [Unreleased]\n\nExisting implementation details describing the current Kouchd feature baseline and release evidence.\n");
  write("release/change.json", JSON.stringify({ version: "0.3.0", type: "none", reason: "Baseline" }));
  git("add", "."); git("commit", "-m", "baseline");
  mkdirSync(join(root, "scripts"), { recursive: true });
  copyFileSync(new URL("../scripts/release-gate.mjs", import.meta.url), join(root, "scripts/release-gate.mjs"));
  git("add", "scripts/release-gate.mjs"); git("commit", "--amend", "--no-edit");
  const run = () => execFileSync(process.execPath, [join(root, "scripts/release-gate.mjs")], {
    cwd: root, env: { ...process.env, RELEASE_BASE_REF: "main" }, encoding: "utf8", stdio: "pipe"
  });
  const runtime = (version = "0.4.0", type = "minor") => {
    write("VERSION", version + "\n");
    write("release/change.json", JSON.stringify({ version, type, reason: "Adds native shared-stay screens" }));
    write("app/feature.ts", "export const nativeFeature = true;\n");
    write("docs/feature.md", "Native app setup and verification.\n");
    write("CHANGELOG.md", "## [Unreleased]\n\nAdded native shared-stay screens, compatible service queries, and Wrelik version checks for the first iOS release.\n");
  };
  return { git, write, run, runtime };
}
describe("Wrelik release gate", () => {
  it("accepts a documented minor feature release", () => {
    const f = fixture(); f.runtime();
    expect(f.run()).toContain("runtime changes: true");
  });
  it("uses the nearest versioned ancestor when the base snapshot has no version file", () => {
    const f = fixture();
    f.git("rm", "VERSION");
    f.git("commit", "-m", "snapshot without release metadata");
    f.runtime();
    expect(f.run()).toContain("runtime changes: true");
  });
  it("rejects reuse of a released version", () => {
    const f = fixture(); f.runtime(); f.git("tag", "v0.4.0");
    expect(f.run).toThrow(/already been released/);
  });
  it("rejects runtime changes without a bump", () => {
    const f = fixture(); f.runtime("0.3.0", "none");
    expect(f.run).toThrow(/classification requires/);
  });
  it("rejects a bump that conflicts with its classification", () => {
    const f = fixture(); f.runtime("0.3.1", "minor");
    expect(f.run).toThrow(/minor classification requires 0.4.0/);
  });
  it("allows documentation changes to retain a released version", () => {
    const f = fixture(); f.git("tag", "v0.3.0"); f.write("ios/README.md", "Clarified setup.\n");
    f.write("CHANGELOG.md", "## [Unreleased]\n");
    expect(f.run()).toContain("runtime changes: false");
  });
  it("allows landing page and brand center edits to retain a released version without bump", () => {
    const f = fixture(); f.git("tag", "v0.3.0");
    f.write("components/brand/brand-system-portal.tsx", "export const brand = true;\n");
    f.write("components/landing-page.tsx", "export const landing = true;\n");
    f.write("app/brand/page.tsx", "export const brandPage = true;\n");
    f.write("CHANGELOG.md", "## [Unreleased]\n");
    expect(f.run()).toContain("runtime changes: false");
  });
  describe("renumbered releases", () => {
    // A base recorded as 1.0.0-rc.13 that release/version-history.json renames to 0.7.12.
    const renumberedBase = () => {
      const f = fixture();
      f.write("VERSION", "1.0.0-rc.13\n");
      f.write("release/change.json", JSON.stringify({ version: "1.0.0-rc.13", type: "rc", reason: "Old candidate" }));
      f.git("add", "."); f.git("commit", "-m", "rc baseline");
      f.write("release/version-history.json", JSON.stringify({ renamed: { "1.0.0-rc.13": "0.7.12" } }));
      return f;
    };
    it("accepts renaming the base release to its current number without a new release", () => {
      const f = renumberedBase(); f.runtime("0.7.12", "none");
      expect(f.run()).toContain("checked for 0.7.12");
    });
    it("compares the next patch against the renamed base", () => {
      const f = renumberedBase(); f.runtime("0.7.13", "patch");
      expect(f.run()).toContain("checked for 0.7.13");
    });
    it("still rejects an unmapped step down from the base", () => {
      const f = renumberedBase(); f.runtime("0.7.11", "none");
      expect(f.run).toThrow(/classification requires/);
    });
  });
});
