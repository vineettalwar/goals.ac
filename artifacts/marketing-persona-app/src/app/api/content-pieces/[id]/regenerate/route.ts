import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  generateContentPiece,
  buildCacheKey,
} from "@workspace/content-engine/content-studio-generator";
import {
  assertPieceOwner,
  loadProjectBrand,
  loadUserAiSettings,
  wordCountFromMarkdown,
  loadExistingPieceTitles,
} from "@/lib/content/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { z } from "zod";

const RegenerateBody = z.object({
  angleHint: z.string().optional(),
});

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

  const body = await req.json().catch(() => ({}));
  const parsed = RegenerateBody.safeParse(body);

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const ctx = await loadProjectBrand(piece!.websiteProjectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const angleHint = parsed.success ? parsed.data.angleHint : undefined;
  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
    usedByok: Boolean(userApiKey),
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const existingPieceTitles = await loadExistingPieceTitles(piece!.websiteProjectId);
    const result = await generateContentPiece(
      piece!.formatType as ContentFormatType,
      ctx.brand,
      piece!.targetKeyword ?? "",
      angleHint,
      true,
      userApiKey,
      aiProviderOptions,
      { existingPieceTitles },
    );

    const cacheKeyStr = buildCacheKey(piece!.formatType, piece!.targetKeyword ?? "", ctx.brand, angleHint);

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
      .where(eq(contentPiecesTable.id, id))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "content_regenerate",
      usedByok: billingPrep.usedByok,
      tier: "execution",
      promptTokens: result.generationUsage?.promptTokens,
      outputTokens: result.generationUsage?.outputTokens,
      totalTokens: result.generationUsage?.totalTokens,
    });

    return NextResponse.json(updated);
  } catch {
    await cancelAiBilling(billingPrep.ctx);
    return NextResponse.json({ error: "Regeneration failed" }, { status: 503 });
  }
}
