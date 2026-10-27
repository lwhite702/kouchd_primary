const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const MAX_TRACKED_IPS = 5_000;
const PRUNE_INTERVAL_MS = 10_000;

const requestsByIp = new Map<string, { count: number; resetAt: number }>();
let lastPruneAt = 0;

function pruneExpired(now: number) {
  for (const [key, entry] of requestsByIp) {
    if (entry.resetAt <= now) {
      requestsByIp.delete(key);
    }
  }
  lastPruneAt = now;
}

export function isRateLimited(ip: string, now = Date.now()): boolean {
  if (now - lastPruneAt > PRUNE_INTERVAL_MS || requestsByIp.size >= MAX_TRACKED_IPS) {
    pruneExpired(now);
  }

  const current = requestsByIp.get(ip);
  if (!current || current.resetAt <= now) {
    if (requestsByIp.size >= MAX_TRACKED_IPS) {
      const oldestKey = requestsByIp.keys().next().value;
      if (oldestKey !== undefined) {
        requestsByIp.delete(oldestKey);
      }
    }
    requestsByIp.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT;
}

export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const clientIp = forwardedFor.split(",")[0]?.trim();
    if (clientIp) return clientIp;
  }

  return "unknown";
}

export function resetRateLimiterForTest(): void {
  requestsByIp.clear();
  lastPruneAt = 0;
}

export function getRateLimiterSizeForTest(): number {
  return requestsByIp.size;
}
