import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  contentPiecesTable,
  type ContentFormatType,
} from "@workspace/db/schema-sqlite";
import {
  buildCacheKey,
  generateContentPiece,
} from "@workspace/content-engine/content/content-studio-generator";
import { enhanceContentPiece } from "@workspace/content-engine/content/content-piece-enhance";
import { isSeoLongformFormat } from "@workspace/content-engine/content/content-piece-seo";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import {
  loadPieceForUser,
  loadUserAiSettings,
  loadExistingPieceTitles,
  wordCountFromMarkdown,
} from "./content-pieces-ai";

const regenerateBody = z.object({
  angleHint: z.string().optional(),
});

export async function handleSerpScore(
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

export async function handleRegenerate(
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

export async function handleEnhance(
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
