import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  websiteProjectsTable,
  brandProfilesTable,
  wordpressConnectionsTable,
  companiesTable,
  CONTENT_FORMAT_TYPES,
  type ContentFormatType,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import {
  generateContentPiece,
  generateContentPieceStream,
  repurposeContentPiece,
  buildCacheKey,
  cacheGet,
  cacheSet,
  type BrandContext,
  type ContentGenerationContext,
} from "../services/contentStudioGenerator";
import { loadCompetitorGenerationContext } from "@workspace/content-engine/support/competitor/competitor-generation-context";
import {
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "@workspace/content-engine/support/competitor/competitor-url";
import { logger } from "../lib/logger";
import { getDecryptedUserGeminiKey } from "../lib/userApiKey";
import { decryptSecret } from "@workspace/security/encryption";
import { publishToNotion } from "@workspace/connectors/notion";
import { publishToWebflow } from "@workspace/connectors/webflow";
import { publishToWordPress } from "@workspace/connectors/wordpress";
import { publishToLinkedIn } from "@workspace/connectors/linkedin";
import { publishThreadToTwitter, splitTwitterThread } from "@workspace/connectors/twitter";
import { publishToFacebookPage, publishToInstagram } from "@workspace/connectors/meta";
import {
  type CmsIntegrationCredentials,
  type CmsPublishPlatform,
  CMS_PUBLISH_PLATFORMS,
  encryptCmsCredentials,
  decryptCmsCredentials,
  maskCmsCredentials,
  resolveWordPressConnectionType,
} from "../lib/cmsIntegrations";
import { publishPieceToCms, publishPieceToWordPress } from "../lib/cmsPublish";
import { getSocialAccessToken } from "../lib/socialTokens";

const router: IRouter = Router();

const GenerateBody = z.object({
  formatType: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  targetKeyword: z.string().min(1, "Target keyword is required"),
  angleHint: z.string().optional(),
  competitorFocusUrl: z.string().optional(),
  competitorUrls: z.array(z.string()).max(5).optional(),
});

async function resolveCompetitorGenerationContext(
  projectId: number,
  input: { competitorFocusUrl?: string; competitorUrls?: string[] },
): Promise<ContentGenerationContext> {
  const pieceUrls = input.competitorUrls?.length
    ? normalizeCompetitorUrlList(input.competitorUrls)
    : undefined;
  const focus =
    (input.competitorFocusUrl?.trim()
      ? normalizeCompetitorUrl(input.competitorFocusUrl)
      : null) ?? pieceUrls?.[0];
  const competitorContext = await loadCompetitorGenerationContext(
    projectId,
    focus ?? undefined,
    pieceUrls,
  );
  return {
    competitorPromptBlock: competitorContext.promptBlock || undefined,
    competitorFocusUrl: competitorContext.focusUrl,
    competitorUrls: pieceUrls,
  };
}

const ALLOWED_STATUSES = ["draft", "ready", "published"] as const;

const PATCH_STATUSES = ["draft", "ready"] as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const UpdateBody = z
  .object({
    title: z.string().optional(),
    bodyMarkdown: z.string().optional(),
    status: z.enum(PATCH_STATUSES).optional(),
    plannedDate: z
      .string()
      .regex(ISO_DATE_RE, "plannedDate must be a valid ISO date (YYYY-MM-DD)")
      .nullable()
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Request body must include at least one field to update",
  });

router.post(
  "/website-projects/:id/content-pieces/generate",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const parsed = GenerateBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }

    const { formatType, targetKeyword, angleHint, competitorFocusUrl, competitorUrls } =
      parsed.data;

    try {
      const [project] = await db
        .select()
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
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

      const generationContext = await resolveCompetitorGenerationContext(projectId, {
        competitorFocusUrl,
        competitorUrls,
      });

      const bypassCache = req.headers["x-bypass-cache"] === "true";
      const cacheKeyStr = buildCacheKey(
        formatType,
        targetKeyword,
        brand,
        angleHint,
        undefined,
        generationContext.competitorFocusUrl,
        generationContext.competitorUrls,
      );

      if (!bypassCache) {
        const [existing] = await db
          .select()
          .from(contentPiecesTable)
          .where(
            and(
              eq(contentPiecesTable.websiteProjectId, projectId),
              eq(contentPiecesTable.cacheKey, cacheKeyStr),
            ),
          )
          .limit(1);
        if (existing) {
          logger.info(
            { formatType, targetKeyword },
            "Content piece served from DB cache",
          );
          res.setHeader("X-Cache", "HIT");
          res.status(200).json(existing);
          return;
        }
      }

      const userApiKey = await getDecryptedUserGeminiKey(req.user!.userId);
      const result = await generateContentPiece(
        formatType as ContentFormatType,
        brand,
        targetKeyword,
        angleHint,
        bypassCache,
        userApiKey,
        undefined,
        generationContext,
      );
      const wordCount = result.body_markdown
        .split(/\s+/)
        .filter(Boolean).length;

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
      res
        .status(503)
        .json({ error: "Failed to generate content. Please try again." });
    }
  },
);

router.post(
  "/website-projects/:id/content-pieces/generate/stream",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const parsed = GenerateBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }

    const { formatType, targetKeyword, angleHint, competitorFocusUrl, competitorUrls } =
      parsed.data;

    try {
      const [project] = await db
        .select()
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
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

      const brand: BrandContext = {
        companyName: brandProfile?.companyName ?? project.name,
        websiteUrl: project.url,
        industry: brandProfile?.industry ?? "",
        targetAudience: brandProfile?.targetAudience ?? "",
        voiceTone: brandProfile?.voiceTone ?? "",
        primaryKeywords: brandProfile?.primaryKeywords ?? [],
        contentStyle: project.contentStyle ?? null,
      };

      const generationContext = await resolveCompetitorGenerationContext(projectId, {
        competitorFocusUrl,
        competitorUrls,
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const bypassCache = req.headers["x-bypass-cache"] === "true";
      const userApiKey = await getDecryptedUserGeminiKey(req.user!.userId);
      const cacheKeyStr = buildCacheKey(
        formatType,
        targetKeyword,
        brand,
        angleHint,
        undefined,
        generationContext.competitorFocusUrl,
        generationContext.competitorUrls,
      );

      if (!bypassCache) {
        const [existing] = await db
          .select()
          .from(contentPiecesTable)
          .where(
            and(
              eq(contentPiecesTable.websiteProjectId, projectId),
              eq(contentPiecesTable.cacheKey, cacheKeyStr),
            ),
          )
          .limit(1);
        if (existing) {
          logger.info(
            { formatType, targetKeyword },
            "Content piece streaming served from DB cache",
          );
          sendEvent("cached", existing);
          res.end();
          return;
        }
      }

      if (!bypassCache) {
        const aiCached = await cacheGet(cacheKeyStr);
        if (aiCached) {
          logger.info(
            { formatType, targetKeyword },
            "Content piece streaming served from AI cache",
          );
          sendEvent("chunk", { text: aiCached.body_markdown });
          const wordCount = aiCached.body_markdown
            .split(/\s+/)
            .filter(Boolean).length;
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
          undefined,
          generationContext,
        );
      } catch (streamErr) {
        logger.warn(
          { streamErr },
          "Streaming generation exhausted retries, falling back to non-streaming",
        );
        result = await generateContentPiece(
          formatType as ContentFormatType,
          brand,
          targetKeyword,
          angleHint,
          true,
          userApiKey,
          undefined,
          generationContext,
        );
      }

      await cacheSet(cacheKeyStr, result);

      const wordCount = result.body_markdown
        .split(/\s+/)
        .filter(Boolean).length;
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
      try {
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: "Generation failed. Please try again." })}\n\n`,
        );
        res.end();
      } catch {
        /* already closed */
      }
    }
  },
);

router.get(
  "/website-projects/:id/content-pieces",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const statusFilter =
      typeof req.query.status === "string" &&
      ALLOWED_STATUSES.includes(
        req.query.status as (typeof ALLOWED_STATUSES)[number],
      )
        ? (req.query.status as (typeof ALLOWED_STATUSES)[number])
        : null;

    try {
      const [project] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const whereClause = statusFilter
        ? and(
            eq(contentPiecesTable.websiteProjectId, projectId),
            eq(contentPiecesTable.status, statusFilter),
          )
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
  },
);

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
      .where(
        and(
          eq(websiteProjectsTable.id, piece.websiteProjectId),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
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
    res
      .status(400)
      .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
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
      .where(
        and(
          eq(websiteProjectsTable.id, piece.websiteProjectId),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.bodyMarkdown !== undefined) {
      updates.bodyMarkdown = parsed.data.bodyMarkdown;
      updates.wordCount = parsed.data.bodyMarkdown
        .split(/\s+/)
        .filter(Boolean).length;
    }
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.plannedDate !== undefined)
      updates.plannedDate = parsed.data.plannedDate;

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
      .where(
        and(
          eq(websiteProjectsTable.id, piece.websiteProjectId),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
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

const PublishBody = z
  .object({
    wpSiteUrl: z.string().url("Must be a valid WordPress site URL").optional(),
    wpUsername: z.string().min(1, "WordPress username is required").optional(),
    wpAppPassword: z
      .string()
      .min(1, "WordPress application password is required")
      .optional(),
    wordpressConnectionId: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      data.wordpressConnectionId !== undefined ||
      (data.wpSiteUrl !== undefined &&
        data.wpUsername !== undefined &&
        data.wpAppPassword !== undefined),
    {
      message:
        "Provide either wordpressConnectionId or wpSiteUrl, wpUsername, and wpAppPassword",
    },
  );

// SSRF-guard failures surfaced by @workspace/connectors/wordpress (via assertPublicUrl) so we can
// map them back to 400s without re-running the DNS/host checks ourselves.
const SSRF_ERROR_PATTERN =
  /^Invalid URL$|^Only http\/https URLs are allowed$|private\/reserved address|Could not resolve hostname/;
const AUTH_ERROR_PATTERN = /authentication failed|does not have permission/i;

router.post("/content-pieces/:id/publish", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = PublishBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { wordpressConnectionId } = parsed.data;
  let wpSiteUrl = parsed.data.wpSiteUrl;
  let wpUsername = parsed.data.wpUsername;
  let wpAppPassword = parsed.data.wpAppPassword;
  let publishStatus: "draft" | "publish" = "publish";
  let categoryIds: number[] | undefined;

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
      .where(
        and(
          eq(websiteProjectsTable.id, piece.websiteProjectId),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (wordpressConnectionId !== undefined) {
      const [row] = await db
        .select({ connection: wordpressConnectionsTable })
        .from(wordpressConnectionsTable)
        .innerJoin(
          companiesTable,
          eq(companiesTable.id, wordpressConnectionsTable.companyId),
        )
        .where(
          and(
            eq(wordpressConnectionsTable.id, wordpressConnectionId),
            eq(companiesTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!row) {
        res.status(404).json({ error: "WordPress connection not found" });
        return;
      }

      const { connection } = row;
      wpSiteUrl = connection.siteUrl;
      wpUsername = connection.username;
      wpAppPassword = decryptSecret(connection.encryptedAppPassword);
      publishStatus =
        connection.defaultStatus === "draft" ? "draft" : "publish";
      categoryIds = connection.defaultCategoryId
        ? [connection.defaultCategoryId]
        : undefined;
    }

    // Guaranteed non-undefined by the zod refine (either a connection id, resolved above, or all
    // three fields were supplied directly).
    const siteUrl = wpSiteUrl!;
    const username = wpUsername!;
    const appPassword = wpAppPassword!;

    let result: Awaited<ReturnType<typeof publishToWordPress>>;
    try {
      result = await publishToWordPress(
        { siteUrl, username, appPassword },
        piece.title,
        piece.bodyMarkdown,
        publishStatus,
        undefined,
        categoryIds,
      );
    } catch (wpErr) {
      const message =
        wpErr instanceof Error ? wpErr.message : "WordPress publish failed";
      if (SSRF_ERROR_PATTERN.test(message)) {
        req.log.warn({ wpErr }, "WordPress publish blocked by SSRF guard");
        res.status(400).json({ error: message });
        return;
      }
      if (AUTH_ERROR_PATTERN.test(message)) {
        req.log.warn({ wpErr }, "WordPress authentication failed");
        res
          .status(401)
          .json({
            error:
              "WordPress authentication failed. Check your username and application password.",
          });
        return;
      }
      req.log.error({ wpErr }, "Failed to reach or publish to WordPress");
      res
        .status(502)
        .json({
          error:
            message ||
            "Could not reach your WordPress site. Check the URL and try again.",
        });
      return;
    }

    const [updated] = await db
      .update(contentPiecesTable)
      .set({ status: "published", publishedUrl: result.url })
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
      .where(
        and(
          eq(websiteProjectsTable.id, piece.websiteProjectId),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
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

    const result = await generateContentPiece(
      piece.formatType as ContentFormatType,
      brand,
      piece.targetKeyword,
      undefined,
      true,
    );
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
    res
      .status(503)
      .json({ error: "Failed to regenerate content. Please try again." });
  }
});

const RepurposeFromTextBody = z.object({
  targetFormat: z.enum(
    CONTENT_FORMAT_TYPES as unknown as [string, ...string[]],
  ),
  existingContent: z
    .string()
    .min(50, "Existing content must be at least 50 characters"),
  targetKeyword: z.string().min(1, "Target keyword is required"),
});

router.post(
  "/website-projects/:id/content-pieces/repurpose",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const parsed = RepurposeFromTextBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }

    const { targetFormat, existingContent, targetKeyword } = parsed.data;

    try {
      const [project] = await db
        .select()
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
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

      const wordCount = result.body_markdown
        .split(/\s+/)
        .filter(Boolean).length;
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
      res
        .status(503)
        .json({ error: "Failed to repurpose content. Please try again." });
    }
  },
);

const RepurposeBody = z.object({
  targetFormat: z.enum(
    CONTENT_FORMAT_TYPES as unknown as [string, ...string[]],
  ),
  existingContent: z
    .string()
    .min(50, "Existing content must be at least 50 characters")
    .optional(),
});

router.post(
  "/content-pieces/:id/repurpose/stream",
  requireAuth,
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = RepurposeBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
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
        .where(
          and(
            eq(websiteProjectsTable.id, piece.websiteProjectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
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
      };

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent("step", {
        step: "analyzing",
        label: "Analyzing source content",
      });

      const sourceContent = bodyOverride ?? piece.bodyMarkdown;
      const userApiKey = await getDecryptedUserGeminiKey(req.user!.userId);

      sendEvent("step", {
        step: "generating",
        label: "Generating repurposed content",
      });

      const result = await repurposeContentPiece(
        targetFormat as ContentFormatType,
        brand,
        sourceContent,
        piece.targetKeyword,
        userApiKey,
      );

      sendEvent("step", { step: "saving", label: "Saving new piece" });

      const wordCount = result.body_markdown
        .split(/\s+/)
        .filter(Boolean).length;
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
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: err instanceof Error ? err.message : "Failed to repurpose content" })}\n\n`,
        );
        res.end();
      } catch {
        /* already ended */
      }
    }
  },
);

router.post("/content-pieces/:id/repurpose", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = RepurposeBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
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
      .where(
        and(
          eq(websiteProjectsTable.id, piece.websiteProjectId),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
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
    res
      .status(503)
      .json({ error: "Failed to repurpose content. Please try again." });
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
    let hasWordpress = false;
    let hasGhost = false;
    let hasWebhook = false;
    let hasShopify = false;
    let hasDrupal = false;
    let hasJoomla = false;
    let hasLinkedin = false;
    let hasTwitter = false;
    let hasMeta = false;

    for (const p of projects) {
      const stored = (p.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
      if (stored.notion) hasNotion = true;
      if (stored.webflow) hasWebflow = true;
      if (stored.wordpress) hasWordpress = true;
      if (stored.ghost) hasGhost = true;
      if (stored.webhook) hasWebhook = true;
      if (stored.shopify) hasShopify = true;
      if (stored.drupal) hasDrupal = true;
      if (stored.joomla) hasJoomla = true;
      if (stored.linkedin) hasLinkedin = true;
      if (stored.twitter) hasTwitter = true;
      if (stored.meta) hasMeta = true;
    }

    res.json({
      notion: hasNotion,
      webflow: hasWebflow,
      wordpress: hasWordpress,
      ghost: hasGhost,
      webhook: hasWebhook,
      shopify: hasShopify,
      drupal: hasDrupal,
      joomla: hasJoomla,
      linkedin: hasLinkedin,
      twitter: hasTwitter,
      meta: hasMeta,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch CMS summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/website-projects/:id/cms-integrations/test",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    try {
      const [project] = await db
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const stored = (project.cmsIntegrations ??
        {}) as CmsIntegrationCredentials;
      const creds = decryptCmsCredentials(stored);

      const health: Record<
        string,
        { ok: boolean; error?: string; siteName?: string }
      > = {};

      if (creds.notion) {
        try {
          await assertPublicUrl("https://api.notion.com");
          const testRes = await fetch(
            `https://api.notion.com/v1/databases/${creds.notion.databaseId}`,
            {
              headers: {
                Authorization: `Bearer ${creds.notion.integrationToken}`,
                "Notion-Version": "2022-06-28",
              },
            },
          );
          if (testRes.ok) {
            health.notion = { ok: true };
          } else if (testRes.status === 401) {
            health.notion = { ok: false, error: "Invalid integration token" };
          } else if (testRes.status === 404) {
            health.notion = {
              ok: false,
              error: "Database not found or not shared with integration",
            };
          } else {
            health.notion = {
              ok: false,
              error: `Notion API error: ${testRes.status}`,
            };
          }
        } catch (err) {
          health.notion = {
            ok: false,
            error: err instanceof Error ? err.message : "Connection failed",
          };
        }
      }

      if (creds.webflow) {
        try {
          await assertPublicUrl("https://api.webflow.com");
          const testRes = await fetch(
            `https://api.webflow.com/v2/collections/${creds.webflow.collectionId}`,
            {
              headers: {
                Authorization: `Bearer ${creds.webflow.apiToken}`,
                accept: "application/json",
              },
            },
          );
          if (testRes.ok) {
            health.webflow = { ok: true };
          } else if (testRes.status === 401 || testRes.status === 403) {
            health.webflow = { ok: false, error: "Invalid API token" };
          } else if (testRes.status === 404) {
            health.webflow = { ok: false, error: "Collection not found" };
          } else {
            health.webflow = {
              ok: false,
              error: `Webflow API error: ${testRes.status}`,
            };
          }
        } catch (err) {
          health.webflow = {
            ok: false,
            error: err instanceof Error ? err.message : "Connection failed",
          };
        }
      }

      if (creds.wordpress) {
        if (resolveWordPressConnectionType(creds.wordpress) === "plugin") {
          const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
          const result = await testGoalsAcPluginConnection({
            siteUrl: creds.wordpress.siteUrl,
            siteKey: creds.wordpress.siteKey!,
            platform: "wordpress",
          });
          health.wordpress = result.ok
            ? { ok: true, siteName: result.health?.version }
            : { ok: false, error: result.error };
        } else {
        try {
          await assertPublicUrl(creds.wordpress.siteUrl);
          const testRes = await fetch(
            `${creds.wordpress.siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/users/me`,
            {
              headers: {
                Authorization: `Basic ${Buffer.from(`${creds.wordpress.username}:${creds.wordpress.appPassword}`).toString("base64")}`,
              },
            },
          );

          if (testRes.ok) {
            const user = (await testRes.json()) as {
              name?: string;
              capabilities?: Record<string, boolean>;
            };
            const canPublish = user.capabilities?.["publish_posts"] ?? true;
            if (!canPublish) {
              health.wordpress = {
                ok: false,
                error: "This user does not have permission to create posts.",
              };
            } else {
              health.wordpress = { ok: true, siteName: user.name };
            }
          } else if (testRes.status === 401) {
            health.wordpress = {
              ok: false,
              error:
                "WordPress authentication failed. Check your application password.",
            };
          } else if (testRes.status === 403) {
            health.wordpress = {
              ok: false,
              error: "WordPress user does not have permission to create posts.",
            };
          } else {
            health.wordpress = {
              ok: false,
              error: `WordPress API error: ${testRes.status}`,
            };
          }
        } catch (err) {
          health.wordpress = {
            ok: false,
            error: err instanceof Error ? err.message : "Connection failed",
          };
        }
        }
      }

      if (creds.ghost) {
        const { testGhostConnection } = await import("@workspace/connectors/ghost");
        const result = await testGhostConnection(creds.ghost);
        health.ghost = result.ok
          ? { ok: true, siteName: result.siteTitle }
          : { ok: false, error: result.error };
      }

      if (creds.webhook) {
        const { testWebhookConnection } = await import("@workspace/connectors/webhook");
        const result = await testWebhookConnection(creds.webhook);
        health.webhook = result.ok ? { ok: true } : { ok: false, error: result.error };
      }

      if (creds.shopify) {
        if (creds.shopify.connectionType === "plugin") {
          const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
          const result = await testGoalsAcPluginConnection({
            siteUrl: creds.shopify.siteUrl!,
            siteKey: creds.shopify.siteKey!,
            platform: "shopify",
          });
          health.shopify = result.ok
            ? { ok: true, siteName: result.health?.version }
            : { ok: false, error: result.error };
        } else {
          const { testShopifyConnection } = await import("@workspace/connectors/shopify");
          const result = await testShopifyConnection({
            shopDomain: creds.shopify.shopDomain!,
            accessToken: creds.shopify.accessToken!,
            blogId: creds.shopify.blogId,
          });
          health.shopify = result.ok
            ? { ok: true, siteName: result.shopName }
            : { ok: false, error: result.error };
        }
      }

      if (creds.drupal) {
        if (creds.drupal.connectionType === "plugin") {
          const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
          const result = await testGoalsAcPluginConnection({
            siteUrl: creds.drupal.siteUrl,
            siteKey: creds.drupal.siteKey!,
            platform: "drupal",
          });
          health.drupal = result.ok
            ? { ok: true, siteName: result.health?.version }
            : { ok: false, error: result.error };
        } else {
          const { testDrupalConnection } = await import("@workspace/connectors/drupal");
          const result = await testDrupalConnection({
            siteUrl: creds.drupal.siteUrl,
            authType: creds.drupal.authType ?? "basic",
            username: creds.drupal.username,
            password: creds.drupal.password,
            accessToken: creds.drupal.accessToken,
          });
          health.drupal = result.ok
            ? { ok: true, siteName: result.siteName }
            : { ok: false, error: result.error };
        }
      }

      if (creds.joomla) {
        if (creds.joomla.connectionType === "plugin") {
          const { testGoalsAcPluginConnection } = await import("@workspace/connectors/goals-ac-plugin");
          const result = await testGoalsAcPluginConnection({
            siteUrl: creds.joomla.siteUrl,
            siteKey: creds.joomla.siteKey!,
            platform: "joomla",
          });
          health.joomla = result.ok
            ? { ok: true, siteName: result.health?.version }
            : { ok: false, error: result.error };
        } else {
          const { testJoomlaConnection } = await import("@workspace/connectors/joomla");
          const result = await testJoomlaConnection({
            siteUrl: creds.joomla.siteUrl,
            apiToken: creds.joomla.apiToken!,
          });
          health.joomla = result.ok
            ? { ok: true, siteName: result.siteName }
            : { ok: false, error: result.error };
        }
      }

      if (creds.linkedin) {
        const { testLinkedInConnection } = await import("@workspace/connectors/linkedin");
        const result = await testLinkedInConnection({
          accessToken: creds.linkedin.accessToken,
          authorUrn: creds.linkedin.authorUrn,
        });
        health.linkedin = result.ok
          ? { ok: true, siteName: result.displayName }
          : { ok: false, error: result.error };
      }

      if (creds.twitter) {
        const { testTwitterConnection } = await import("@workspace/connectors/twitter");
        const result = await testTwitterConnection({ accessToken: creds.twitter.accessToken });
        health.twitter = result.ok
          ? { ok: true, siteName: result.screenName ? `@${result.screenName}` : undefined }
          : { ok: false, error: result.error };
      }

      if (creds.meta) {
        const { testMetaConnection } = await import("@workspace/connectors/meta");
        const result = await testMetaConnection({
          accessToken: creds.meta.accessToken,
          pageId: creds.meta.pageId,
          instagramAccountId: creds.meta.instagramAccountId,
        });
        health.meta = result.ok
          ? { ok: true, siteName: result.pageName ?? result.instagramUsername }
          : { ok: false, error: result.error };
      }

      res.json(health);
    } catch (err) {
      req.log.error({ err }, "Failed to test CMS integrations");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

const CmsIntegrationsBody = z.object({
  notion: z
    .object({
      integrationToken: z
        .string()
        .min(1, "Notion integration token is required"),
      databaseId: z.string().min(1, "Notion database ID is required"),
    })
    .optional(),
  webflow: z
    .object({
      apiToken: z.string().min(1, "Webflow API token is required"),
      collectionId: z.string().min(1, "Webflow collection ID is required"),
      bodyFieldSlug: z
        .string()
        .min(1, "Body field slug is required")
        .default("post-body"),
    })
    .optional(),
  wordpress: z
    .discriminatedUnion("connectionType", [
      z.object({
        connectionType: z.literal("api"),
        siteUrl: z.string().url("Must be a valid WordPress site URL"),
        username: z.string().min(1, "WordPress username is required"),
        appPassword: z
          .string()
          .min(1, "WordPress application password is required"),
      }),
      z.object({
        connectionType: z.literal("plugin"),
        siteUrl: z.string().url("Must be a valid WordPress site URL"),
        siteKey: z.string().min(1, "Site key is required"),
      }),
    ])
    .optional(),
  ghost: z
    .object({
      apiUrl: z.string().url("Must be a valid Ghost site URL"),
      adminApiKey: z.string().min(1, "Ghost Admin API key is required"),
    })
    .optional(),
  webhook: z
    .object({
      url: z.string().url("Must be a valid webhook URL"),
      signingSecret: z.string().min(1, "Webhook signing secret is required"),
    })
    .optional(),
  shopify: z
    .discriminatedUnion("connectionType", [
      z.object({
        connectionType: z.literal("api"),
        shopDomain: z.string().min(1, "Shopify shop domain is required"),
        accessToken: z.string().min(1, "Shopify access token is required"),
        blogId: z.string().optional(),
      }),
      z.object({
        connectionType: z.literal("plugin"),
        siteUrl: z.string().url("Must be a valid Shopify app URL"),
        siteKey: z.string().min(1, "Site key is required"),
        blogId: z.string().optional(),
      }),
    ])
    .optional(),
  drupal: z
    .discriminatedUnion("connectionType", [
      z.object({
        connectionType: z.literal("api"),
        siteUrl: z.string().url("Must be a valid Drupal site URL"),
        authType: z.enum(["basic", "bearer"]).default("basic"),
        username: z.string().optional(),
        password: z.string().optional(),
        accessToken: z.string().optional(),
        contentType: z.string().optional(),
      }),
      z.object({
        connectionType: z.literal("plugin"),
        siteUrl: z.string().url("Must be a valid Drupal site URL"),
        siteKey: z.string().min(1, "Site key is required"),
      }),
    ])
    .optional(),
  joomla: z
    .discriminatedUnion("connectionType", [
      z.object({
        connectionType: z.literal("api"),
        siteUrl: z.string().url("Must be a valid Joomla site URL"),
        apiToken: z.string().min(1, "Joomla API token is required"),
        categoryId: z.number().int().positive().optional(),
      }),
      z.object({
        connectionType: z.literal("plugin"),
        siteUrl: z.string().url("Must be a valid Joomla site URL"),
        siteKey: z.string().min(1, "Site key is required"),
      }),
    ])
    .optional(),
});

router.get(
  "/website-projects/:id/cms-integrations",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    try {
      const [project] = await db
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      if (!project.cmsIntegrations) {
        res.json({});
        return;
      }

      const stored = project.cmsIntegrations as CmsIntegrationCredentials;
      const decrypted = decryptCmsCredentials(stored);
      res.json(maskCmsCredentials(decrypted, stored as Record<string, unknown>));
    } catch (err) {
      req.log.error({ err }, "Failed to get CMS integrations");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.patch(
  "/website-projects/:id/cms-integrations",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const parsed = CmsIntegrationsBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }

    try {
      const [project] = await db
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const existing = (project.cmsIntegrations ??
        {}) as CmsIntegrationCredentials;
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
      if (parsed.data.wordpress) {
        merged.wordpress = parsed.data.wordpress;
      }
      if (parsed.data.ghost) {
        merged.ghost = parsed.data.ghost;
      }
      if (parsed.data.webhook) {
        merged.webhook = parsed.data.webhook;
      }
      if (parsed.data.shopify) {
        merged.shopify = parsed.data.shopify;
      }
      if (parsed.data.drupal) {
        merged.drupal = parsed.data.drupal;
      }
      if (parsed.data.joomla) {
        merged.joomla = parsed.data.joomla;
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
  },
);

router.delete(
  "/website-projects/:id/cms-integrations/:platform",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    const platform = req.params.platform;
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }
    if (
      platform !== "notion" &&
      platform !== "webflow" &&
      platform !== "wordpress" &&
      platform !== "ghost" &&
      platform !== "webhook" &&
      platform !== "shopify" &&
      platform !== "drupal" &&
      platform !== "joomla" &&
      platform !== "linkedin" &&
      platform !== "twitter" &&
      platform !== "meta"
    ) {
      res.status(400).json({ error: "Invalid platform" });
      return;
    }

    try {
      const [project] = await db
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const existing = (project.cmsIntegrations ??
        {}) as CmsIntegrationCredentials;
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
  },
);

router.post(
  "/content-pieces/:id/publish/notion",
  requireAuth,
  async (req, res) => {
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
        .select({
          id: websiteProjectsTable.id,
          cmsIntegrations: websiteProjectsTable.cmsIntegrations,
        })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, piece.websiteProjectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const stored = (project.cmsIntegrations ??
        {}) as CmsIntegrationCredentials;
      const creds = decryptCmsCredentials(stored);

      if (!creds.notion) {
        res
          .status(400)
          .json({
            error:
              "Notion is not connected. Configure it in Project Settings → Publishing.",
          });
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
      res
        .status(502)
        .json({
          error:
            err instanceof Error ? err.message : "Failed to publish to Notion",
        });
    }
  },
);

router.post(
  "/content-pieces/:id/publish/wordpress",
  requireAuth,
  async (req, res) => {
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
        .select({
          id: websiteProjectsTable.id,
          cmsIntegrations: websiteProjectsTable.cmsIntegrations,
        })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, piece.websiteProjectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const stored = (project.cmsIntegrations ??
        {}) as CmsIntegrationCredentials;
      const creds = decryptCmsCredentials(stored);

      if (!creds.wordpress) {
        res.status(400).json({
          error:
            "WordPress is not connected. Configure it in Project Settings → Publishing.",
        });
        return;
      }

      let publishedUrl: string;
      try {
        publishedUrl = await publishPieceToWordPress(piece, creds);
      } catch (wpErr) {
        const message =
          wpErr instanceof Error ? wpErr.message : "WordPress publish failed";
        if (SSRF_ERROR_PATTERN.test(message)) {
          req.log.warn({ wpErr }, "WordPress publish blocked by SSRF guard");
          res.status(400).json({ error: message });
          return;
        }
        if (AUTH_ERROR_PATTERN.test(message)) {
          req.log.warn({ wpErr }, "WordPress authentication failed");
          res.status(401).json({ error: message });
          return;
        }
        req.log.error({ wpErr }, "Failed to reach or publish to WordPress");
        res.status(502).json({
          error:
            message ||
            "Could not reach your WordPress site. Check the URL and try again.",
        });
        return;
      }

      const [updated] = await db
        .update(contentPiecesTable)
        .set({
          status: "published",
          publishedUrl,
          publishPlatform: "wordpress",
          publishError: null,
        })
        .where(eq(contentPiecesTable.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to publish to WordPress");
      res.status(502).json({
        error:
          err instanceof Error ? err.message : "Failed to publish to WordPress",
      });
    }
  },
);

router.post(
  "/content-pieces/:id/publish/webflow",
  requireAuth,
  async (req, res) => {
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
        .select({
          id: websiteProjectsTable.id,
          cmsIntegrations: websiteProjectsTable.cmsIntegrations,
        })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, piece.websiteProjectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const stored = (project.cmsIntegrations ??
        {}) as CmsIntegrationCredentials;
      const creds = decryptCmsCredentials(stored);

      if (!creds.webflow) {
        res
          .status(400)
          .json({
            error:
              "Webflow is not connected. Configure it in Project Settings → Publishing.",
          });
        return;
      }

      const webflowItemUrl = await publishToWebflow(
        creds.webflow.apiToken,
        creds.webflow.collectionId,
        creds.webflow.bodyFieldSlug,
        piece.title,
        piece.bodyMarkdown,
        {
          featuredImageUrl: (
            piece.pieceMetadata as { featuredImageUrl?: string } | null
          )?.featuredImageUrl,
        },
      );

      const [updated] = await db
        .update(contentPiecesTable)
        .set({ status: "published", publishedUrl: webflowItemUrl })
        .where(eq(contentPiecesTable.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to publish to Webflow");
      res
        .status(502)
        .json({
          error:
            err instanceof Error ? err.message : "Failed to publish to Webflow",
        });
    }
  },
);

router.post(
  "/content-pieces/:id/publish/linkedin",
  requireAuth,
  async (req, res) => {
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
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, piece.websiteProjectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);
      if (!project) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
      if (!creds.linkedin) {
        res.status(400).json({ error: "LinkedIn is not connected. Configure it in Project Settings → Publishing." });
        return;
      }

      const accessToken = await getSocialAccessToken(piece.websiteProjectId, req.user!.userId, "linkedin");
      const result = await publishToLinkedIn(
        { accessToken, authorUrn: creds.linkedin.authorUrn },
        piece.title,
        piece.bodyMarkdown,
      );

      const [updated] = await db
        .update(contentPiecesTable)
        .set({ status: "published", publishedUrl: result.postUrl, publishPlatform: "linkedin", publishError: null })
        .where(eq(contentPiecesTable.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to publish to LinkedIn");
      res.status(502).json({ error: err instanceof Error ? err.message : "Failed to publish to LinkedIn" });
    }
  },
);

router.post(
  "/content-pieces/:id/publish/twitter",
  requireAuth,
  async (req, res) => {
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
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, piece.websiteProjectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);
      if (!project) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
      if (!creds.twitter) {
        res.status(400).json({ error: "X is not connected. Configure it in Project Settings → Publishing." });
        return;
      }

      const accessToken = await getSocialAccessToken(piece.websiteProjectId, req.user!.userId, "twitter");
      const tweets = splitTwitterThread(piece.bodyMarkdown);
      const result = await publishThreadToTwitter({ accessToken }, tweets);

      const [updated] = await db
        .update(contentPiecesTable)
        .set({
          status: "published",
          publishedUrl: result.postUrls[0] ?? null,
          publishPlatform: "twitter",
          publishError: null,
        })
        .where(eq(contentPiecesTable.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to publish to X");
      res.status(502).json({ error: err instanceof Error ? err.message : "Failed to publish to X" });
    }
  },
);

router.post(
  "/content-pieces/:id/publish/instagram",
  requireAuth,
  async (req, res) => {
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
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, piece.websiteProjectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);
      if (!project) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
      if (!creds.meta?.instagramAccountId) {
        res.status(400).json({ error: "Instagram is not connected. Connect Meta and link an Instagram Business account." });
        return;
      }

      const accessToken = await getSocialAccessToken(piece.websiteProjectId, req.user!.userId, "meta");
      const result = await publishToInstagram(
        {
          accessToken,
          pageId: creds.meta.pageId,
          instagramAccountId: creds.meta.instagramAccountId,
        },
        piece.bodyMarkdown,
      );

      const [updated] = await db
        .update(contentPiecesTable)
        .set({ status: "published", publishedUrl: result.postUrl, publishPlatform: "instagram", publishError: null })
        .where(eq(contentPiecesTable.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to publish to Instagram");
      res.status(502).json({ error: err instanceof Error ? err.message : "Failed to publish to Instagram" });
    }
  },
);

router.post(
  "/content-pieces/:id/publish/facebook",
  requireAuth,
  async (req, res) => {
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
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, piece.websiteProjectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);
      if (!project) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
      if (!creds.meta?.pageId) {
        res.status(400).json({ error: "Facebook is not connected. Connect Meta in Project Settings → Publishing." });
        return;
      }

      const accessToken = await getSocialAccessToken(piece.websiteProjectId, req.user!.userId, "meta");
      const result = await publishToFacebookPage(
        { accessToken, pageId: creds.meta.pageId, instagramAccountId: creds.meta.instagramAccountId },
        piece.bodyMarkdown,
      );

      const [updated] = await db
        .update(contentPiecesTable)
        .set({ status: "published", publishedUrl: result.postUrl, publishPlatform: "facebook", publishError: null })
        .where(eq(contentPiecesTable.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to publish to Facebook");
      res.status(502).json({ error: err instanceof Error ? err.message : "Failed to publish to Facebook" });
    }
  },
);

const CMS_PLATFORM_LABELS: Record<CmsPublishPlatform, string> = {
  ghost: "Ghost",
  webhook: "Webhook",
  shopify: "Shopify",
  drupal: "Drupal",
  joomla: "Joomla",
  typo3: "TYPO3",
};

for (const platform of CMS_PUBLISH_PLATFORMS) {
  router.post(
    `/content-pieces/:id/publish/${platform}`,
    requireAuth,
    async (req, res) => {
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
          .select({
            id: websiteProjectsTable.id,
            cmsIntegrations: websiteProjectsTable.cmsIntegrations,
          })
          .from(websiteProjectsTable)
          .where(
            and(
              eq(websiteProjectsTable.id, piece.websiteProjectId),
              eq(websiteProjectsTable.userId, req.user!.userId),
            ),
          )
          .limit(1);

        if (!project) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const creds = decryptCmsCredentials(
          (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials,
        );

        if (!creds[platform]) {
          res.status(400).json({
            error: `${CMS_PLATFORM_LABELS[platform]} is not connected. Configure it in Project Settings → Publishing.`,
          });
          return;
        }

        let publishedUrl: string;
        try {
          publishedUrl = await publishPieceToCms(platform, piece, creds);
        } catch (publishErr) {
          const message =
            publishErr instanceof Error
              ? publishErr.message
              : `${CMS_PLATFORM_LABELS[platform]} publish failed`;
          if (SSRF_ERROR_PATTERN.test(message)) {
            res.status(400).json({ error: message });
            return;
          }
          if (AUTH_ERROR_PATTERN.test(message)) {
            res.status(401).json({ error: message });
            return;
          }
          res.status(502).json({ error: message });
          return;
        }

        const [updated] = await db
          .update(contentPiecesTable)
          .set({
            status: "published",
            publishedUrl,
            publishPlatform: platform,
            publishError: null,
          })
          .where(eq(contentPiecesTable.id, id))
          .returning();

        res.json(updated);
      } catch (err) {
        req.log.error({ err }, `Failed to publish to ${platform}`);
        res.status(502).json({
          error:
            err instanceof Error
              ? err.message
              : `Failed to publish to ${CMS_PLATFORM_LABELS[platform]}`,
        });
      }
    },
  );
}

export default router;
