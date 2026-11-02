export function classifyUpstreamError(error: unknown): "timeout" | "network" | "unknown" {
  if (!(error instanceof Error)) return "unknown";

  if (error.name === "TimeoutError" || error.name === "AbortError") {
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

  if (
    error instanceof TypeError &&
    (error.message.toLowerCase().includes("fetch") ||
      error.message.toLowerCase().includes("network"))
  ) {
    return "network";
  }

  return "unknown";
}
