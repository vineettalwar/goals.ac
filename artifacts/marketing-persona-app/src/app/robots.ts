import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

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
          "/autopilot",
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
