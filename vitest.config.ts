import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Vercel builds run the suite with real provider keys in the environment.
    // Clear them so test fixtures never reach live PostHog, Knock or Loops;
    // a test that needs a key stubs its own.
    env: {
      NEXT_PUBLIC_POSTHOG_KEY: "",
      KNOCK_API_KEY: "",
      LOOPS_API_KEY: "",
    },
    alias: {
      "@": new URL("./", import.meta.url).pathname,
      "server-only": new URL("./tests/mocks/server-only.ts", import.meta.url).pathname,
    },
  },
});
