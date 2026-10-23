/** Keep invitation tokens, account paths and query values out of telemetry. */
export function analyticsRoute(pathname: string) {
  if (pathname.startsWith("/invite/")) return "/invite/:token";
  return new Set([
    "/",
    "/about",
    "/pricing",
    "/privacy",
    "/terms",
    "/cookies",
    "/acceptable-use",
    "/sms-opt-in",
    "/sign-in",
    "/sign-up",
  ]).has(pathname)
    ? pathname
    : "/app";
}

export function telemetryUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${analyticsRoute(url.pathname)}`;
  } catch {
    return "";
  }
}

export function scrubErrorEvent<
  T extends {
    transaction?: string;
    spans?: Array<{ data?: Record<string, unknown>; description?: string }>;
    request?: {
      url?: string;
      headers?: Record<string, string>;
      cookies?: unknown;
      data?: unknown;
      query_string?: unknown;
      env?: unknown;
    };
    breadcrumbs?: Array<{ data?: Record<string, unknown> }>;
    user?: unknown;
    extra?: unknown;
  },
>(event: T): T {
  if (event.request) {
    if (event.request.url) event.request.url = telemetryUrl(event.request.url);
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    delete event.request.env;
  }
  delete event.user;
  delete event.extra;
  if (event.transaction) {
    const method =
      event.transaction.match(
        /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/,
      )?.[0] ?? "";
    const location = event.transaction.slice(method.length);
    event.transaction =
      method +
      (location.startsWith("/")
        ? analyticsRoute(location.split(/[?#]/)[0])
        : "/app");
  }
  for (const crumb of event.breadcrumbs ?? [])
    scrubTelemetryProperties(crumb.data);
  for (const span of event.spans ?? []) {
    scrubTelemetryProperties(span.data);
    if (span.description) span.description = "request";
  }
  return event;
}

/** Scrub automatic SDK location fields, including nested person properties. */
export function scrubTelemetryProperties(
  bag?: Record<string, unknown>,
  depth = 0,
) {
  if (!bag || depth > 4) return;
  for (const [key, value] of Object.entries(bag)) {
    if (/^(headers|cookies|body|requestBody|query_string|env)$/i.test(key)) {
      delete bag[key];
      continue;
    }
    if (typeof value === "string") {
      if (/url|href|referrer/i.test(key))
        bag[key] = value.startsWith("/")
          ? analyticsRoute(value.split(/[?#]/)[0])
          : telemetryUrl(value);
      else if (/pathname/i.test(key) || key === "from" || key === "to")
        bag[key] = analyticsRoute(value.split(/[?#]/)[0]);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      scrubTelemetryProperties(value as Record<string, unknown>, depth + 1);
    }
  }
}
