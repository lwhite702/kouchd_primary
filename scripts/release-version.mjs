import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const versionPath = join(root, "VERSION");
const packagePath = join(root, "package.json");
const lockPath = join(root, "package-lock.json");
const iosYamlPath = join(root, "ios/project.yml");
const iosProjectPath = join(root, "ios/Kouchd.xcodeproj/project.pbxproj");
const iosInfoPath = join(root, "ios/Kouchd/Info.plist");
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-rc\.([1-9]\d*))?$/;
const mode = process.argv[2] ?? "check";
const version = mode === "prepare" ? process.argv[3] : readFileSync(versionPath, "utf8").trim();

if (!semver.test(version)) throw new Error(`Invalid release version: ${version ?? "missing"} (expected X.Y.Z or X.Y.Z-rc.N)`);

const iosMarketingVersion = version.split("-")[0];
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const lockJson = JSON.parse(readFileSync(lockPath, "utf8"));

if (mode === "prepare") {
  packageJson.version = version;
  lockJson.version = version;
  lockJson.packages[""].version = version;
  const changePath = join(root, "release/change.json");
  if (existsSync(changePath)) {
    const change = JSON.parse(readFileSync(changePath, "utf8"));
    change.version = version;
    writeFileSync(changePath, `${JSON.stringify(change, null, 2)}\n`);
  }
  const featureLockPath = join(root, "release/feature-lock.json");
  if (existsSync(featureLockPath) && version.includes("-rc.")) {
    const featureLock = JSON.parse(readFileSync(featureLockPath, "utf8"));
    if (!featureLock.enabled) {
      throw new Error("Release candidates start when the 1.0 feature lock is turned on. Use a 0.7.x prerelease number.");
    }
    featureLock.currentCandidate = version;
    writeFileSync(featureLockPath, `${JSON.stringify(featureLock, null, 2)}\n`);
  }
  writeFileSync(versionPath, `${version}\n`);
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  writeFileSync(lockPath, `${JSON.stringify(lockJson, null, 2)}\n`);
  for (const path of [iosYamlPath, iosProjectPath]) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    writeFileSync(path, content.replace(/(MARKETING_VERSION\s*[:=]\s*)[0-9A-Za-z.-]+/g, (_, prefix) => `${prefix}${iosMarketingVersion}`));
  }
  console.log(`Prepared ${version} (iOS MARKETING_VERSION: ${iosMarketingVersion}). Changelog and release approval remain separate.`);
} else if (mode === "check") {
  const mismatches = [];
  if (packageJson.version !== version) mismatches.push("package.json");
  if (lockJson.version !== version || lockJson.packages[""].version !== version) mismatches.push("package-lock.json");
  for (const path of [iosYamlPath, iosProjectPath]) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    const values = [...content.matchAll(/MARKETING_VERSION\s*[:=]\s*([0-9A-Za-z.-]+)/g)].map((match) => match[1]);
    if (!values.length || values.some((value) => value !== version && value !== iosMarketingVersion)) mismatches.push(path);
  }
  if (existsSync(iosInfoPath)) {
    const info = readFileSync(iosInfoPath, "utf8");
    if (!/<key>CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/.test(info)) {
      mismatches.push(iosInfoPath);
    }
  }
  if (mismatches.length) throw new Error(`Version ${version} does not match: ${mismatches.join(", ")}`);
  console.log(`Version ${version} is synchronized.`);
} else {
  throw new Error("Use check or prepare X.Y.Z[-rc.N]");
}
