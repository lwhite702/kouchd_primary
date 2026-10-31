import { describe, expect, it } from "vitest";
import { resolveFlag, type FlagInputs } from "../lib/flags/resolve";

const settled: FlagInputs = {
  devOverride: null,
  dbOverride: null,
  posthogFlag: undefined,
  posthogSettled: true,
  defaultValue: true,
};

describe("resolveFlag", () => {
  it("stays off while Convex or PostHog are loading, so a killed feature never flashes", () => {
    expect(resolveFlag({ ...settled, dbOverride: undefined })).toBe(false);
    expect(resolveFlag({ ...settled, posthogSettled: false })).toBe(false);
  });

  it("lets the Convex kill switch and force-on win over PostHog", () => {
    expect(resolveFlag({ ...settled, dbOverride: "disabled", posthogFlag: true })).toBe(false);
    expect(resolveFlag({ ...settled, dbOverride: "enabled", posthogFlag: false, posthogSettled: false })).toBe(true);
  });

  it("uses PostHog, then the registry default", () => {
    expect(resolveFlag({ ...settled, dbOverride: "default", posthogFlag: false })).toBe(false);
    expect(resolveFlag({ ...settled, posthogFlag: undefined })).toBe(true);
    expect(resolveFlag({ ...settled, defaultValue: false })).toBe(false);
  });

  it("puts the dev or preview override first", () => {
    expect(resolveFlag({ ...settled, devOverride: true, dbOverride: "disabled" })).toBe(true);
  });
});
