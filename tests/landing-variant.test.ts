import { describe, expect, it } from "vitest";
import { chooseLandingVariant } from "@/lib/landing-variant";

describe("chooseLandingVariant", () => {
  it("defaults to the start page", () => {
    expect(chooseLandingVariant({})).toBe("start");
    expect(chooseLandingVariant({ utm_source: "google" })).toBe("start");
  });

  it("opens the simple page for configured sources, ignoring case and spaces", () => {
    expect(chooseLandingVariant({ utm_source: "newsletter" })).toBe("simple");
    expect(chooseLandingVariant({ utm_source: " SMS " })).toBe("simple");
    expect(chooseLandingVariant({ utm_source: ["qr", "google"] })).toBe("simple");
  });

  it("lets ?landing= override the source", () => {
    expect(chooseLandingVariant({ landing: "simple" })).toBe("simple");
    expect(chooseLandingVariant({ landing: "start", utm_source: "sms" })).toBe("start");
    expect(chooseLandingVariant({ landing: "bogus", utm_source: "sms" })).toBe("simple");
  });

  it("accepts a custom source list", () => {
    expect(chooseLandingVariant({ utm_source: "partner" }, ["partner"])).toBe("simple");
  });
});
