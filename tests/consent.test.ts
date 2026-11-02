import { describe, expect, it } from "vitest";
import { adsConsented, signupMetaEventId } from "../lib/analytics/consent";

const cookie = (value: object) => `other=1; kouchd_consent=${encodeURIComponent(JSON.stringify(value))}`;

describe("advertising consent from kouchd.com", () => {
  it("allows the Pixel only with an explicit ads choice and no Global Privacy Control", () => {
    expect(adsConsented(cookie({ analytics: true, ads: true, gpc: false }), false)).toBe(true);
    expect(adsConsented(cookie({ analytics: true, ads: false, gpc: false }), false)).toBe(false);
    expect(adsConsented(cookie({ analytics: true, ads: true, gpc: false }), true)).toBe(false);
    expect(adsConsented(cookie({ analytics: true, ads: true, gpc: true }), false)).toBe(false);
    expect(adsConsented("", false)).toBe(false);
    expect(adsConsented("kouchd_consent=%7Bbroken", false)).toBe(false);
  });

  it("uses one event ID for the browser and server copies of a sign-up", () => {
    expect(signupMetaEventId("user_abc")).toBe("signup_user_abc");
  });
});
