export function classifyUpstreamError(error: unknown): "timeout" | "network" | "unknown" {
  if (!(error instanceof Error)) return "unknown";

  // AbortSignal.timeout() rejects with a TimeoutError. A bare AbortError means someone
  // cancelled the request on purpose (client gone, shutdown); retrying it could sign the
  // person up twice, so it is not treated as a timeout.
  if (error.name === "TimeoutError") {
    return "timeout";
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const causeObj = cause as { code?: unknown; name?: unknown };
    if (causeObj.name === "TimeoutError") return "timeout";
    if (
      typeof causeObj.code === "string" &&
      ["ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN"].includes(causeObj.code)
    ) {
      return "network";
    }
  }

  if (error instanceof TypeError && error.message === "fetch failed") {
    return "network";
  }

  return "unknown";
}

/** Loops is busy (429) or failing (5xx): worth one more try. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Loops rejected our credentials: retrying cannot help, the API key needs fixing. */
export function isAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}
