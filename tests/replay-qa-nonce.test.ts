import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { GET, HEAD, REPLAY_QA_SECURITY_NONCE } from "../app/.well-known/replay-qa-security-nonce/route";
import { config as proxyConfig } from "../proxy";

const EXPECTED_NONCE = "loopqa-sec-3bAFRdzS2bM3tBVyOSeOy8MvDU8J2Z1BExfQyMLmljc";

describe("Replay QA site ownership nonce", () => {
  it("exports the exact expected 54-byte nonce", () => {
    expect(REPLAY_QA_SECURITY_NONCE).toBe(EXPECTED_NONCE);
    expect(Buffer.byteLength(REPLAY_QA_SECURITY_NONCE, "utf8")).toBe(54);
  });

  it("GET handler returns HTTP 200 with raw plain text and no newline", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");

    const text = await response.text();
    expect(text).toBe(EXPECTED_NONCE);
    expect(text.endsWith("\n")).toBe(false);
    expect(text.endsWith("\r")).toBe(false);
    expect(Buffer.byteLength(text, "utf8")).toBe(54);
  });

  it("HEAD handler returns HTTP 200 with text/plain headers and empty body", async () => {
    const response = HEAD();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    const text = await response.text();
    expect(text).toBe("");
  });

  it("public static file matches exact 54 bytes without newline", () => {
    const filePath = path.join(process.cwd(), "public", ".well-known", "replay-qa-security-nonce");
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toBe(EXPECTED_NONCE);
    expect(fs.statSync(filePath).size).toBe(54);
  });

  it("excludes .well-known routes from proxy/auth middleware", () => {
    const matchers = Array.isArray(proxyConfig.matcher)
      ? proxyConfig.matcher
      : [proxyConfig.matcher];

    const rootNegativeMatcher = matchers.find(
      (m): m is string => typeof m === "string" && m.includes("(?!")
    );
    expect(rootNegativeMatcher).toBeDefined();
    expect(rootNegativeMatcher).toContain("\\.well-known");

    // Test the regular expression extracted from rootNegativeMatcher against the nonce path
    const regexPattern = rootNegativeMatcher!.replace(/^\^?/, "^").replace(/\$?$/, "$");
    const regex = new RegExp(regexPattern);
    expect(regex.test("/.well-known/replay-qa-security-nonce")).toBe(false);
    expect(regex.test("/.well-known/apple-app-site-association")).toBe(false);
  });
});
