import { describe, expect, it } from "vitest";
import {
  analyticsRoute,
  scrubErrorEvent,
  scrubTelemetryProperties,
  telemetryUrl,
} from "../lib/telemetry-privacy";

describe("household telemetry privacy", () => {
  it("scrubs SDK paths, nested person properties and transaction spans", () => {
    const properties = {
      $pathname: "/invite/private-token",
      $session_entry_pathname: "/invite/private-token?secret=value",
      $set_once: {
        $initial_current_url:
          "https://app.kouchd.com/invite/private-token?secret=value",
      },
    };
    scrubTelemetryProperties(properties);
    const event = scrubErrorEvent({
      transaction: "GET /invite/private-token?secret=value",
      request: {
        query_string: "secret=value",
        env: { AUTHORIZATION: "secret" },
      },
      breadcrumbs: [
        {
          data: { from: "/invite/private-token", to: "/sign-in?secret=value" },
        },
      ],
      spans: [
        {
          data: { "http.url": "https://app.kouchd.com/invite/private-token" },
          description: "GET /invite/private-token",
        },
      ],
    });
    expect(JSON.stringify({ properties, event })).not.toMatch(
      /private-token|secret/,
    );
    expect(properties.$pathname).toBe("/invite/:token");
    expect(event.transaction).toBe("GET /invite/:token");
  });

  it("removes invitation tokens, account paths, fragments and query values", () => {
    expect(
      telemetryUrl(
        "https://app.kouchd.com/invite/private-token?email=guest@example.com#secret",
      ),
    ).toBe("https://app.kouchd.com/invite/:token");
    expect(analyticsRoute("/console/private-discovery/users")).toBe("/app");
    expect(telemetryUrl("invalid secret URL")).toBe("");
  });
  it("strips request credentials and household inputs before sending errors", () => {
    const event = scrubErrorEvent({
      request: {
        url: "https://app.kouchd.com/invite/private-token",
        headers: { Authorization: "secret" },
        data: "private house details",
        cookies: "session=secret",
      },
      user: { email: "guest@example.com" },
      extra: { wifiPassword: "secret" },
      breadcrumbs: [
        { data: { url: "https://app.kouchd.com/sign-in?ticket=secret" } },
      ],
    });
    expect(JSON.stringify(event)).not.toMatch(
      /private-token|secret|guest@example/,
    );
    expect(event.breadcrumbs[0].data.url).toBe(
      "https://app.kouchd.com/sign-in",
    );
  });
});
