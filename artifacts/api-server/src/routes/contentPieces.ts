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
import { generateContentPiece } from "../services/contentStudioGenerator";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const GenerateBody = z.object({
  formatType: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  targetKeyword: z.string().min(1, "Target keyword is required"),
  angleHint: z.string().optional(),
});

const ALLOWED_STATUSES = ["draft", "ready", "published"] as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const UpdateBody = z.object({
  title: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  status: z.enum(ALLOWED_STATUSES).optional(),
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
    };

    const result = await generateContentPiece(formatType as ContentFormatType, brand, targetKeyword, angleHint);
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
      })
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    logger.error({ err }, "Failed to generate content piece");
    res.status(503).json({ error: "Failed to generate content. Please try again." });
  }
});

router.get("/website-projects/:id/content-pieces", requireAuth, async (req, res) => {
  const projectId = Number(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

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

    const pieces = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, projectId))
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
    };

    const result = await generateContentPiece(piece.formatType as ContentFormatType, brand, piece.targetKeyword);
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

export default router;
