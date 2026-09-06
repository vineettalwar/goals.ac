import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  CONTENT_FORMAT_TYPES,
  contentPiecesTable,
  type ContentFormatType,
} from "@workspace/db/schema-sqlite";
import {
  repurposeContentPiece,
} from "@workspace/content-engine/content/content-studio-generator";
import { createRefreshContentPiece } from "@workspace/content-engine/content/create-refresh-content-piece";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { loadCompetitorGenerationContext } from "@workspace/content-engine/support/competitor/competitor-generation-context";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { getAccessibleProject } from "./project-access";
import { loadPieceForUser, loadUserAiSettings, wordCountFromMarkdown } from "./content-pieces-ai";

const repurposeBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().optional(),
});

const repurposeFromTextBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().min(50, "Existing content must be at least 50 characters"),
  targetKeyword: z.string().min(1, "Target keyword is required"),
});

const refreshBody = z.object({
  url: z.string().url(),
  targetKeyword: z.string().min(1).max(200),
  secondaryKeywords: z.array(z.string().min(1).max(100)).max(12).optional(),
  bodyMarkdown: z.string().min(1).max(200_000).optional(),
  titleHint: z.string().min(1).max(300).optional(),
  confirmCanonical: z.boolean().optional(),
  refreshOf: z.number().int().positive().optional(),
  cmsRemoteId: z.string().min(1).max(40).optional(),
});

export async function handleRepurpose(
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

export async function handleProjectRepurpose(
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

export async function handleProjectRefresh(
  request: Request,
  projectId: number,
  userId: number,
): Promise<Response> {
  const limited = await rateLimitResponse(
    `refresh-import:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const parsed = refreshBody.safeParse(await request.json().catch(() => null));
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

  const result = await createRefreshContentPiece({
    projectId,
    ...parsed.data,
  });

  if (!result.ok) {
    return withCors(
      request,
      Response.json(
        {
          error: result.error,
          ...(result.pasteFallback ? { pasteFallback: true } : {}),
          ...(result.needsCanonicalConfirm
            ? {
                needsCanonicalConfirm: true,
                enteredUrl: result.enteredUrl,
                fetchedCanonicalUrl: result.fetchedCanonicalUrl,
                title: result.title,
              }
            : {}),
        },
        { status: result.status },
      ),
    );
  }

  return withCors(
    request,
    Response.json({ piece: result.piece, warnings: result.warnings }, { status: 201 }),
  );
}
