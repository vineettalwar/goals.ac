import type { MetadataRoute } from "next";
import { db } from "@workspace/db";
import { roadmapsTable, seoArticlesTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { LEARN_POSTS } from "@/lib/marketing/learn-posts";
import { HELP_ARTICLES } from "@/lib/marketing/help-articles";
import { MARKETING_CASE_STUDIES } from "@/lib/marketing/case-studies";
import { getSiteUrl } from "@/lib/marketing/site-url";

const STATIC_PATHS = [
  "/",
  "/pricing",
  "/features",
  "/about",
  "/contact",
  "/solutions",
  "/learn",
  "/help",
  "/roadmaps",
  "/geo-audit",
  "/article-quality",
  "/free-tools",
  "/content-engine",
  "/content-strategy",
  "/content-autopilot",
  "/generative-engine-optimization",
  "/llm-visibility",
  "/rank-on-chatgpt",
  "/for-agencies",
  "/cms-publishing",
  "/link-building",
  "/multilingual-content",
  "/product-roadmap",
  "/reddit-visibility",
  "/social-distribution",
  "/search-analytics",
  "/brand-voice",
  "/platform-integrations",
  "/success-stories",
  "/compare/ai-seo-tools",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  let roadmapEntries: MetadataRoute.Sitemap = [];
  try {
    const roadmaps = await db
      .select({ slug: roadmapsTable.slug, updatedAt: roadmapsTable.updatedAt })
      .from(roadmapsTable)
      .orderBy(desc(roadmapsTable.updatedAt))
      .limit(500);

    roadmapEntries = roadmaps.map((r) => ({
      url: `${base}/roadmap/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable at build time
  }

  const learnEntries: MetadataRoute.Sitemap = LEARN_POSTS.map((post) => ({
    url: `${base}/learn/${post.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  const helpEntries: MetadataRoute.Sitemap = HELP_ARTICLES.map((article) => ({
    url: `${base}/help/${article.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.55,
  }));

  const caseStudyEntries: MetadataRoute.Sitemap = MARKETING_CASE_STUDIES.map((study) => ({
    url: `${base}/success-stories/${study.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  let seoArticleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await db
      .select({ id: seoArticlesTable.id, createdAt: seoArticlesTable.createdAt })
      .from(seoArticlesTable)
      .orderBy(desc(seoArticlesTable.createdAt))
      .limit(200);

    seoArticleEntries = articles.map((a) => ({
      url: `${base}/seo-article/${a.id}`,
      lastModified: a.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch {
    // DB unavailable at build time
  }

  return [...staticEntries, ...roadmapEntries, ...learnEntries, ...helpEntries, ...caseStudyEntries, ...seoArticleEntries];
}
