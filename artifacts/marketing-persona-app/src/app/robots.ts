import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/marketing/site/site-url";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (process.env.MARKETING_STATIC === "1") {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

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
