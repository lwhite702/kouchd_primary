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
