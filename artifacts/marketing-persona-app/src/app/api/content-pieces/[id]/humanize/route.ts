import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { humanizeContentPiece } from "@workspace/content-engine/content/humanizer";
import { isHumanizableFormat } from "@workspace/content-engine/content/humanize-eligibility";
import { recordContentPieceVersion } from "@workspace/content-engine/content-piece-versions";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import {
  assertPieceOwner,
  loadProjectBrand,
  loadUserAiSettings,
  wordCountFromMarkdown,
} from "@/lib/content/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";

const AI_NOT_CONFIGURED_MESSAGE =
  "AI is not configured. Add your API key in Integrations → AI, or ask your admin to set a platform key.";

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
  if (!isHumanizableFormat(formatType)) {
    return NextResponse.json(
      { error: "Humanization is available for long-form SEO content and social posts" },
      { status: 400 },
    );
  }

  const ctx = await loadProjectBrand(piece!.websiteProjectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  try {
    await resolveAiClientForUser(userId!);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "AI provider is not configured";
    const message = /not configured|no gemini api key/i.test(detail)
      ? AI_NOT_CONFIGURED_MESSAGE
      : detail;
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const [{ userApiKey, aiProviderOptions }, billingPrep] = await Promise.all([
    loadUserAiSettings(userId!),
    prepareAiBilling({
      userId: userId!,
      tier: "execution",
      quotaKind: "article",
    }),
  ]);
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const { result, humanized, audit } = await humanizeContentPiece(
      {
        title: piece!.title,
        target_keyword: piece!.targetKeyword ?? "",
        body_markdown: piece!.bodyMarkdown ?? "",
        meta_description: piece!.pieceMetadata?.metaDescription,
        pieceMetadata: piece!.pieceMetadata ?? undefined,
      },
      ctx.brand,
      { userApiKey, aiProviderOptions, formatType: formatType },
    );

    // Snapshot the pre-humanize state before it's overwritten below.
    await recordContentPieceVersion({
      contentPieceId: id,
      title: piece!.title,
      bodyMarkdown: piece!.bodyMarkdown ?? "",
      pieceMetadata: piece!.pieceMetadata ?? null,
      changeType: "humanize",
      createdByUserId: userId!,
    });

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        pieceMetadata: result.pieceMetadata ?? null,
        status: "draft",
      })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "content_humanize",
      usedByok: billingPrep.usedByok,
      tier: "execution",
    });

    return NextResponse.json({
      ...updated,
      humanized,
      audit,
    });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx);
    const message = err instanceof Error ? err.message : "Humanization failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
