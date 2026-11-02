import { clerkMiddleware } from "@clerk/nextjs/server";
import { cspDirectives } from "./lib/security/csp";

const vercelOrigin = process.env.VERCEL_URL
  ? process.env.VERCEL_URL.startsWith("http")
    ? process.env.VERCEL_URL
    : `https://${process.env.VERCEL_URL}`
  : null;

export default clerkMiddleware({
  authorizedParties: [
    "https://kouchd.com",
    "https://www.kouchd.com",
    "https://app.kouchd.com",
    ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
    ...(vercelOrigin ? [vercelOrigin] : []),
    // Previews use the production Clerk instance, which only serves kouchd.com
    // hosts, so the preview branch domain is attached in Vercel as preview.kouchd.com.
    ...(process.env.VERCEL_ENV === "preview" ? ["https://preview.kouchd.com"] : []),
  ],
  contentSecurityPolicy: { directives: cspDirectives },
});

export const config = {
  matcher: [
    "/((?!_next|ingest(?:/|$)|\\.well-known|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
