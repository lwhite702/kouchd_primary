import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url).pathname;

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css") ? [path] : [];
  });
}

const files = [join(root, "styles.css"), ...cssFiles(join(root, "app")), ...cssFiles(join(root, "components"))];
const sources = files.map((file) => readFileSync(file, "utf8"));

describe("CSS color channel tokens", () => {
  it("define RGB channel tokens with spaces so rgb(var(--token) / alpha) stays valid", () => {
    const commaTokens = sources.flatMap((source) =>
      [...source.matchAll(/(--[a-z0-9-]*rgb[a-z0-9-]*)\s*:\s*\d+\s*,/g)].map((match) => match[1]),
    );
    expect(commaTokens).toEqual([]);
  });

  it("never mixes comma channels with slash alpha in rgb()", () => {
    const mixed = sources.flatMap((source) => source.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\/[^)]*\)/g) ?? []);
    expect(mixed).toEqual([]);
  });

  it("defines every custom property that is read without a fallback", () => {
    const all = sources.join("\n");
    const defined = new Set([...all.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((match) => match[1]));
    const missing = [...all.matchAll(/var\((--[a-zA-Z0-9-]+)\)/g)]
      .map((match) => match[1])
      .filter((name) => !defined.has(name) && !name.startsWith("--font-") && !name.startsWith("--tw-"));
    expect([...new Set(missing)]).toEqual([]);
  });

  it("keeps the in-development dark appearance opt-in for product screens", () => {
    const global = readFileSync(join(root, "styles.css"), "utf8");
    expect(global).not.toMatch(/prefers-color-scheme:\s*dark/);
    expect(global).toContain(':root[data-theme="dark"]');
  });
});
