import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import {
  brandProfilesTable,
  CONTENT_FORMAT_TYPES,
  contentPiecesTable,
  websiteProjectsTable,
  type ContentFormatType,
} from "@workspace/db/schema-sqlite";
import {
  buildCacheKey,
  generateContentPiece,
  repurposeContentPiece,
} from "@workspace/content-engine/content/content-studio-generator";
import { enhanceContentPiece } from "@workspace/content-engine/content/content-piece-enhance";
import {
  applyStockPhotoToPiece,
  enrichContentPieceImages,
  parseImageSettings,
} from "@workspace/content-engine/articles/article-image-enricher";
import { isSeoLongformFormat } from "@workspace/content-engine/content/content-piece-seo";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { loadCompetitorGenerationContext } from "@workspace/content-engine/support/competitor/competitor-generation-context";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import { loadStockCredentialContextForProject } from "@workspace/content-engine/support/integrations/stock-credentials";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import {
  acknowledgeStockPhotoSelection,
  rankStockPhotos,
  searchStockPhotos,
} from "@workspace/stock-images";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { getAccessibleProject } from "./project-access";

function wordCountFromMarkdown(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

async function loadPieceForUser(contentPieceId: number, userId: number) {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, contentPieceId))
    .limit(1);

  if (!piece) return { piece: null, error: "not_found" as const };

  const project = await getAccessibleProject(piece.websiteProjectId, userId);
  if (!project) return { piece: null, error: "forbidden" as const };

  return { piece, error: null };
}

async function loadExistingPieceTitles(projectId: number): Promise<string[]> {
  const rows = await db
    .select({ title: contentPiecesTable.title })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, projectId));
  return rows.map((row) => row.title);
}

async function loadUserAiSettings(userId: number) {
  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);
  return { userApiKey, aiProviderOptions };
}

const regenerateBody = z.object({
  angleHint: z.string().optional(),
});

const repurposeBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().optional(),
});

const repurposeFromTextBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().min(50, "Existing content must be at least 50 characters"),
  targetKeyword: z.string().min(1, "Target keyword is required"),
});

export async function handleContentPiecesAiWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const regenerateMatch = path.match(/^\/api\/content-pieces\/(\d+)\/regenerate$/);
  if (regenerateMatch && request.method === "POST") {
    return handleRegenerate(request, Number.parseInt(regenerateMatch[1]!, 10), userId);
  }

  const enhanceMatch = path.match(/^\/api\/content-pieces\/(\d+)\/enhance$/);
  if (enhanceMatch && request.method === "POST") {
    return handleEnhance(request, Number.parseInt(enhanceMatch[1]!, 10), userId);
  }

  const serpScoreMatch = path.match(/^\/api\/content-pieces\/(\d+)\/serp-score$/);
  if (serpScoreMatch && request.method === "GET") {
    return handleSerpScore(request, Number.parseInt(serpScoreMatch[1]!, 10), userId);
  }

  const repurposeMatch = path.match(/^\/api\/content-pieces\/(\d+)\/repurpose$/);
  if (repurposeMatch && request.method === "POST") {
    return handleRepurpose(request, Number.parseInt(repurposeMatch[1]!, 10), userId);
  }

  const repurposeStreamMatch = path.match(/^\/api\/content-pieces\/(\d+)\/repurpose\/stream$/);
  if (repurposeStreamMatch && request.method === "POST") {
    return handleRepurpose(request, Number.parseInt(repurposeStreamMatch[1]!, 10), userId);
  }

  const projectRepurposeMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/content-pieces\/repurpose$/,
  );
  if (projectRepurposeMatch && request.method === "POST") {
    return handleProjectRepurpose(request, Number.parseInt(projectRepurposeMatch[1]!, 10), userId);
  }

  const imagesMatch = path.match(/^\/api\/content-pieces\/(\d+)\/images\/regenerate$/);
  if (imagesMatch && request.method === "POST") {
    return handleImagesRegenerate(request, Number.parseInt(imagesMatch[1]!, 10), userId);
  }

  const imagesSearchMatch = path.match(/^\/api\/content-pieces\/(\d+)\/images\/search$/);
  if (imagesSearchMatch && request.method === "GET") {
    return handleImagesSearch(request, Number.parseInt(imagesSearchMatch[1]!, 10), userId);
  }

  const imagesAttachMatch = path.match(/^\/api\/content-pieces\/(\d+)\/images\/attach$/);
  if (imagesAttachMatch && request.method === "POST") {
    return handleImagesAttach(request, Number.parseInt(imagesAttachMatch[1]!, 10), userId);
  }

  return null;
}

const attachStockBody = z.object({
  role: z.enum(["featured", "inline"]),
  searchQuery: z.string().trim().max(200).optional(),
  sectionHeading: z.string().trim().max(200).optional(),
  alt: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  photo: z.object({
    provider: z.enum(["unsplash", "pexels"]),
    id: z.string().trim().min(1).max(120),
    url: z.string().url(),
    photographer: z.string().trim().max(200).default(""),
    photographerUrl: z.string().trim().max(500).default(""),
    description: z.string().trim().max(500).optional(),
    rankScore: z.number().optional(),
  }),
});

async function handleImagesSearch(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  }
  if (access.error === "forbidden" || !access.piece) {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece;
  const q =
    new URL(request.url).searchParams.get("q")?.trim() ||
    piece.targetKeyword?.trim() ||
    piece.title;
  if (!q) {
    return withCors(request, Response.json({ error: "Query required" }, { status: 400 }));
  }

  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
    .limit(1);

  const settings = parseImageSettings(project?.contentStyle ?? null);
  const stockCredentials = await loadStockCredentialContextForProject(piece.websiteProjectId);

  try {
    const photos = await searchStockPhotos(q, {
      provider: settings.stockProvider ?? "auto",
      orientation: "landscape",
      perPage: 18,
      credentials: stockCredentials,
    });
    const ranked = rankStockPhotos(q, photos, { orientation: "landscape" });
    return withCors(
      request,
      Response.json({
        query: q,
        photos: ranked.map((photo) => ({
          provider: photo.provider,
          id: photo.id,
          url: photo.url,
          previewUrl: photo.previewUrl,
          width: photo.width,
          height: photo.height,
          photographer: photo.photographer,
          photographerUrl: photo.photographerUrl,
          description: photo.description,
          rankScore: photo.rankScore,
        })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stock search failed";
    return withCors(request, Response.json({ error: message }, { status: 502 }));
  }
}

async function handleImagesAttach(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  }
  if (access.error === "forbidden" || !access.piece) {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const parsed = attachStockBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const piece = access.piece;
  const stockCredentials = await loadStockCredentialContextForProject(piece.websiteProjectId);

  try {
    await acknowledgeStockPhotoSelection(parsed.data.photo, stockCredentials);
    const enriched = applyStockPhotoToPiece(
      {
        title: piece.title,
        target_keyword: piece.targetKeyword ?? piece.title,
        body_markdown: piece.bodyMarkdown ?? "",
        formatType: piece.formatType,
        pieceMetadata: piece.pieceMetadata ?? undefined,
      },
      parsed.data.photo,
      {
        role: parsed.data.role,
        searchQuery: parsed.data.searchQuery,
        sectionHeading: parsed.data.sectionHeading,
        alt: parsed.data.alt,
        title: parsed.data.title,
      },
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: enriched.body_markdown,
        pieceMetadata: enriched.pieceMetadata,
        wordCount: wordCountFromMarkdown(enriched.body_markdown),
      })
      .where(eq(contentPiecesTable.id, contentPieceId))
      .returning();

    return withCors(request, Response.json({ piece: updated }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to attach stock image";
    const status = /not allowed|must use HTTPS|Invalid stock/i.test(message) ? 400 : 500;
    return withCors(request, Response.json({ error: message }, { status }));
  }
}

async function handleSerpScore(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const loaded = await loadPieceForUser(contentPieceId, userId);
  if (loaded.error === "not_found") {
    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  }
  if (loaded.error === "forbidden" || !loaded.piece) {
    return withCors(request, Response.json({ error: "Forbidden" }, { status: 403 }));
  }

  const piece = loaded.piece;
  const meta = (piece.pieceMetadata ?? {}) as {
    seoTitle?: string;
    metaTitle?: string;
    metaDescription?: string;
    citations?: { text: string; url: string }[];
    faqSection?: { question: string; answer: string }[];
    jsonLdSchema?: object;
    internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
  };

  let serpFeatures: Record<string, unknown> | null = null;
  const keyword = piece.targetKeyword?.trim();

  if (keyword) {
    const { trackedKeywordsTable, keywordRankSnapshotsTable } = await import(
      "@workspace/db/schema-sqlite"
    );
    const { and, desc } = await import("drizzle-orm");
    const [tracked] = await db
      .select({ id: trackedKeywordsTable.id })
      .from(trackedKeywordsTable)
      .where(
        and(
          eq(trackedKeywordsTable.websiteProjectId, piece.websiteProjectId),
          eq(trackedKeywordsTable.keyword, keyword.toLowerCase()),
          eq(trackedKeywordsTable.isActive, true),
        ),
      )
      .limit(1);

    if (tracked) {
      const [snapshot] = await db
        .select({ serpFeatures: keywordRankSnapshotsTable.serpFeatures })
        .from(keywordRankSnapshotsTable)
        .where(eq(keywordRankSnapshotsTable.trackedKeywordId, tracked.id))
        .orderBy(desc(keywordRankSnapshotsTable.checkedAt))
        .limit(1);
      serpFeatures = (snapshot?.serpFeatures as Record<string, unknown>) ?? null;
    }

    try {
      const { isSerpConfigured, getSerpProvider } = await import("@workspace/serp-provider");
      if (!serpFeatures && isSerpConfigured()) {
        const result = await getSerpProvider().checkRank({ keyword });
        serpFeatures = result.serpFeatures;
      }
    } catch {
      // optional
    }
  }

  const peopleAlsoAsk = Array.isArray(serpFeatures?.peopleAlsoAsk)
    ? (serpFeatures.peopleAlsoAsk as string[]).filter((q) => typeof q === "string")
    : [];
  const competitorTitles = Array.isArray(serpFeatures?.topResults)
    ? (serpFeatures.topResults as Array<{ title?: string }>)
        .map((row) => row.title)
        .filter((title): title is string => Boolean(title))
    : [];

  const brand = await loadBrandContextForProject(piece.websiteProjectId);
  const writingSample = brand?.writingSample?.trim() || null;
  const brandGlossary = brand?.brandGlossary?.filter((t) => t?.trim()) ?? [];
  const brandVoicePassages =
    brand?.writingExamples?.map((e) => e?.trim()).filter((e): e is string => Boolean(e)) ?? [];

  const { scoreDualContentQuality } = await import(
    "@workspace/content-engine/articles/serp-content-score"
  );
  const dual = scoreDualContentQuality({
    bodyMarkdown: piece.bodyMarkdown ?? "",
    wordCount: piece.wordCount ?? undefined,
    metaTitle: meta.seoTitle ?? meta.metaTitle ?? piece.title,
    metaDescription: meta.metaDescription,
    targetKeyword: keyword,
    citations: meta.citations,
    faqSection: meta.faqSection,
    jsonLdSchema: meta.jsonLdSchema,
    internalLinkSuggestions: meta.internalLinkSuggestions,
    serpFeatures,
    peopleAlsoAsk,
    competitorTitles,
    writingSample,
    brandGlossary: brandGlossary.length > 0 ? brandGlossary : undefined,
    brandVoicePassages: brandVoicePassages.length > 0 ? brandVoicePassages : undefined,
  });

  return withCors(
    request,
    Response.json({
      ...dual,
      serpFeatures,
      keyword: keyword ?? null,
      scoredAt: new Date().toISOString(),
      writingSample,
      brandGlossary: brandGlossary.length > 0 ? brandGlossary : null,
      brandVoicePassages: brandVoicePassages.length > 0 ? brandVoicePassages : null,
    }),
  );
}

async function handleRegenerate(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const body = await request.json().catch(() => ({}));
  const parsed = regenerateBody.safeParse(body);
  const angleHint = parsed.success ? parsed.data.angleHint : undefined;

  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Content piece not found" }, { status: 404 }));
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece!;
  const brand = await loadBrandContextForProject(piece.websiteProjectId);
  if (!brand) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [{ userApiKey, aiProviderOptions }, billingPrep] = await Promise.all([
    loadUserAiSettings(userId),
    prepareAiBilling({ userId, tier: "execution", quotaKind: "article" }),
  ]);
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  try {
    const existingPieceTitles = await loadExistingPieceTitles(piece.websiteProjectId);
    const result = await generateContentPiece(
      piece.formatType as ContentFormatType,
      brand,
      piece.targetKeyword ?? "",
      angleHint,
      true,
      userApiKey,
      aiProviderOptions,
      { existingPieceTitles },
    );

    const cacheKeyStr = buildCacheKey(
      piece.formatType,
      piece.targetKeyword ?? "",
      brand,
      angleHint,
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        cacheKey: cacheKeyStr,
        status: "draft",
        pieceMetadata: result.pieceMetadata ?? null,
      })
      .where(eq(contentPiecesTable.id, contentPieceId))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "content_regenerate",
      usedByok: billingPrep.usedByok,
      tier: "execution",
      promptTokens: result.generationUsage?.promptTokens,
      outputTokens: result.generationUsage?.outputTokens,
      totalTokens: result.generationUsage?.totalTokens,
    });

    return withCors(request, Response.json(updated));
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx);
    const message = err instanceof Error ? err.message : "Regeneration failed";
    return withCors(request, Response.json({ error: message }, { status: 503 }));
  }
}

async function handleEnhance(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Content piece not found" }, { status: 404 }));
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece!;
  const formatType = piece.formatType as ContentFormatType;
  if (!isSeoLongformFormat(formatType)) {
    return withCors(
      request,
      Response.json(
        {
          error:
            "Enhance quality is available for blog posts, guides, and other long-form SEO formats",
        },
        { status: 400 },
      ),
    );
  }

  const brand = await loadBrandContextForProject(piece.websiteProjectId);
  if (!brand) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [{ userApiKey, aiProviderOptions }, existingPieceTitles, billingPrep] = await Promise.all([
    loadUserAiSettings(userId),
    loadExistingPieceTitles(piece.websiteProjectId),
    prepareAiBilling({ userId, tier: "rapid", quotaKind: "article" }),
  ]);
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  const enhanceBody = (await request.json().catch(() => null)) as { missingTerms?: unknown } | null;
  const missingTerms = Array.isArray(enhanceBody?.missingTerms)
    ? enhanceBody.missingTerms.filter((term): term is string => typeof term === "string")
    : undefined;

  try {
    let serpGaps: string[] = [];
    try {
      const serpRes = await handleSerpScore(request, contentPieceId, userId);
      if (serpRes.ok) {
        const dual = (await serpRes.json()) as { serp?: { gaps?: string[] } };
        serpGaps = dual.serp?.gaps ?? [];
      }
    } catch {
      // SERP gaps optional for enhance
    }

    const result = await enhanceContentPiece(
      {
        title: piece.title,
        targetKeyword: piece.targetKeyword ?? "",
        bodyMarkdown: piece.bodyMarkdown ?? "",
        formatType,
        brand: { ...brand, projectId: piece.websiteProjectId },
        metaDescription: piece.pieceMetadata?.metaDescription ?? null,
        serpGaps,
        missingTerms,
      },
      existingPieceTitles.filter((title) => title !== piece.title),
      userApiKey,
      aiProviderOptions,
      brand,
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        pieceMetadata: result.pieceMetadata ?? null,
        status: "draft",
      })
      .where(eq(contentPiecesTable.id, contentPieceId))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "content_enhance",
      usedByok: billingPrep.usedByok,
      tier: "rapid",
    });

    return withCors(request, Response.json(updated));
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx);
    const message = err instanceof Error ? err.message : "Enhancement failed";
    return withCors(request, Response.json({ error: message }, { status: 503 }));
  }
}

async function handleRepurpose(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const body = await request.json().catch(() => null);
  const parsed = repurposeBody.safeParse(body);
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Content piece not found" }, { status: 404 }));
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece!;
  const brand = await loadBrandContextForProject(piece.websiteProjectId);
  if (!brand) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId);
  const sourceContent = parsed.data.existingContent ?? piece.bodyMarkdown ?? "";

  const billingPrep = await prepareAiBilling({
    userId,
    tier: "execution",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  try {
    const result = await repurposeContentPiece(
      parsed.data.targetFormat as ContentFormatType,
      brand,
      sourceContent,
      piece.targetKeyword ?? "",
      userApiKey,
      aiProviderOptions,
    );

    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: piece.websiteProjectId,
        formatType: parsed.data.targetFormat as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        status: "draft",
        pieceMetadata: result.pieceMetadata ?? null,
      })
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "content_repurpose",
      usedByok: billingPrep.usedByok,
      tier: "execution",
    });

    return withCors(request, Response.json(inserted, { status: 201 }));
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx);
    const message = err instanceof Error ? err.message : "Repurpose failed";
    return withCors(request, Response.json({ error: message }, { status: 503 }));
  }
}

async function handleProjectRepurpose(
  request: Request,
  projectId: number,
  userId: number,
): Promise<Response> {
  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const parsed = repurposeFromTextBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 }),
    );
  }

  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const brand = await loadBrandContextForProject(projectId);
  if (!brand) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId);
  const billingPrep = await prepareAiBilling({ userId, tier: "execution", quotaKind: "article" });
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  try {
    const competitorContext = await loadCompetitorGenerationContext(projectId);
    const result = await repurposeContentPiece(
      parsed.data.targetFormat as ContentFormatType,
      brand,
      parsed.data.existingContent,
      parsed.data.targetKeyword,
      userApiKey,
      aiProviderOptions,
      { competitorPromptBlock: competitorContext.promptBlock || undefined },
    );

    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: projectId,
        formatType: parsed.data.targetFormat as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        status: "draft",
        pieceMetadata: result.pieceMetadata ?? null,
      })
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "content_repurpose",
      usedByok: billingPrep.usedByok,
      tier: "execution",
    });

    return withCors(request, Response.json(inserted, { status: 201 }));
  } catch {
    await cancelAiBilling(billingPrep.ctx);
    return withCors(request, Response.json({ error: "Failed to repurpose content" }, { status: 503 }));
  }
}

async function handleImagesRegenerate(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece!;
  const [[project], [brandProfile], billingPrep] = await Promise.all([
    db
      .select({ contentStyle: websiteProjectsTable.contentStyle })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
      .limit(1),
    db
      .select({ companyName: brandProfilesTable.companyName })
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, piece.websiteProjectId))
      .limit(1),
    prepareAiBilling({
      userId,
      tier: "rapid",
      quotaKind: "article",
      companyId: piece.websiteProjectId,
    }),
  ]);
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  let ai;
  try {
    const resolved = await resolveAiClientForUser(userId);
    ai = resolved.client;
  } catch {
    ai = undefined;
  }

  const excludeImageIds =
    piece.pieceMetadata?.images?.map((img) => `${img.provider}:${img.remoteId}`) ?? [];

  try {
    const stockCredentials = await loadStockCredentialContextForProject(piece.websiteProjectId);
    const enriched = await enrichContentPieceImages(
      {
        title: piece.title,
        target_keyword: piece.targetKeyword,
        body_markdown: piece.bodyMarkdown,
        formatType: piece.formatType,
        pieceMetadata: piece.pieceMetadata ?? undefined,
      },
      {
        imageSettings: parseImageSettings(project?.contentStyle ?? null),
        ai,
        brandName: brandProfile?.companyName ?? undefined,
        excludeImageIds,
        stockCredentials,
      },
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: enriched.body_markdown,
        pieceMetadata: enriched.pieceMetadata,
        wordCount: wordCountFromMarkdown(enriched.body_markdown),
      })
      .where(eq(contentPiecesTable.id, contentPieceId))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "image_regeneration",
      usedByok: billingPrep.usedByok,
      tier: "rapid",
      companyId: piece.websiteProjectId,
    });

    return withCors(request, Response.json({ piece: updated }));
  } catch (err) {
    await cancelAiBilling(
      billingPrep.ctx,
      err instanceof Error ? err.message : "image_regeneration_failed",
    );
    const message = err instanceof Error ? err.message : "Image regeneration failed";
    return withCors(request, Response.json({ error: message }, { status: 500 }));
  }
}
