import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  generateContentPiece,
  cacheGet,
  cacheSet,
  generateContentPieceStream,
} from "@workspace/content-engine/content/content-studio-generator";
import {
  GenerateBody,
  loadProjectBrand,
  loadUserAiSettings,
  buildCacheKey,
  insertGeneratedContentPiece,
  loadBriefForProject,
  loadGenerationContext,
} from "@/lib/content/content-pieces-helpers";
import {
  billingDeniedResponse,
  cancelAiBilling,
  completeAiBilling,
  prepareAiBilling,
} from "@/lib/billing/ai-billing";
import { logger } from "@/lib/utils/logger";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { edgeStreamingBlocked } from "@/lib/cf-edge-http";

const sseHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const blocked = edgeStreamingBlocked();
  if (blocked) return blocked;

  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) {
    return new Response(JSON.stringify({ error: "Invalid project id" }), { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = GenerateBody.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.errors[0]?.message ?? "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { formatType, targetKeyword, angleHint, plannedDate, briefId, intendedPublishPlatform, intendedOutputMode, intendedEditorMode, competitorFocusUrl } = parsed.data;
  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  }

  if (briefId) {
    const brief = await loadBriefForProject(briefId, projectId, userId!);
    if (!brief) {
      return new Response(JSON.stringify({ error: "Brief not found" }), { status: 404 });
    }
    if (brief.status !== "approved" && brief.status !== "generating" && brief.status !== "done") {
      return new Response(
        JSON.stringify({
          error: "brief_not_approved",
          message: "Approve this brief in Goals & Briefs before generating content.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
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
  const encoder = new TextEncoder();

  if (!bypassCache) {
    const [existing] = await db
      .select()
      .from(contentPiecesTable)
      .where(and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.cacheKey, cacheKeyStr)))
      .limit(1);
    if (existing) {
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`event: cached\ndata: ${JSON.stringify(existing)}\n\n`));
            controller.close();
          },
        }),
        { headers: sseHeaders },
      );
    }

    const aiCached = await cacheGet(cacheKeyStr);
    if (aiCached) {
      return new Response(
        new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };
            try {
              send("chunk", { text: aiCached.body_markdown });
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
              send("done", inserted);
            } catch (err) {
              logger.error({ err, projectId, formatType, targetKeyword }, "Content piece generation failed");
              const message =
                err instanceof Error && err.message
                  ? err.message
                  : "Generation failed. Please try again.";
              send("error", { error: message });
            } finally {
              controller.close();
            }
          },
        }),
        { headers: sseHeaders },
      );
    }
  }

  const [{ userApiKey, aiProviderOptions }, billingPrep] = await Promise.all([
    loadUserAiSettings(userId!),
    prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
  }),  ]);
  if (!billingPrep.ok) return billingDeniedResponse(billingPrep);

  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let result;
          try {
            result = await generateContentPieceStream(
              formatType,
              ctx.brand,
              targetKeyword,
              (chunk) => send("chunk", { text: chunk }),
              angleHint,
              userApiKey,
              aiProviderOptions,
              generationContext,
            );
          } catch (streamErr) {
            logger.warn({ err: streamErr, projectId, formatType }, "Stream generation failed, falling back");
            result = await generateContentPiece(
              formatType,
              ctx.brand,
              targetKeyword,
              angleHint,
              true,
              userApiKey,
              aiProviderOptions,
              generationContext,
            );
          }

          await cacheSet(cacheKeyStr, result);

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
            companyId: projectId,
            promptTokens: result.generationUsage?.promptTokens,
            outputTokens: result.generationUsage?.outputTokens,
            totalTokens: result.generationUsage?.totalTokens,
          });

          send("done", inserted);
        } catch (err) {
          await cancelAiBilling(billingPrep.ctx);
          logger.error({ err, projectId, formatType, targetKeyword }, "Content piece generation failed");
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Generation failed. Please try again.";
          send("error", { error: message });
        } finally {
          controller.close();
        }
      },
    }),
    { headers: sseHeaders },
  );
}
