import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  websiteProjectsTable,
  brandProfilesTable,
  CONTENT_FORMAT_TYPES,
  type ContentFormatType,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { marked } from "marked";
import { requireAuth } from "../lib/auth";
import { assertPublicUrl } from "../lib/ssrf-guard";
import { generateContentPiece, generateContentPieceStream, repurposeContentPiece, buildCacheKey, cacheGet, cacheSet, type BrandContext } from "../services/contentStudioGenerator";
import { logger } from "../lib/logger";
import { getDecryptedUserGeminiKey } from "../lib/userApiKey";
import { encryptApiKey, decryptApiKey } from "../lib/encryption";
import { publishToNotion } from "../services/notionPublisher";
import { publishToWebflow } from "../services/webflowPublisher";

interface CmsIntegrationCredentials {
  notion?: {
    integrationToken: string;
    databaseId: string;
  };
  webflow?: {
    apiToken: string;
    collectionId: string;
    bodyFieldSlug: string;
  };
}

function encryptCmsCredentials(creds: CmsIntegrationCredentials): CmsIntegrationCredentials {
  const result: CmsIntegrationCredentials = {};
  if (creds.notion) {
    result.notion = {
      integrationToken: encryptApiKey(creds.notion.integrationToken),
      databaseId: creds.notion.databaseId,
    };
  }
  if (creds.webflow) {
    result.webflow = {
      apiToken: encryptApiKey(creds.webflow.apiToken),
      collectionId: creds.webflow.collectionId,
      bodyFieldSlug: creds.webflow.bodyFieldSlug,
    };
  }
  return result;
}

function decryptCmsCredentials(stored: CmsIntegrationCredentials): CmsIntegrationCredentials {
  const result: CmsIntegrationCredentials = {};
  if (stored.notion) {
    try {
      result.notion = {
        integrationToken: decryptApiKey(stored.notion.integrationToken),
        databaseId: stored.notion.databaseId,
      };
    } catch {
      result.notion = stored.notion;
    }
  }
  if (stored.webflow) {
    try {
      result.webflow = {
        apiToken: decryptApiKey(stored.webflow.apiToken),
        collectionId: stored.webflow.collectionId,
        bodyFieldSlug: stored.webflow.bodyFieldSlug,
      };
    } catch {
      result.webflow = stored.webflow;
    }
  }
  return result;
}

function maskCmsCredentials(decrypted: CmsIntegrationCredentials): object {
  const result: Record<string, unknown> = {};
  if (decrypted.notion) {
    const tok = decrypted.notion.integrationToken;
    result.notion = {
      connected: true,
      databaseId: decrypted.notion.databaseId,
      integrationTokenHint: tok.length > 8 ? `...${tok.slice(-4)}` : "****",
    };
  }
  if (decrypted.webflow) {
    const tok = decrypted.webflow.apiToken;
    result.webflow = {
      connected: true,
      collectionId: decrypted.webflow.collectionId,
      bodyFieldSlug: decrypted.webflow.bodyFieldSlug,
      apiTokenHint: tok.length > 8 ? `...${tok.slice(-4)}` : "****",
    };
  }
  return result;
}

const router: IRouter = Router();

const GenerateBody = z.object({
  formatType: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  targetKeyword: z.string().min(1, "Target keyword is required"),
  angleHint: z.string().optional(),
});

const ALLOWED_STATUSES = ["draft", "ready", "published"] as const;

const PATCH_STATUSES = ["draft", "ready"] as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const UpdateBody = z.object({
  title: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  status: z.enum(PATCH_STATUSES).optional(),
  plannedDate: z.string().regex(ISO_DATE_RE, "plannedDate must be a valid ISO date (YYYY-MM-DD)").nullable().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: "Request body must include at least one field to update" },
);

router.post("/website-projects/:id/content-pieces/generate", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const parsed = GenerateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { formatType, targetKeyword, angleHint } = parsed.data;

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    const brand = {
      companyName: brandProfile?.companyName ?? project.name,
      websiteUrl: project.url,
      industry: brandProfile?.industry ?? "",
      targetAudience: brandProfile?.targetAudience ?? "",
      voiceTone: brandProfile?.voiceTone ?? "",
      primaryKeywords: brandProfile?.primaryKeywords ?? [],
      contentStyle: project.contentStyle ?? null,
    };

    const bypassCache = req.headers["x-bypass-cache"] === "true";
    const cacheKeyStr = buildCacheKey(formatType, targetKeyword, brand, angleHint);

    if (!bypassCache) {
      const [existing] = await db
        .select()
        .from(contentPiecesTable)
        .where(and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.cacheKey, cacheKeyStr)))
        .limit(1);
      if (existing) {
        logger.info({ formatType, targetKeyword }, "Content piece served from DB cache");
        res.setHeader("X-Cache", "HIT");
        res.status(200).json(existing);
        return;
      }
    }

    const userApiKey = await getDecryptedUserGeminiKey(req.user!.userId);
    const result = await generateContentPiece(formatType as ContentFormatType, brand, targetKeyword, angleHint, bypassCache, userApiKey);
    const wordCount = result.body_markdown.split(/\s+/).filter(Boolean).length;

    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: projectId,
        formatType: formatType as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount,
        status: "draft",
        cacheKey: cacheKeyStr,
      })
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    logger.error({ err }, "Failed to generate content piece");
    res.status(503).json({ error: "Failed to generate content. Please try again." });
  }
});

router.post("/website-projects/:id/content-pieces/generate/stream", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const parsed = GenerateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }); return; }

  const { formatType, targetKeyword, angleHint } = parsed.data;

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    const brand: BrandContext = {
      companyName: brandProfile?.companyName ?? project.name,
      websiteUrl: project.url,
      industry: brandProfile?.industry ?? "",
      targetAudience: brandProfile?.targetAudience ?? "",
      voiceTone: brandProfile?.voiceTone ?? "",
      primaryKeywords: brandProfile?.primaryKeywords ?? [],
      contentStyle: project.contentStyle ?? null,
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const bypassCache = req.headers["x-bypass-cache"] === "true";
    const userApiKey = await getDecryptedUserGeminiKey(req.user!.userId);
    const cacheKeyStr = buildCacheKey(formatType, targetKeyword, brand, angleHint);

    if (!bypassCache) {
      const [existing] = await db
        .select()
        .from(contentPiecesTable)
        .where(and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.cacheKey, cacheKeyStr)))
        .limit(1);
      if (existing) {
        logger.info({ formatType, targetKeyword }, "Content piece streaming served from DB cache");
        sendEvent("cached", existing);
        res.end();
        return;
      }
    }

    if (!bypassCache) {
      const aiCached = await cacheGet(cacheKeyStr);
      if (aiCached) {
        logger.info({ formatType, targetKeyword }, "Content piece streaming served from AI cache");
        sendEvent("chunk", { text: aiCached.body_markdown });
        const wordCount = aiCached.body_markdown.split(/\s+/).filter(Boolean).length;
        const [inserted] = await db
          .insert(contentPiecesTable)
          .values({
            websiteProjectId: projectId,
            formatType: formatType as ContentFormatType,
            title: aiCached.title,
            targetKeyword: aiCached.target_keyword,
            bodyMarkdown: aiCached.body_markdown,
            wordCount,
            status: "draft",
            cacheKey: cacheKeyStr,
          })
          .returning();
        sendEvent("done", inserted);
        res.end();
        return;
      }
    }

    let result;
    try {
      result = await generateContentPieceStream(
        formatType as ContentFormatType,
        brand,
        targetKeyword,
        (chunk) => sendEvent("chunk", { text: chunk }),
        angleHint,
        userApiKey,
      );
    } catch (streamErr) {
      logger.warn({ streamErr }, "Streaming generation exhausted retries, falling back to non-streaming");
      result = await generateContentPiece(
        formatType as ContentFormatType, brand, targetKeyword, angleHint, true, userApiKey,
      );
    }

    await cacheSet(cacheKeyStr, result);

    const wordCount = result.body_markdown.split(/\s+/).filter(Boolean).length;
    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: projectId,
        formatType: formatType as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount,
        status: "draft",
        cacheKey: cacheKeyStr,
      })
      .returning();

    sendEvent("done", inserted);
    res.end();
  } catch (err) {
    logger.error({ err }, "Failed to stream content piece");
    try { res.write(`event: error\ndata: ${JSON.stringify({ error: "Generation failed. Please try again." })}\n\n`); res.end(); } catch { /* already closed */ }
  }
});

router.get("/website-projects/:id/content-pieces", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const statusFilter = typeof req.query.status === "string" && ALLOWED_STATUSES.includes(req.query.status as typeof ALLOWED_STATUSES[number])
    ? req.query.status as typeof ALLOWED_STATUSES[number]
    : null;

  try {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const whereClause = statusFilter
      ? and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.status, statusFilter))
      : eq(contentPiecesTable.websiteProjectId, projectId);

    const pieces = await db
      .select()
      .from(contentPiecesTable)
      .where(whereClause)
      .orderBy(desc(contentPiecesTable.createdAt));

    res.json(pieces);
  } catch (err) {
    logger.error({ err }, "Failed to list content pieces");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/content-pieces/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) {
      res.status(404).json({ error: "Content piece not found" });
      return;
    }

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json(piece);
  } catch (err) {
    logger.error({ err }, "Failed to get content piece");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/content-pieces/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) {
      res.status(404).json({ error: "Content piece not found" });
      return;
    }

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.bodyMarkdown !== undefined) {
      updates.bodyMarkdown = parsed.data.bodyMarkdown;
      updates.wordCount = parsed.data.bodyMarkdown.split(/\s+/).filter(Boolean).length;
    }
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.plannedDate !== undefined) updates.plannedDate = parsed.data.plannedDate;

    const [updated] = await db
      .update(contentPiecesTable)
      .set(updates)
      .where(eq(contentPiecesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update content piece");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/content-pieces/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) {
      res.status(404).json({ error: "Content piece not found" });
      return;
    }

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    await db.delete(contentPiecesTable).where(eq(contentPiecesTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete content piece");
    res.status(500).json({ error: "Internal server error" });
  }
});

const PublishBody = z.object({
  wpSiteUrl: z.string().url("Must be a valid WordPress site URL"),
  wpUsername: z.string().min(1, "WordPress username is required"),
  wpAppPassword: z.string().min(1, "WordPress application password is required"),
});

router.post("/content-pieces/:id/publish", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = PublishBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { wpSiteUrl, wpUsername, wpAppPassword } = parsed.data;

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) {
      res.status(404).json({ error: "Content piece not found" });
      return;
    }

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const siteBase = wpSiteUrl.replace(/\/$/, "");
    const wpApiUrl = `${siteBase}/wp-json/wp/v2/posts`;

    try {
      await assertPublicUrl(siteBase);
    } catch (ssrfErr) {
      res.status(400).json({ error: ssrfErr instanceof Error ? ssrfErr.message : "Invalid WordPress site URL" });
      return;
    }

    const htmlContent = await marked(piece.bodyMarkdown);
    const basicAuth = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64");

    let wpRes: Response;
    try {
      wpRes = await fetch(wpApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          title: piece.title,
          content: htmlContent,
          status: "publish",
        }),
      });
    } catch (fetchErr) {
      req.log.error({ fetchErr }, "Network error reaching WordPress API");
      res.status(502).json({ error: "Could not reach your WordPress site. Check the URL and try again." });
      return;
    }

    if (!wpRes.ok) {
      const wpBody = await wpRes.json().catch(() => ({})) as { message?: string; code?: string };
      req.log.warn({ status: wpRes.status, wpBody }, "WordPress API returned error");
      if (wpRes.status === 401 || wpRes.status === 403) {
        res.status(401).json({ error: "WordPress authentication failed. Check your username and application password." });
      } else {
        res.status(502).json({ error: wpBody.message ?? "WordPress rejected the publish request." });
      }
      return;
    }

    const wpPost = await wpRes.json() as { link?: string; id?: number };
    const publishedUrl = wpPost.link ?? `${siteBase}/?p=${wpPost.id}`;

    const [updated] = await db
      .update(contentPiecesTable)
      .set({ status: "published", publishedUrl })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to publish content piece");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/content-pieces/:id/regenerate", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) {
      res.status(404).json({ error: "Content piece not found" });
      return;
    }

    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, piece.websiteProjectId))
      .limit(1);

    const brand = {
      companyName: brandProfile?.companyName ?? project.name,
      websiteUrl: project.url,
      industry: brandProfile?.industry ?? "",
      targetAudience: brandProfile?.targetAudience ?? "",
      voiceTone: brandProfile?.voiceTone ?? "",
      primaryKeywords: brandProfile?.primaryKeywords ?? [],
      contentStyle: project.contentStyle ?? null,
    };

    const result = await generateContentPiece(piece.formatType as ContentFormatType, brand, piece.targetKeyword, undefined, true);
    const wordCount = result.body_markdown.split(/\s+/).filter(Boolean).length;

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        title: result.title,
        bodyMarkdown: result.body_markdown,
        wordCount,
        status: "draft",
      })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to regenerate content piece");
    res.status(503).json({ error: "Failed to regenerate content. Please try again." });
  }
});

const RepurposeFromTextBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().min(50, "Existing content must be at least 50 characters"),
  targetKeyword: z.string().min(1, "Target keyword is required"),
});

router.post("/website-projects/:id/content-pieces/repurpose", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const parsed = RepurposeFromTextBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }); return; }

  const { targetFormat, existingContent, targetKeyword } = parsed.data;

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    const brand: BrandContext = {
      companyName: brandProfile?.companyName ?? project.name,
      websiteUrl: project.url,
      industry: brandProfile?.industry ?? "",
      targetAudience: brandProfile?.targetAudience ?? "",
      voiceTone: brandProfile?.voiceTone ?? "",
      primaryKeywords: brandProfile?.primaryKeywords ?? [],
      contentStyle: project.contentStyle ?? null,
    };

    const userApiKey = await getDecryptedUserGeminiKey(req.user!.userId);
    const result = await repurposeContentPiece(
      targetFormat as ContentFormatType,
      brand,
      existingContent,
      targetKeyword,
      userApiKey,
    );

    const wordCount = result.body_markdown.split(/\s+/).filter(Boolean).length;
    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: projectId,
        formatType: targetFormat as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount,
        status: "draft",
      })
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    logger.error({ err }, "Failed to repurpose content from text");
    res.status(503).json({ error: "Failed to repurpose content. Please try again." });
  }
});

const RepurposeBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().min(50, "Existing content must be at least 50 characters").optional(),
});

router.post("/content-pieces/:id/repurpose/stream", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = RepurposeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }); return; }

  const { targetFormat, existingContent: bodyOverride } = parsed.data;

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) { res.status(404).json({ error: "Content piece not found" }); return; }

    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(403).json({ error: "Access denied" }); return; }

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, piece.websiteProjectId))
      .limit(1);

    const brand: BrandContext = {
      companyName: brandProfile?.companyName ?? project.name,
      websiteUrl: project.url,
      industry: brandProfile?.industry ?? "",
      targetAudience: brandProfile?.targetAudience ?? "",
      voiceTone: brandProfile?.voiceTone ?? "",
      primaryKeywords: brandProfile?.primaryKeywords ?? [],
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent("step", { step: "analyzing", label: "Analyzing source content" });

    const sourceContent = bodyOverride ?? piece.bodyMarkdown;
    const userApiKey = await getDecryptedUserGeminiKey(req.user!.userId);

    sendEvent("step", { step: "generating", label: "Generating repurposed content" });

    const result = await repurposeContentPiece(
      targetFormat as ContentFormatType,
      brand,
      sourceContent,
      piece.targetKeyword,
      userApiKey,
    );

    sendEvent("step", { step: "saving", label: "Saving new piece" });

    const wordCount = result.body_markdown.split(/\s+/).filter(Boolean).length;
    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: piece.websiteProjectId,
        formatType: targetFormat as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount,
        status: "draft",
      })
      .returning();

    sendEvent("done", inserted);
    res.end();
  } catch (err) {
    logger.error({ err }, "Failed to stream repurpose content piece");
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err instanceof Error ? err.message : "Failed to repurpose content" })}\n\n`);
      res.end();
    } catch { /* already ended */ }
  }
});

router.post("/content-pieces/:id/repurpose", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = RepurposeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { targetFormat, existingContent: bodyOverride } = parsed.data;

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) {
      res.status(404).json({ error: "Content piece not found" });
      return;
    }

    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, piece.websiteProjectId))
      .limit(1);

    const brand: BrandContext = {
      companyName: brandProfile?.companyName ?? project.name,
      websiteUrl: project.url,
      industry: brandProfile?.industry ?? "",
      targetAudience: brandProfile?.targetAudience ?? "",
      voiceTone: brandProfile?.voiceTone ?? "",
      primaryKeywords: brandProfile?.primaryKeywords ?? [],
      contentStyle: project.contentStyle ?? null,
    };

    const sourceContent = bodyOverride ?? piece.bodyMarkdown;
    const userApiKey = await getDecryptedUserGeminiKey(req.user!.userId);

    const result = await repurposeContentPiece(
      targetFormat as ContentFormatType,
      brand,
      sourceContent,
      piece.targetKeyword,
      userApiKey,
    );

    const wordCount = result.body_markdown.split(/\s+/).filter(Boolean).length;

    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: piece.websiteProjectId,
        formatType: targetFormat as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount,
        status: "draft",
      })
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    logger.error({ err }, "Failed to repurpose content piece");
    res.status(503).json({ error: "Failed to repurpose content. Please try again." });
  }
});

router.get("/user/cms-summary", requireAuth, async (req, res) => {
  try {
    const projects = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, req.user!.userId));

    let hasNotion = false;
    let hasWebflow = false;

    for (const p of projects) {
      const stored = (p.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
      if (stored.notion) hasNotion = true;
      if (stored.webflow) hasWebflow = true;
      if (hasNotion && hasWebflow) break;
    }

    res.json({ notion: hasNotion, webflow: hasWebflow });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch CMS summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/website-projects/:id/cms-integrations/test", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  try {
    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const stored = (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
    const creds = decryptCmsCredentials(stored);

    const health: Record<string, { ok: boolean; error?: string }> = {};

    if (creds.notion) {
      try {
        await assertPublicUrl("https://api.notion.com");
        const testRes = await fetch(`https://api.notion.com/v1/databases/${creds.notion.databaseId}`, {
          headers: {
            Authorization: `Bearer ${creds.notion.integrationToken}`,
            "Notion-Version": "2022-06-28",
          },
        });
        if (testRes.ok) {
          health.notion = { ok: true };
        } else if (testRes.status === 401) {
          health.notion = { ok: false, error: "Invalid integration token" };
        } else if (testRes.status === 404) {
          health.notion = { ok: false, error: "Database not found or not shared with integration" };
        } else {
          health.notion = { ok: false, error: `Notion API error: ${testRes.status}` };
        }
      } catch (err) {
        health.notion = { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
      }
    }

    if (creds.webflow) {
      try {
        await assertPublicUrl("https://api.webflow.com");
        const testRes = await fetch(`https://api.webflow.com/v2/collections/${creds.webflow.collectionId}`, {
          headers: {
            Authorization: `Bearer ${creds.webflow.apiToken}`,
            accept: "application/json",
          },
        });
        if (testRes.ok) {
          health.webflow = { ok: true };
        } else if (testRes.status === 401 || testRes.status === 403) {
          health.webflow = { ok: false, error: "Invalid API token" };
        } else if (testRes.status === 404) {
          health.webflow = { ok: false, error: "Collection not found" };
        } else {
          health.webflow = { ok: false, error: `Webflow API error: ${testRes.status}` };
        }
      } catch (err) {
        health.webflow = { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
      }
    }

    res.json(health);
  } catch (err) {
    req.log.error({ err }, "Failed to test CMS integrations");
    res.status(500).json({ error: "Internal server error" });
  }
});

const CmsIntegrationsBody = z.object({
  notion: z.object({
    integrationToken: z.string().min(1, "Notion integration token is required"),
    databaseId: z.string().min(1, "Notion database ID is required"),
  }).optional(),
  webflow: z.object({
    apiToken: z.string().min(1, "Webflow API token is required"),
    collectionId: z.string().min(1, "Webflow collection ID is required"),
    bodyFieldSlug: z.string().min(1, "Body field slug is required").default("post-body"),
  }).optional(),
});

router.get("/website-projects/:id/cms-integrations", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  try {
    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    if (!project.cmsIntegrations) {
      res.json({});
      return;
    }

    const stored = project.cmsIntegrations as CmsIntegrationCredentials;
    const decrypted = decryptCmsCredentials(stored);
    res.json(maskCmsCredentials(decrypted));
  } catch (err) {
    req.log.error({ err }, "Failed to get CMS integrations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/website-projects/:id/cms-integrations", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }

  const parsed = CmsIntegrationsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }); return; }

  try {
    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const existing = (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
    const existingDecrypted = decryptCmsCredentials(existing);

    const merged: CmsIntegrationCredentials = { ...existingDecrypted };

    if (parsed.data.notion) {
      merged.notion = parsed.data.notion;
    }
    if (parsed.data.webflow) {
      merged.webflow = {
        ...parsed.data.webflow,
        bodyFieldSlug: parsed.data.webflow.bodyFieldSlug ?? "post-body",
      };
    }

    const encrypted = encryptCmsCredentials(merged);

    await db
      .update(websiteProjectsTable)
      .set({ cmsIntegrations: encrypted })
      .where(eq(websiteProjectsTable.id, projectId));

    res.json(maskCmsCredentials(merged));
  } catch (err) {
    req.log.error({ err }, "Failed to save CMS integrations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/website-projects/:id/cms-integrations/:platform", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  const platform = req.params.platform;
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  if (platform !== "notion" && platform !== "webflow") { res.status(400).json({ error: "Invalid platform" }); return; }

  try {
    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const existing = (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
    const updated = { ...existing };
    delete updated[platform];

    await db
      .update(websiteProjectsTable)
      .set({ cmsIntegrations: updated })
      .where(eq(websiteProjectsTable.id, projectId));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect CMS integration");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/content-pieces/:id/publish/notion", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) { res.status(404).json({ error: "Content piece not found" }); return; }

    const [project] = await db
      .select({ id: websiteProjectsTable.id, cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(403).json({ error: "Access denied" }); return; }

    const stored = (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
    const creds = decryptCmsCredentials(stored);

    if (!creds.notion) {
      res.status(400).json({ error: "Notion is not connected. Configure it in Project Settings → Publishing." });
      return;
    }

    const tags: string[] = [];
    if (piece.targetKeyword) tags.push(piece.targetKeyword);
    if (piece.formatType) tags.push(piece.formatType.replace(/_/g, " "));

    const notionPageUrl = await publishToNotion(
      creds.notion.integrationToken,
      creds.notion.databaseId,
      piece.title,
      piece.bodyMarkdown,
      { status: piece.status ?? "draft", tags },
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({ status: "published", publishedUrl: notionPageUrl })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to publish to Notion");
    res.status(502).json({ error: err instanceof Error ? err.message : "Failed to publish to Notion" });
  }
});

router.post("/content-pieces/:id/publish/webflow", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) { res.status(404).json({ error: "Content piece not found" }); return; }

    const [project] = await db
      .select({ id: websiteProjectsTable.id, cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) { res.status(403).json({ error: "Access denied" }); return; }

    const stored = (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
    const creds = decryptCmsCredentials(stored);

    if (!creds.webflow) {
      res.status(400).json({ error: "Webflow is not connected. Configure it in Project Settings → Publishing." });
      return;
    }

    const webflowItemUrl = await publishToWebflow(
      creds.webflow.apiToken,
      creds.webflow.collectionId,
      creds.webflow.bodyFieldSlug,
      piece.title,
      piece.bodyMarkdown,
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({ status: "published", publishedUrl: webflowItemUrl })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to publish to Webflow");
    res.status(502).json({ error: err instanceof Error ? err.message : "Failed to publish to Webflow" });
  }
});

export default router;
