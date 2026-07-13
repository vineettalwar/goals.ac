import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import {
  generateContentPiece,
  cacheGet,
  cacheSet,
  generateContentPieceStream,
} from "@workspace/content-engine/content-studio-generator";
import {
  GenerateBody,
  loadProjectBrand,
  loadUserAiSettings,
  buildCacheKey,
  insertGeneratedContentPiece,
  loadBriefForProject,
  loadExistingPieceTitles,
} from "@/lib/content-pieces-helpers";
import { logger } from "@/lib/logger";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

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

  const { formatType, targetKeyword, angleHint, plannedDate, briefId } = parsed.data;
  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  }

  if (briefId) {
    const brief = await loadBriefForProject(briefId, projectId, userId!);
    if (!brief) {
      return new Response(JSON.stringify({ error: "Brief not found" }), { status: 404 });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const bypassCache = req.headers.get("x-bypass-cache") === "true";
        const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
        const cacheKeyStr = buildCacheKey(formatType, targetKeyword, ctx.brand, angleHint);
        const existingPieceTitles = await loadExistingPieceTitles(projectId);
        const generationContext = { existingPieceTitles };

        if (!bypassCache) {
          const [existing] = await db
            .select()
            .from(contentPiecesTable)
            .where(and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.cacheKey, cacheKeyStr)))
            .limit(1);
          if (existing) {
            send("cached", existing);
            controller.close();
            return;
          }

          const aiCached = await cacheGet(cacheKeyStr);
          if (aiCached) {
            send("chunk", { text: aiCached.body_markdown });
            const inserted = await insertGeneratedContentPiece({
              projectId,
              briefId,
              formatType,
              result: aiCached,
              cacheKey: cacheKeyStr,
              plannedDate,
            });
            send("done", inserted);
            controller.close();
            return;
          }
        }

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
        });

        send("done", inserted);
        controller.close();
      } catch (err) {
        logger.error({ err, projectId, formatType, targetKeyword }, "Content piece generation failed");
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Generation failed. Please try again.";
        send("error", { error: message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
