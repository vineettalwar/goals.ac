import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { enhanceContentPiece } from "@workspace/content-engine/content/content-piece-enhance";
import { ingestPublishedContentPiece } from "@workspace/content-engine/support/brand/brand-voice-generation";
import { isSeoLongformFormat } from "@workspace/content-engine/content/content-piece-seo";
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
  _req: Request,
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

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") {
    return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  }
  if (ownerError === "forbidden") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const formatType = piece!.formatType as ContentFormatType;
  if (!isSeoLongformFormat(formatType)) {
    return NextResponse.json(
      { error: "Enhance quality is available for blog posts, guides, and other long-form SEO formats" },
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
    const result = await enhanceContentPiece(
      {
        title: piece!.title,
        targetKeyword: piece!.targetKeyword ?? "",
        bodyMarkdown: piece!.bodyMarkdown ?? "",
        formatType,
        brand: { ...ctx.brand, projectId: ctx.projectId },
        metaDescription: piece!.pieceMetadata?.metaDescription ?? null,
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
