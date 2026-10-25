/**
 * Client-side security runtime guard:
 * 1. Subresource Integrity (SRI) for dynamically injected cross-origin Clerk UI chunks.
 * 2. Static deduplication and reuse for Clerk /v1/environment configuration requests.
 */

export const CLERK_SRI_HASHES: Record<string, string> = {
  "vendors_ui_e564da_1.41.2.js": "sha384-n1qf8LZfE2TLHN1Eh3B3t0LvQVqZYr/WKDzGzK1VwkhfLYrZRFinzvauGI4mHpFu",
  "signin_ui_e564da_1.41.2.js": "sha384-GDLSsBq/mg4LaXeEdaQhupD+AA2shJNiVW/V/pKRELWgrJmraK6qUH7O9qxkmGZq",
  "ui-common_ui_e564da_1.41.2.js": "sha384-GzvvsBBuxWU6/TxyU+PjVhiFtGBk5mPCFx0O4ewPfOGWoH16e8lvCL35MsBwNXRa",
};

export function applyScriptSRI(script: HTMLScriptElement, src: string): void {
  if (!script || !src) return;
  for (const [chunkName, hash] of Object.entries(CLERK_SRI_HASHES)) {
    if (src.includes(chunkName)) {
      if (!script.crossOrigin) {
        script.crossOrigin = "anonymous";
      }
      if (!script.integrity) {
        script.integrity = hash;
      }
      break;
    }
  }
}

export const SECURITY_RUNTIME_INLINE_SCRIPT = `
(function() {
  if (typeof window === 'undefined') return;
  var sriHashes = {
    'vendors_ui_e564da_1.41.2.js': 'sha384-n1qf8LZfE2TLHN1Eh3B3t0LvQVqZYr/WKDzGzK1VwkhfLYrZRFinzvauGI4mHpFu',
    'signin_ui_e564da_1.41.2.js': 'sha384-GDLSsBq/mg4LaXeEdaQhupD+AA2shJNiVW/V/pKRELWgrJmraK6qUH7O9qxkmGZq',
    'ui-common_ui_e564da_1.41.2.js': 'sha384-GzvvsBBuxWU6/TxyU+PjVhiFtGBk5mPCFx0O4ewPfOGWoH16e8lvCL35MsBwNXRa'
  };
  function applySRI(script, src) {
    if (!script || !src) return;
    for (var chunk in sriHashes) {
      if (src.indexOf(chunk) !== -1) {
        if (!script.crossOrigin) script.crossOrigin = 'anonymous';
        if (!script.integrity) script.integrity = sriHashes[chunk];
        break;
      }
    }
  }
  if (!window.__kouchd_sri_patched && typeof HTMLScriptElement !== 'undefined') {
    window.__kouchd_sri_patched = true;
    var srcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (srcDesc && srcDesc.set) {
      var origSet = srcDesc.set;
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        get: srcDesc.get,
        set: function(val) {
          applySRI(this, String(val));
          return origSet.call(this, val);
        },
        configurable: true,
        enumerable: true
      });
    }
    var origSetAttr = HTMLScriptElement.prototype.setAttribute;
    HTMLScriptElement.prototype.setAttribute = function(name, val) {
      if (typeof name === 'string' && name.toLowerCase() === 'src') {
        applySRI(this, String(val));
      }
      return origSetAttr.call(this, name, val);
    };
    if (typeof Node !== 'undefined') {
      var origAppend = Node.prototype.appendChild;
      Node.prototype.appendChild = function(node) {
        if (node && node.nodeName === 'SCRIPT' && node.src) {
          applySRI(node, node.src);
        }
        return origAppend.call(this, node);
      };
      var origInsert = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function(node, ref) {
        if (node && node.nodeName === 'SCRIPT' && node.src) {
          applySRI(node, node.src);
        }
        return origInsert.call(this, node, ref);
      };
    }
  }
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

  // 1. Deduplicate static Clerk /v1/environment requests
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

  // 2. Attach SRI and crossorigin to dynamically injected Clerk UI scripts
  const ScriptCtor = typeof window !== "undefined" ? window.HTMLScriptElement : undefined;
  if (ScriptCtor && !(window as unknown as { __kouchd_sri_patched?: boolean }).__kouchd_sri_patched) {
    (window as unknown as { __kouchd_sri_patched?: boolean }).__kouchd_sri_patched = true;

    const scriptProto = ScriptCtor.prototype;
    const srcDescriptor = Object.getOwnPropertyDescriptor(scriptProto, "src");
    if (srcDescriptor && srcDescriptor.set) {
      const originalSet = srcDescriptor.set;
      Object.defineProperty(scriptProto, "src", {
        get: srcDescriptor.get,
        set: function (this: HTMLScriptElement, val: string) {
          applyScriptSRI(this, String(val));
          return originalSet.call(this, val);
        },
        configurable: true,
        enumerable: true,
      });
    }

    const origSetAttribute = scriptProto.setAttribute;
    if (origSetAttribute) {
      scriptProto.setAttribute = function (this: HTMLScriptElement, name: string, val: string) {
        if (typeof name === "string" && name.toLowerCase() === "src") {
          applyScriptSRI(this, String(val));
        }
        return origSetAttribute.call(this, name, val);
      };
    }

    const NodeCtor = typeof window !== "undefined" ? (window as unknown as { Node?: typeof Node }).Node : undefined;
    if (NodeCtor) {
      const origAppendChild = NodeCtor.prototype.appendChild;
      if (origAppendChild) {
        NodeCtor.prototype.appendChild = function <T extends Node>(this: Node, node: T): T {
          if (node && node.nodeName === "SCRIPT" && "src" in node && typeof (node as unknown as HTMLScriptElement).src === "string") {
            applyScriptSRI(node as unknown as HTMLScriptElement, (node as unknown as HTMLScriptElement).src);
          }
          return origAppendChild.call(this, node) as T;
        };
      }

      const origInsertBefore = NodeCtor.prototype.insertBefore;
      if (origInsertBefore) {
        NodeCtor.prototype.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
          if (node && node.nodeName === "SCRIPT" && "src" in node && typeof (node as unknown as HTMLScriptElement).src === "string") {
            applyScriptSRI(node as unknown as HTMLScriptElement, (node as unknown as HTMLScriptElement).src);
          }
          return origInsertBefore.call(this, node, ref) as T;
        };
      }
    }
  }
}
