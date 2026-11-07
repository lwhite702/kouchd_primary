import { vi } from "vitest";

// The project key is publishable and inlined: never let tests send real events.
vi.mock("@heycatch/sdk", () => ({
  analytics: {
    init: vi.fn(),
    setIdentity: vi.fn(),
    resetIdentity: vi.fn(),
    trackEvent: vi.fn(),
  },
}));
