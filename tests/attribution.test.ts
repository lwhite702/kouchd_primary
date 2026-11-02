import { describe, expect, it } from "vitest";
import {
  attributionCookieDomain,
  captureAttribution,
  initialTouchProperties,
  mergeTouch,
  parseAttribution,
  serializeAttributionCookie,
  touchFromSearch,
} from "../lib/analytics/attribution";

const now = new Date("2026-10-30T12:00:00Z");

function fakeWindow(search: string, hostname: string, cookie = "") {
  const jar = { cookie };
  return {
    location: { search, hostname },
    document: {
      get cookie() {
        return jar.cookie;
      },
      set cookie(value: string) {
        jar.cookie = value.split(";")[0];
      },
    },
  } as unknown as Window;
}

describe("campaign attribution", () => {
  it("reads campaign and click IDs and ignores other parameters", () => {
    expect(touchFromSearch("?utm_source=meta&utm_campaign=fall&fbclid=abc&code=XYZ", now)).toEqual({
      utm_source: "meta",
      utm_campaign: "fall",
      fbclid: "abc",
      at: now.toISOString(),
    });
    expect(touchFromSearch("?role=host", now)).toBeNull();
  });

  it("keeps the first touch and replaces the last touch", () => {
    const first = { utm_source: "meta", at: "a" };
    const second = { utm_source: "google", at: "b" };
    const merged = mergeTouch(mergeTouch({}, first), second);
    expect(merged).toEqual({ first, last: second });
    expect(mergeTouch(merged, null)).toBe(merged);
  });

  it("shares the cookie across Kouchd subdomains only", () => {
    expect(attributionCookieDomain("app.kouchd.com")).toBe(".kouchd.com");
    expect(attributionCookieDomain("kouchd.com")).toBe(".kouchd.com");
    expect(attributionCookieDomain("kouchd-git-x.vercel.app")).toBeUndefined();
    expect(serializeAttributionCookie({}, "app.kouchd.com")).toContain("Domain=.kouchd.com");
    expect(serializeAttributionCookie({}, "localhost")).not.toContain("Domain=");
  });

  it("round-trips through the cookie and survives a malformed value", () => {
    const value = { first: { utm_source: "meta" } };
    const cookie = serializeAttributionCookie(value, "app.kouchd.com").split(";")[0];
    expect(parseAttribution(`other=1; ${cookie}`)).toEqual(value);
    expect(parseAttribution("kouchd_attr=%7Bbroken")).toEqual({});
  });

  it("writes only when the visit carries campaign parameters", () => {
    const quiet = fakeWindow("?role=guest", "app.kouchd.com");
    expect(captureAttribution(quiet, now)).toEqual({});
    expect(quiet.document.cookie).toBe("");

    const landed = fakeWindow("?utm_source=meta", "app.kouchd.com");
    const result = captureAttribution(landed, now);
    expect(result.first?.utm_source).toBe("meta");
    expect(parseAttribution(landed.document.cookie)).toEqual(result);
  });

  it("maps the first touch to initial_* person properties", () => {
    expect(initialTouchProperties({ first: { utm_source: "meta", fbclid: "abc", at: "x" } })).toEqual({
      initial_utm_source: "meta",
      initial_fbclid: "abc",
    });
  });
});
