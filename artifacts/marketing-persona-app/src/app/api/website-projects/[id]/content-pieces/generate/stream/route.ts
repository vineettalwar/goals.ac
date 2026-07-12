import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
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
  buildPieceCacheKey,
  wordCountFromMarkdown,
} from "@/lib/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = rateLimitResponse(
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

  const { formatType, targetKeyword, angleHint, plannedDate } = parsed.data;
  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
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
        const cacheKeyStr = buildPieceCacheKey(formatType, targetKeyword, ctx.brand, angleHint);

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
            const [inserted] = await db
              .insert(contentPiecesTable)
              .values({
                websiteProjectId: projectId,
                formatType: formatType as ContentFormatType,
                title: aiCached.title,
                targetKeyword: aiCached.target_keyword,
                bodyMarkdown: aiCached.body_markdown,
                wordCount: wordCountFromMarkdown(aiCached.body_markdown),
                status: "draft",
                cacheKey: cacheKeyStr,
                plannedDate: plannedDate ?? null,
              })
              .returning();
            send("done", inserted);
            controller.close();
            return;
          }
        }

        let result;
        try {
          result = await generateContentPieceStream(
            formatType as ContentFormatType,
            ctx.brand,
            targetKeyword,
            (chunk) => send("chunk", { text: chunk }),
            angleHint,
            userApiKey,
            aiProviderOptions,
          );
        } catch {
          result = await generateContentPiece(
            formatType as ContentFormatType,
            ctx.brand,
            targetKeyword,
            angleHint,
            true,
            userApiKey,
            aiProviderOptions,
          );
        }

        await cacheSet(cacheKeyStr, result);

        const [inserted] = await db
          .insert(contentPiecesTable)
          .values({
            websiteProjectId: projectId,
            formatType: formatType as ContentFormatType,
            title: result.title,
            targetKeyword: result.target_keyword,
            bodyMarkdown: result.body_markdown,
            wordCount: wordCountFromMarkdown(result.body_markdown),
            status: "draft",
            cacheKey: cacheKeyStr,
            plannedDate: plannedDate ?? null,
          })
          .returning();

        send("done", inserted);
        controller.close();
      } catch (err) {
        console.error("Content piece generation failed:", err);
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
