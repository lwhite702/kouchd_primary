import { clerkMiddleware } from "@clerk/nextjs/server";

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
  ],
});

export const config = {
  matcher: [
    "/((?!_next|\\.well-known|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
