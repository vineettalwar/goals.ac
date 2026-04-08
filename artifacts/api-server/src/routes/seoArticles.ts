import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateSeoArticleContent } from "../services/seoContentGenerator";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/seo-articles/generate", async (req, res) => {
  try {
    const { brand_name, website_url, industry, location, stage, roadmap_id } = req.body as Record<string, unknown>;

    if (!brand_name || !website_url || !industry || !location || !stage) {
      return res.status(400).json({ error: "Missing required fields: brand_name, website_url, industry, location, stage" });
    }

    const articleContent = await generateSeoArticleContent(
      brand_name as string,
      website_url as string,
      industry as string,
      location as string,
      stage as string,
    );

    const wordCount = articleContent.content.split(/\s+/).filter(Boolean).length;
    const roadmapIdNum = roadmap_id ? Number(roadmap_id) : null;

    const [inserted] = await db
      .insert(seoArticlesTable)
      .values({
        roadmapId: roadmapIdNum,
        brandName: brand_name as string,
        websiteUrl: website_url as string,
        industry: industry as string,
        location: location as string,
        stage: stage as string,
        title: articleContent.title,
        metaDescription: articleContent.meta_description,
        primaryKeyword: articleContent.primary_keyword,
        secondaryKeywords: articleContent.secondary_keywords,
        content: articleContent.content,
        wordCount,
        status: "draft",
      })
      .returning();

    return res.status(201).json(inserted);
  } catch (err) {
    logger.error({ err }, "Failed to generate SEO article");
    return res.status(503).json({ error: "Failed to generate SEO article. Please try again." });
  }
});

router.get("/seo-articles", async (req, res) => {
  try {
    const roadmapIdParam = req.query.roadmap_id;
    const roadmapId = roadmapIdParam ? Number(roadmapIdParam) : undefined;

    const articles = roadmapId
      ? await db
          .select()
          .from(seoArticlesTable)
          .where(eq(seoArticlesTable.roadmapId, roadmapId))
          .orderBy(desc(seoArticlesTable.createdAt))
      : await db
          .select()
          .from(seoArticlesTable)
          .orderBy(desc(seoArticlesTable.createdAt));

    return res.json(articles);
  } catch (err) {
    logger.error({ err }, "Failed to list SEO articles");
    return res.status(500).json({ error: "Failed to fetch SEO articles" });
  }
});

router.get("/seo-articles/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }

    const [article] = await db
      .select()
      .from(seoArticlesTable)
      .where(eq(seoArticlesTable.id, id));

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    return res.json(article);
  } catch (err) {
    logger.error({ err }, "Failed to fetch SEO article");
    return res.status(500).json({ error: "Failed to fetch SEO article" });
  }
});

export default router;
