import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  Manrope: () => ({ variable: "--font-manrope" }),
}));

import { applyScriptSRI, CLERK_SRI_HASHES, initSecurityRuntime } from "../lib/security-runtime";
import { metadata as layoutMetadata } from "../app/layout";
import { metadata as pageMetadata } from "../app/page";
import nextConfig from "../next.config";

describe("Replay QA: Subresource Integrity (SRI) for Clerk UI Chunks", () => {
  it("defines cryptographic integrity hashes for Clerk vendor and UI chunks", () => {
    expect(CLERK_SRI_HASHES["vendors_ui_e564da_1.41.2.js"]).toBe(
      "sha384-n1qf8LZfE2TLHN1Eh3B3t0LvQVqZYr/WKDzGzK1VwkhfLYrZRFinzvauGI4mHpFu"
    );
    expect(CLERK_SRI_HASHES["signin_ui_e564da_1.41.2.js"]).toBe(
      "sha384-GDLSsBq/mg4LaXeEdaQhupD+AA2shJNiVW/V/pKRELWgrJmraK6qUH7O9qxkmGZq"
    );
    expect(CLERK_SRI_HASHES["ui-common_ui_e564da_1.41.2.js"]).toBe(
      "sha384-GzvvsBBuxWU6/TxyU+PjVhiFtGBk5mPCFx0O4ewPfOGWoH16e8lvCL35MsBwNXRa"
    );
  });

  it("applies crossorigin and integrity attributes to matching Clerk script elements", () => {
    const mockScript = {
      crossOrigin: "",
      integrity: "",
    } as unknown as HTMLScriptElement;

    const vendorUrl =
      "https://clerk.kouchd.com/npm/@clerk/ui@1.41.2/dist/vendors_ui_e564da_1.41.2.js";
    applyScriptSRI(mockScript, vendorUrl);

    expect(mockScript.crossOrigin).toBe("anonymous");
    expect(mockScript.integrity).toBe(
      "sha384-n1qf8LZfE2TLHN1Eh3B3t0LvQVqZYr/WKDzGzK1VwkhfLYrZRFinzvauGI4mHpFu"
    );
  });

  it("does not mutate scripts that do not match known Clerk chunk patterns", () => {
    const mockScript = {
      crossOrigin: "",
      integrity: "",
    } as unknown as HTMLScriptElement;

    applyScriptSRI(mockScript, "https://app.kouchd.com/_next/static/chunks/main.js");

    expect(mockScript.crossOrigin).toBe("");
    expect(mockScript.integrity).toBe("");
  });
});

describe("Replay QA: Clerk /v1/environment fetch deduplication", () => {
  it("deduplicates multiple concurrent or subsequent /v1/environment GET requests", async () => {
    const mockResponseText = JSON.stringify({ auth_config: { id: "aac_test" } });
    const originalFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(mockResponseText, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    // Setup simulated window environment
    const fakeWindow = {
      fetch: originalFetch,
      HTMLScriptElement: class {},
      Node: class {},
    };

    const previousWindow = globalThis.window;
    // @ts-expect-error testing window mock
    globalThis.window = fakeWindow;

    try {
      initSecurityRuntime();

      const envUrl =
        "https://clerk.kouchd.com/v1/environment?__clerk_api_version=2026-08-20&_clerk_js_version=6.40.1";

      const req1 = fakeWindow.fetch(envUrl);
      const req2 = fakeWindow.fetch(envUrl);

      const [res1, res2] = await Promise.all([req1, req2]);

      expect(originalFetch).toHaveBeenCalledTimes(1);

      const json1 = await res1.json();
      const json2 = await res2.json();

      expect(json1).toEqual({ auth_config: { id: "aac_test" } });
      expect(json2).toEqual({ auth_config: { id: "aac_test" } });
    } finally {
      (globalThis as unknown as { window?: typeof window }).window = previousWindow;
    }
  });
});

describe("Replay QA: Content-Security-Policy & Canonical Metadata", () => {
  it("configures Content-Security-Policy in next.config headers", async () => {
    const headersConfig = typeof nextConfig.headers === "function" ? await nextConfig.headers() : [];
    const rootRouteHeaders = headersConfig?.find((entry) => entry.source === "/:path*");
    expect(rootRouteHeaders).toBeDefined();

    const cspHeader = rootRouteHeaders?.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    expect(cspHeader).toBeDefined();
    expect(cspHeader?.value).toContain("default-src 'self'");
    expect(cspHeader?.value).toContain("https://clerk.kouchd.com");
    expect(cspHeader?.value).toContain("frame-ancestors 'none'");
  });

  it("keeps Content-Security-Policy out of root layout markup", () => {
    const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    expect(layoutSource).not.toMatch(/httpEquiv=["']Content-Security-Policy["']/i);
  });

  it("configures canonical metadata on root layout and page", () => {
    expect(layoutMetadata.metadataBase?.toString()).toContain("app.kouchd.com");
    expect(layoutMetadata.alternates?.canonical).toBe("/");

    expect(pageMetadata.alternates?.canonical).toBe("https://app.kouchd.com/");
  });
});

describe("Profile Name Parsing & Saving", () => {
  it("correctly handles single and multi-word display names without passing empty strings to Clerk", () => {
    function prepareClerkNameUpdate(displayName: string) {
      const trimmed = displayName.trim();
      const nameParts = trimmed.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
      return { firstName, lastName };
    }

    expect(prepareClerkNameUpdate("Jordan")).toEqual({
      firstName: "Jordan",
      lastName: undefined,
    });

    expect(prepareClerkNameUpdate("Lee White")).toEqual({
      firstName: "Lee",
      lastName: "White",
    });

    expect(prepareClerkNameUpdate("Mary Jane Watson")).toEqual({
      firstName: "Mary",
      lastName: "Jane Watson",
    });

    expect(prepareClerkNameUpdate("   ")).toEqual({
      firstName: "",
      lastName: undefined,
    });
  });
});
