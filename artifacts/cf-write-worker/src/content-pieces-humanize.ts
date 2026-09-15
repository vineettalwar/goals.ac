import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  contentPiecesTable,
  type ContentFormatType,
  type ContentPieceMetadata,
} from "@workspace/db/schema-sqlite";
import { humanizeContentPiece } from "@workspace/content-engine/content/humanizer";
import { isHumanizableFormat } from "@workspace/content-engine/content/humanize-eligibility";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { eq } from "drizzle-orm";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { assertAiGenerationReady, loadPieceForUser, wordCountFromMarkdown } from "./content-pieces-shared";

export async function handleContentPieceHumanize(
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
    return withCors(
      request,
      Response.json({ error: "Content piece not found" }, { status: 404 }),
    );
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece!;
  const formatType = piece.formatType as ContentFormatType;
  if (!isHumanizableFormat(formatType)) {
    return withCors(
      request,
      Response.json(
        {
          error: "Humanization is available for long-form SEO content and social posts",
        },
        { status: 400 },
      ),
    );
  }

  const brand = await loadBrandContextForProject(piece.websiteProjectId);
  if (!brand) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const aiReady = await assertAiGenerationReady(userId);
  if (!aiReady.ok) {
    return withCors(request, Response.json({ error: aiReady.message }, { status: 503 }));
  }

  const [{ userApiKey, aiProviderOptions }, billingPrep] = await Promise.all([
    Promise.all([getDecryptedUserGeminiKey(userId), getUserAiProviderOptions(userId)]).then(
      ([key, options]) => ({ userApiKey: key, aiProviderOptions: options }),
    ),
    prepareAiBilling({
      userId,
      tier: "execution",
      quotaKind: "article",
    }),
  ]);

  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  try {
    const { result, humanized, audit } = await humanizeContentPiece(
      {
        title: piece.title,
        target_keyword: piece.targetKeyword ?? "",
        body_markdown: piece.bodyMarkdown ?? "",
        meta_description: piece.pieceMetadata?.metaDescription,
        pieceMetadata: piece.pieceMetadata ?? undefined,
      },
      brand,
      { userApiKey, aiProviderOptions, formatType: piece.formatType as ContentFormatType },
    );

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        pieceMetadata: result.pieceMetadata ?? null,
        status: "draft",
      })
      .where(eq(contentPiecesTable.id, contentPieceId))
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId,
      eventType: "content_humanize",
      usedByok: billingPrep.usedByok,
      tier: "execution",
    });

    return withCors(
      request,
      Response.json({
        ...updated,
        humanized,
        audit,
      }),
    );
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx);
    const message = err instanceof Error ? err.message : "Humanization failed";
    return withCors(request, Response.json({ error: message }, { status: 503 }));
  }
}

export async function handleContentPieceRevertHumanize(
  request: Request,
  contentPieceId: number,
  userId: number,
): Promise<Response> {
  const access = await loadPieceForUser(contentPieceId, userId);
  if (access.error === "not_found") {
    return withCors(
      request,
      Response.json({ error: "Content piece not found" }, { status: 404 }),
    );
  }
  if (access.error === "forbidden") {
    return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
  }

  const piece = access.piece!;
  const meta = (piece.pieceMetadata as ContentPieceMetadata | null) ?? null;
  const snapshot = meta?.preHumanizeBodyMarkdown;
  if (!snapshot) {
    return withCors(
      request,
      Response.json({ error: "No humanize snapshot to revert to" }, { status: 400 }),
    );
  }

  const { preHumanizeBodyMarkdown: _snapshot, humanizationAudit: _audit, ...restMeta } = meta;
  const nextMeta: ContentPieceMetadata = { ...restMeta, humanized: false };

  const [updated] = await db
    .update(contentPiecesTable)
    .set({
      bodyMarkdown: snapshot,
      wordCount: wordCountFromMarkdown(snapshot),
      pieceMetadata: Object.keys(nextMeta).length > 0 ? nextMeta : null,
      status: "draft",
    })
    .where(eq(contentPiecesTable.id, contentPieceId))
    .returning();

  return withCors(request, Response.json(updated));
}
