import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../app/api/newsletter/route";
import {
  isRateLimited,
  getClientIp,
  resetRateLimiterForTest,
  getRateLimiterSizeForTest,
} from "../lib/newsletter-limiter";

describe("Newsletter API Route & Rate Limiter", () => {
  beforeEach(() => {
    resetRateLimiterForTest();
    vi.restoreAllMocks();
    process.env.LOOPS_API_KEY = "test-loops-key";
  });

  describe("In-Memory Rate Limiter", () => {
    it("allows up to 5 requests per IP within the 60s rate window and blocks the 6th with 429", () => {
      const ip = "192.168.1.100";
      const now = 1_000_000;

      // First 5 requests must be allowed
      for (let i = 0; i < 5; i++) {
        expect(isRateLimited(ip, now)).toBe(false);
      }

      // 6th request within same window is blocked
      expect(isRateLimited(ip, now + 1_000)).toBe(true);
      // 7th request is also blocked
      expect(isRateLimited(ip, now + 2_000)).toBe(true);

      // After rate window (60,000ms), rate limit resets
      expect(isRateLimited(ip, now + 61_000)).toBe(false);
    });

    it("caps memory usage and does not grow unbounded under flood of distinct IPs", () => {
      const now = 1_000_000;
      // Inject 6,000 distinct IPs (exceeding MAX_TRACKED_IPS = 5,000)
      for (let i = 0; i < 6_000; i++) {
        isRateLimited(`10.0.${Math.floor(i / 256)}.${i % 256}`, now);
      }

      // Assert hard cap is respected
      expect(getRateLimiterSizeForTest()).toBeLessThanOrEqual(5_000);
    });

    it("prunes expired entries periodically", () => {
      const now = 1_000_000;
      // Add entries at t = 1,000,000
      for (let i = 0; i < 50; i++) {
        isRateLimited(`172.16.0.${i}`, now);
      }
      expect(getRateLimiterSizeForTest()).toBe(50);

      // Fast forward past the 60s window + prune interval
      const later = now + 70_000;
      isRateLimited("172.16.1.1", later);

      // Previous 50 expired entries should have been pruned
      expect(getRateLimiterSizeForTest()).toBe(1);
    });

    it("extracts client IP correctly from headers", () => {
      const reqWithRealIp = new Request("http://localhost/api/newsletter", {
        headers: { "x-real-ip": "203.0.113.195" },
      });
      expect(getClientIp(reqWithRealIp)).toBe("203.0.113.195");

      const reqWithForwarded = new Request("http://localhost/api/newsletter", {
        headers: { "x-forwarded-for": "198.51.100.22, 10.0.0.1, 10.0.0.2" },
      });
      expect(getClientIp(reqWithForwarded)).toBe("198.51.100.22");

      const reqWithoutIp = new Request("http://localhost/api/newsletter");
      expect(getClientIp(reqWithoutIp)).toBe("unknown");
    });
  });

  describe("POST /api/newsletter", () => {
    it("successfully submits subscriber to Loops API", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal("fetch", mockFetch);

      const req = new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "1.2.3.4",
        },
        body: JSON.stringify({
          email: "guest@example.com",
          consent: true,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe("Thanks for signing up.");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://app.loops.so/api/v1/contacts/update");
      expect(JSON.parse(options.body)).toEqual({
        email: "guest@example.com",
        subscribed: true,
        source: "Kouchd website newsletter signup",
        userGroup: "Kouchd Newsletter",
      });
    });

    it("silently swallows decoy honeypot submissions without calling Loops", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      const req = new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "bot@spammer.com",
          consent: true,
          website: "https://spam.example.com",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("rejects non-json content type with 415", async () => {
      const req = new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "email=test@example.com",
      });

      const res = await POST(req);
      expect(res.status).toBe(415);
    });

    it("validates email presence, format, and consent", async () => {
      const testCases = [
        { payload: { email: "", consent: true }, expectedStatus: 400 },
        { payload: { email: "not-an-email", consent: true }, expectedStatus: 400 },
        { payload: { email: "user@example.com", consent: false }, expectedStatus: 400 },
        { payload: { consent: true }, expectedStatus: 400 },
      ];

      for (const { payload, expectedStatus } of testCases) {
        const req = new Request("http://localhost/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const res = await POST(req);
        expect(res.status).toBe(expectedStatus);
      }
    });

    it("enforces rate limit returning 429 on 6th request", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));

      const makeRequest = () =>
        new Request("http://localhost/api/newsletter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-real-ip": "203.0.113.55",
          },
          body: JSON.stringify({ email: "user@example.com", consent: true }),
        });

      for (let i = 0; i < 5; i++) {
        const res = await POST(makeRequest());
        expect(res.status).toBe(200);
      }

      const rateLimitedRes = await POST(makeRequest());
      expect(rateLimitedRes.status).toBe(429);
      const data = await rateLimitedRes.json();
      expect(data.message).toBe("Please wait a minute before trying again.");
    });

    it("returns 502 when Loops service returns non-200 error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Service error", { status: 500 })));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const req = new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", consent: true }),
      });

      const res = await POST(req);
      expect(res.status).toBe(502);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Loops newsletter signup failed",
        expect.objectContaining({ status: 500 })
      );
    });

    it("returns 502 for upstream network failure or timeout", async () => {
      const timeoutError = new Error("The operation timed out");
      timeoutError.name = "TimeoutError";
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const req = new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", consent: true }),
      });

      const res = await POST(req);
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.message).toBe("We couldn’t reach the signup service. Please try again shortly.");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Loops newsletter upstream network/timeout failure",
        expect.objectContaining({ errorName: "TimeoutError" })
      );
    });

    it("returns 500 for unexpected internal errors without leaking details", async () => {
      const unexpectedError = new ReferenceError("unexpected internal variable bug");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(unexpectedError));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const req = new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", consent: true }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.message).toBe("An unexpected error occurred. Please try again.");
      expect(data.stack).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Newsletter route internal unexpected error",
        expect.objectContaining({ errorName: "ReferenceError" })
      );
    });
  });
});
