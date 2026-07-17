import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  keywordRankSnapshotsTable,
  trackedKeywordsTable,
} from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { enhanceContentPiece } from "@workspace/content-engine/content/content-piece-enhance";
import { scoreDualContentQuality } from "@workspace/content-engine/articles/serp-content-score";
import { ingestPublishedContentPiece } from "@workspace/content-engine/support/brand/brand-voice-generation";
import { isSeoLongformFormat } from "@workspace/content-engine/content/content-piece-seo";
import { isHumanizableSocialFormat } from "@workspace/content-engine/content/humanize-eligibility";
import { isSerpConfigured, getSerpProvider } from "@workspace/serp-provider";
import {
  assertPieceOwner,
  loadProjectBrand,
  loadUserAiSettings,
  loadExistingPieceTitles,
  wordCountFromMarkdown,
} from "@/lib/content/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { missingTerms?: unknown } | null;
  const missingTerms = Array.isArray(body?.missingTerms)
    ? body.missingTerms.filter((term): term is string => typeof term === "string")
    : undefined;

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") {
    return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  }
  if (ownerError === "forbidden") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const formatType = piece!.formatType as ContentFormatType;
  if (!isSeoLongformFormat(formatType) && !isHumanizableSocialFormat(formatType)) {
    return NextResponse.json(
      { error: "Enhance is available for long-form SEO content and social posts" },
      { status: 400 },
    );
  }

  const ctx = await loadProjectBrand(piece!.websiteProjectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const [{ userApiKey, aiProviderOptions }, existingPieceTitles, billingPrep] = await Promise.all([
    loadUserAiSettings(userId!),
    loadExistingPieceTitles(piece!.websiteProjectId),
    prepareAiBilling({
      userId: userId!,
      tier: "rapid",
      quotaKind: "article",
    }),
  ]);
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const meta = (piece!.pieceMetadata ?? {}) as {
      seoTitle?: string;
      metaTitle?: string;
      metaDescription?: string;
      citations?: { text: string; url: string }[];
      faqSection?: { question: string; answer: string }[];
      jsonLdSchema?: object;
      internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
    };
    let serpFeatures: Record<string, unknown> | null = null;
    const keyword = piece!.targetKeyword?.trim();
    if (keyword) {
      const [tracked] = await db
        .select({ id: trackedKeywordsTable.id })
        .from(trackedKeywordsTable)
        .where(
          and(
            eq(trackedKeywordsTable.websiteProjectId, piece!.websiteProjectId),
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
      if (!serpFeatures && isSerpConfigured()) {
        try {
          serpFeatures = (await getSerpProvider().checkRank({ keyword })).serpFeatures;
        } catch {
          // optional
        }
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
    const dual = scoreDualContentQuality({
      bodyMarkdown: piece!.bodyMarkdown ?? "",
      wordCount: piece!.wordCount ?? undefined,
      metaTitle: meta.seoTitle ?? meta.metaTitle ?? piece!.title,
      metaDescription: meta.metaDescription,
      targetKeyword: keyword,
      citations: meta.citations,
      faqSection: meta.faqSection,
      jsonLdSchema: meta.jsonLdSchema,
      internalLinkSuggestions: meta.internalLinkSuggestions,
      serpFeatures,
      peopleAlsoAsk,
      competitorTitles,
    });

    const result = await enhanceContentPiece(
      {
        title: piece!.title,
        targetKeyword: piece!.targetKeyword ?? "",
        bodyMarkdown: piece!.bodyMarkdown ?? "",
        formatType,
        brand: { ...ctx.brand, projectId: ctx.projectId },
        metaDescription: piece!.pieceMetadata?.metaDescription ?? null,
        serpGaps: dual.serp.gaps,
        missingTerms,
      },
      existingPieceTitles.filter((title) => title !== piece!.title),
      userApiKey,
      aiProviderOptions,
      ctx.brand,
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
      .where(eq(contentPiecesTable.id, id))
      .returning();

    ingestPublishedContentPiece(
      piece!.websiteProjectId,
      id,
      result.title,
      result.body_markdown,
      updated?.publishedUrl ?? null,
    ).catch(() => {});

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "content_enhance",
      usedByok: billingPrep.usedByok,
      tier: "rapid",
    });

    return NextResponse.json(updated);
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx);
    const message = err instanceof Error ? err.message : "Enhancement failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
