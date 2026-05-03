import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { seoArticlesTable, websiteProjectsTable } from "@workspace/db";
import type { ContentStyle } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { generateSeoArticleContent, generateSeoArticleContentStream } from "../services/seoContentGenerator";
import { logger } from "../lib/logger";
import { optionalAuth, requireAuth } from "../lib/auth";
import { getDecryptedUserGeminiKey } from "../lib/userApiKey";

const router: IRouter = Router();

router.post("/seo-articles/generate/stream", optionalAuth, async (req, res) => {
  try {
    const { brand_name, website_url, industry, location, stage, roadmap_id, website_project_id } = req.body as Record<string, unknown>;

    if (!brand_name || !website_url || !industry || !location || !stage) {
      res.status(400).json({ error: "Missing required fields: brand_name, website_url, industry, location, stage" });
      return;
    }

    let validatedProjectId: number | null = null;
    let projectContentStyle: ContentStyle | null = null;
    if (website_project_id && req.user) {
      const projectIdNum = Number(website_project_id);
      const [proj] = await db
        .select({ id: websiteProjectsTable.id, contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(and(eq(websiteProjectsTable.id, projectIdNum), eq(websiteProjectsTable.userId, req.user.userId)))
        .limit(1);
      if (!proj) { res.status(403).json({ error: "You do not have access to this project" }); return; }
      validatedProjectId = projectIdNum;
      projectContentStyle = proj.contentStyle as ContentStyle | null;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* closed */ }
    };

    const userApiKey = req.user ? await getDecryptedUserGeminiKey(req.user.userId) : null;

    let articleContent;
    try {
      articleContent = await generateSeoArticleContentStream(
        brand_name as string,
        website_url as string,
        industry as string,
        location as string,
        stage as string,
        (chunk) => sendEvent("chunk", { text: chunk }),
        userApiKey,
        projectContentStyle,
      );
    } catch (err) {
      logger.error({ err }, "Failed to stream SEO article");
      sendEvent("error", { error: "SEO article generation temporarily unavailable. Please try again." });
      res.end();
      return;
    }

    const wordCount = articleContent.content.split(/\s+/).filter(Boolean).length;
    const roadmapIdNum = roadmap_id ? Number(roadmap_id) : null;

    const [inserted] = await db
      .insert(seoArticlesTable)
      .values({
        roadmapId: roadmapIdNum,
        websiteProjectId: validatedProjectId,
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

    sendEvent("done", inserted);
    res.end();
  } catch (err) {
    logger.error({ err }, "Failed to stream SEO article");
    try { res.write(`event: error\ndata: ${JSON.stringify({ error: "Internal server error" })}\n\n`); res.end(); } catch { /* closed */ }
  }
});

router.post("/seo-articles/generate", optionalAuth, async (req, res) => {
  try {
    const { brand_name, website_url, industry, location, stage, roadmap_id, website_project_id } = req.body as Record<string, unknown>;

    if (!brand_name || !website_url || !industry || !location || !stage) {
      return res.status(400).json({ error: "Missing required fields: brand_name, website_url, industry, location, stage" });
    }

    let validatedProjectId: number | null = null;
    let projectContentStyle: ContentStyle | null = null;

    if (website_project_id && req.user) {
      const projectIdNum = Number(website_project_id);
      const [proj] = await db
        .select({ id: websiteProjectsTable.id, contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(and(eq(websiteProjectsTable.id, projectIdNum), eq(websiteProjectsTable.userId, req.user.userId)))
        .limit(1);
      if (!proj) {
        return res.status(403).json({ error: "You do not have access to this project" });
      }
      validatedProjectId = projectIdNum;
      projectContentStyle = proj.contentStyle as ContentStyle | null;
    }

    const userApiKey = req.user ? await getDecryptedUserGeminiKey(req.user.userId) : null;

    const articleContent = await generateSeoArticleContent(
      brand_name as string,
      website_url as string,
      industry as string,
      location as string,
      stage as string,
      userApiKey,
      projectContentStyle,
    );

    const wordCount = articleContent.content.split(/\s+/).filter(Boolean).length;
    const roadmapIdNum = roadmap_id ? Number(roadmap_id) : null;

    const [inserted] = await db
      .insert(seoArticlesTable)
      .values({
        roadmapId: roadmapIdNum,
        websiteProjectId: validatedProjectId,
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

router.get("/seo-articles", requireAuth, async (req, res) => {
  try {
    const userProjects = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, req.user!.userId));

    const projectIds = userProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return res.json([]);
    }

    const articles = await db
      .select()
      .from(seoArticlesTable)
      .where(inArray(seoArticlesTable.websiteProjectId, projectIds))
      .orderBy(desc(seoArticlesTable.createdAt));

    return res.json(articles);
  } catch (err) {
    logger.error({ err }, "Failed to list SEO articles");
    return res.status(500).json({ error: "Failed to fetch SEO articles" });
  }
});

router.get("/seo-articles/:id", optionalAuth, async (req, res) => {
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

    if (article.websiteProjectId) {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const [proj] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(and(eq(websiteProjectsTable.id, article.websiteProjectId), eq(websiteProjectsTable.userId, req.user.userId)))
        .limit(1);
      if (!proj) {
        return res.status(403).json({ error: "You do not have access to this article" });
      }
    }

    return res.json(article);
  } catch (err) {
    logger.error({ err }, "Failed to fetch SEO article");
    return res.status(500).json({ error: "Failed to fetch SEO article" });
  }
});

export default router;
