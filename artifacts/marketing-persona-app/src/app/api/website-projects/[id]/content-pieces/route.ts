import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  generateContentPiece,
  cacheGet,
} from "@workspace/content-engine/content-studio-generator";
import {
  GenerateBody,
  loadProjectBrand,
  loadUserAiSettings,
  buildCacheKey,
  insertGeneratedContentPiece,
  loadBriefForProject,
  loadExistingPieceTitles,
  loadGenerationContext,
} from "@/lib/content/content-pieces-helpers";
import { logger } from "@/lib/utils/logger";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";

const ALLOWED_STATUSES = ["draft", "ready", "published"] as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const status =
    statusFilter && ALLOWED_STATUSES.includes(statusFilter as (typeof ALLOWED_STATUSES)[number])
      ? (statusFilter as (typeof ALLOWED_STATUSES)[number])
      : null;

  const pieces = await db
    .select()
    .from(contentPiecesTable)
    .where(
      status
        ? and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.status, status))
        : eq(contentPiecesTable.websiteProjectId, projectId),
    )
    .orderBy(desc(contentPiecesTable.createdAt));

  return NextResponse.json({ pieces });
}

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
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = GenerateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { formatType, targetKeyword, angleHint, plannedDate, briefId, intendedPublishPlatform, intendedOutputMode, intendedEditorMode, competitorFocusUrl } = parsed.data;
  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (briefId) {
    const brief = await loadBriefForProject(briefId, projectId, userId!);
    if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  const generationContext = await loadGenerationContext(projectId, {
    formatType,
    intendedPublishPlatform,
    intendedOutputMode,
    intendedEditorMode,
    competitorFocusUrl,
  });

  const bypassCache = req.headers.get("x-bypass-cache") === "true";
  const cacheKeyStr = buildCacheKey(
    formatType,
    targetKeyword,
    ctx.brand,
    angleHint,
    generationContext.intendedPublishPlatform,
    generationContext.competitorFocusUrl,
  );

  if (!bypassCache) {
    const [existing] = await db
      .select()
      .from(contentPiecesTable)
      .where(and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.cacheKey, cacheKeyStr)))
      .limit(1);
    if (existing) {
      return NextResponse.json(existing, { headers: { "X-Cache": "HIT" } });
    }
  }

  if (!bypassCache) {
    const aiCached = await cacheGet(cacheKeyStr);
    if (aiCached) {
      const inserted = await insertGeneratedContentPiece({
        projectId,
        briefId,
        formatType,
        result: aiCached,
        cacheKey: cacheKeyStr,
        plannedDate,
        intendedPublishPlatform: generationContext.resolvedIntendedPlatform,
        intendedOutputMode: generationContext.intendedOutputMode,
        intendedEditorMode: generationContext.intendedEditorMode,
      });
      return NextResponse.json(inserted, { status: 201, headers: { "X-Cache": "HIT" } });
    }
  }

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
    usedByok: Boolean(userApiKey),
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const result = await generateContentPiece(
      formatType,
      ctx.brand,
      targetKeyword,
      angleHint,
      bypassCache,
      userApiKey,
      aiProviderOptions,
      generationContext,
    );

    const inserted = await insertGeneratedContentPiece({
      projectId,
      briefId,
      formatType,
      result,
      cacheKey: cacheKeyStr,
      plannedDate,
      intendedPublishPlatform: generationContext.resolvedIntendedPlatform,
      intendedOutputMode: generationContext.intendedOutputMode,
      intendedEditorMode: generationContext.intendedEditorMode,
    });

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "content_generation",
      usedByok: billingPrep.usedByok,
      tier: "execution",
      promptTokens: result.generationUsage?.promptTokens,
      outputTokens: result.generationUsage?.outputTokens,
      totalTokens: result.generationUsage?.totalTokens,
    });

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx);
    logger.error({ err, projectId, formatType, targetKeyword }, "Content piece generation failed");
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Failed to generate content. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
