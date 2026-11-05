/**
 * Client-side runtime guard: deduplicates Clerk's static /v1/environment
 * configuration requests (Replay QA).
 *
 * The earlier Subresource Integrity patch for Clerk UI chunks was removed: Clerk
 * loads @clerk/ui@1 (the newest 1.x), so hashes pinned to one release stopped
 * matching after the next one. Clerk scripts are protected by the CSP host
 * allowlist and the per-request nonce instead (lib/security/csp.ts).
 */

export const SECURITY_RUNTIME_INLINE_SCRIPT = `
(function() {
  if (typeof window === 'undefined') return;
  if (!window.__kouchd_fetch_patched && typeof window.fetch === 'function') {
    window.__kouchd_fetch_patched = true;
    var origFetch = window.fetch;
    var cache = new Map();
    window.fetch = function(input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) ? input.url : (input instanceof URL ? input.href : '');
      var method = (init && init.method) || (input && typeof input === 'object' && 'method' in input ? input.method : 'GET');
      if (method && method.toUpperCase() === 'GET' && url.indexOf('/v1/environment') !== -1) {
        var p = cache.get(url);
        if (!p) {
          p = origFetch.call(this, input, init).then(function(res) {
            if (!res.ok) cache.delete(url);
            return res;
          }).catch(function(err) {
            cache.delete(url);
            throw err;
          });
          cache.set(url, p);
        }
        return p.then(function(res) { return res.clone(); });
      }
      return origFetch.call(this, input, init);
    };
  }
})();
`;

export function initSecurityRuntime(): void {
  if (typeof window === "undefined") return;

  // Deduplicate static Clerk /v1/environment requests
  if (typeof window.fetch === "function" && !(window as unknown as { __kouchd_fetch_patched?: boolean }).__kouchd_fetch_patched) {
    (window as unknown as { __kouchd_fetch_patched?: boolean }).__kouchd_fetch_patched = true;

    const originalFetch = window.fetch;
    const environmentCache = new Map<string, Promise<Response>>();

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input && "url" in input
              ? input.url
              : "";
      const method =
        (init && init.method) ||
        (input && typeof input === "object" && "method" in input ? (input.method as string) : "GET");

      if (method.toUpperCase() === "GET" && url.includes("/v1/environment")) {
        let cachedPromise = environmentCache.get(url);
        if (!cachedPromise) {
          cachedPromise = originalFetch.call(this, input, init)
            .then((res) => {
              if (!res.ok) {
                environmentCache.delete(url);
              }
              return res;
            })
            .catch((err) => {
              environmentCache.delete(url);
              throw err;
            });
          environmentCache.set(url, cachedPromise);
        }
        return cachedPromise.then((res) => res.clone());
      }

      return originalFetch.call(this, input, init);
    };
  }
}
