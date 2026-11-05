import { getClientIp, isRateLimited } from "@/lib/newsletter-limiter";
import { classifyUpstreamError, isAuthFailureStatus, isRetryableStatus } from "@/lib/newsletter-error";

function json(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json("Please submit the signup form again.", 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) return json("Please submit a smaller signup form.", 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json("Please submit a valid signup form.", 400);
  }

  if (!body || typeof body !== "object") return json("Please submit a valid signup form.", 400);
  const signup = body as { email?: unknown; consent?: unknown; website?: unknown };

  // Quietly accept the decoy field so simple bots do not retry against the provider.
  if (typeof signup.website === "string" && signup.website.trim()) {
    return json("Thanks for signing up.", 200);
  }

  if (signup.consent !== true) return json("Please agree to receive Kouchd email updates.", 400);
  if (typeof signup.email !== "string") return json("Enter a valid email address.", 400);

  const email = signup.email.trim().toLowerCase();
  if (!isValidEmail(email)) return json("Enter a valid email address.", 400);

  const ip = getClientIp(request);
  try {
    if (isRateLimited(ip)) return json("Please wait a minute before trying again.", 429);
  } catch (limiterError) {
    console.error("Newsletter rate limiter error; returning 503", {
      ip,
      error: limiterError instanceof Error ? limiterError.message : String(limiterError),
    });
    return json("Signup is temporarily unavailable. Please try again later.", 503);
  }

  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) return json("Signup is temporarily unavailable. Please try again later.", 503);

  const sendToLoops = () =>
    fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        subscribed: true,
        source: "Kouchd website newsletter signup",
        userGroup: "Kouchd Newsletter",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });

  let response: Response | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      response = await sendToLoops();
      // A response, even a failed one, replaces any earlier network error.
      lastError = undefined;
      if (response.ok || !isRetryableStatus(response.status)) {
        break;
      }
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (err: unknown) {
      lastError = err;
      const classification = classifyUpstreamError(err);
      if (attempt === 1 && classification === "network") {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      break;
    }
  }

  if (lastError && (!response || !response.ok)) {
    const classification = classifyUpstreamError(lastError);
    if (classification === "timeout" || classification === "network") {
      console.error("Loops newsletter upstream network/timeout failure", {
        classification,
        errorName: lastError instanceof Error ? lastError.name : "UnknownError",
        message: lastError instanceof Error ? lastError.message : String(lastError),
      });
      return json("We couldn’t reach the signup service. Please try again shortly.", 502);
    }

    console.error("Newsletter route internal unexpected error", {
      errorName: lastError instanceof Error ? lastError.name : "UnknownError",
      message: lastError instanceof Error ? lastError.message : String(lastError),
    });
    return json("An unexpected error occurred. Please try again.", 500);
  }

  if (response && isAuthFailureStatus(response.status)) {
    // Distinct message so alerting can tell a rotated or revoked key apart from an outage.
    console.error("Loops newsletter misconfiguration: API key rejected", { status: response.status });
    return json("We couldn’t add you just now. Please try again.", 502);
  }

  if (!response || !response.ok) {
    console.error("Loops newsletter signup failed", { status: response?.status });
    return json("We couldn’t add you just now. Please try again.", 502);
  }

  return json("Thanks for signing up.", 200);
}
