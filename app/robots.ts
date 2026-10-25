import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/brand",
          "/privacy",
          "/terms",
          "/sms-opt-in",
          "/acceptable-use",
          "/cookies",
          "/legal/",
        ],
        disallow: [
          "/api",
          "/console",
          "/platform",
          "/sign-in",
          "/sign-up",
          "/invite",
          "/_next",
        ],
      },
    ],
    sitemap: "https://kouchd.com/sitemap.xml",
  };
}
