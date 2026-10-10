const productionAppOrigin = "https://app.kouchd.com";

export const APP_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : productionAppOrigin)
).replace(/\/+$/, "");

export function isAppHost(host: string | null | undefined): boolean {
  const normalizedHost = host?.split(",")[0]?.trim().toLowerCase().split(":")[0];
  return normalizedHost === "app.kouchd.com";
}
