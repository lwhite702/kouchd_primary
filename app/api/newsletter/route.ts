import { getClientIp, isRateLimited } from "@/lib/newsletter-limiter";

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
  if (isRateLimited(ip)) return json("Please wait a minute before trying again.", 429);

  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) return json("Signup is temporarily unavailable. Please try again later.", 503);

  try {
    const response = await fetch("https://app.loops.so/api/v1/contacts/update", {
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
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      console.error("Loops newsletter signup failed", { status: response.status });
      return json("We couldn’t add you just now. Please try again.", 502);
    }

    return json("Thanks for signing up.", 200);
  } catch (error: unknown) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    const isNetworkError =
      error instanceof TypeError &&
      (error.message.includes("fetch") || error.message.includes("network"));

    if (isTimeout || isNetworkError) {
      console.error("Loops newsletter upstream network/timeout failure", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      });
      return json("We couldn’t reach the signup service. Please try again shortly.", 502);
    }

    console.error("Newsletter route internal unexpected error", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });
    return json("An unexpected error occurred. Please try again.", 500);
  }
}
