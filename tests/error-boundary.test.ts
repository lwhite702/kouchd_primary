import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorPage from "../app/error";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("Route-level Error Boundary (app/error.tsx)", () => {
  it("renders error state with Try again button", () => {
    const reset = vi.fn();
    const html = renderToStaticMarkup(React.createElement(ErrorPage, { error: new Error("Test error"), reset }));
    expect(html).toContain("The cushions shifted");
    expect(html).toContain("Something went sideways.");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Reload app");
  });

  it("escalates to reload button when attempts reach threshold", () => {
    const reset = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(ErrorPage, {
        error: new Error("Deterministic crash"),
        reset,
        initialAttempts: 2,
      })
    );
    expect(html).toContain("Reload app");
    expect(html).toContain("Back to Home");
  });
});

describe("retryOrReload", () => {
  it("resets without reloading when the retry succeeds", async () => {
    const { retryOrReload } = await import("../lib/error-retry");
    const reset = vi.fn();
    const report = vi.fn();
    const reload = vi.fn();
    retryOrReload(reset, report, reload);
    expect(reset).toHaveBeenCalledOnce();
    expect(report).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("reports and reloads when reset throws again", async () => {
    const { retryOrReload } = await import("../lib/error-retry");
    const failure = new Error("still broken");
    const reset = vi.fn(() => { throw failure; });
    const report = vi.fn();
    const reload = vi.fn();
    expect(() => retryOrReload(reset, report, reload)).not.toThrow();
    expect(report).toHaveBeenCalledWith(failure);
    expect(reload).toHaveBeenCalledOnce();
  });
});
