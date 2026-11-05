/**
 * Chooses which landing page a signed-out visitor sees at `/`, based on where
 * they came from. An explicit `?landing=` override wins (handy for QA and
 * for links we hand out), then `utm_source`, then the default start page.
 */

export type LandingVariant = "start" | "simple";

/** utm_source values (lowercase) that open the simplified landing page. */
export const SIMPLE_LANDING_SOURCES: readonly string[] = ["simple", "newsletter", "sms", "qr"];

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim().toLowerCase() || undefined;
}

export function chooseLandingVariant(
  searchParams: SearchParams,
  simpleSources: readonly string[] = SIMPLE_LANDING_SOURCES,
): LandingVariant {
  const override = first(searchParams.landing);
  if (override === "start" || override === "simple") return override;
  const source = first(searchParams.utm_source);
  return source && simpleSources.includes(source) ? "simple" : "start";
}
