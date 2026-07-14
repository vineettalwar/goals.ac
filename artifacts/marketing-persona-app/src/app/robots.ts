import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/marketing/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/projects",
          "/strategy",
          "/search",
          "/audit",
          "/research",
          "/integrations",
          "/settings",
          "/studio",
          "/onboarding",
          "/admin",
          "/content-piece",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
