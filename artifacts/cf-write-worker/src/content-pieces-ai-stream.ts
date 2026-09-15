/**
 * Create+generate SSE for Content Studio (Vite app).
 * Primary path is `runAgentLoop` then the shared studio generator (streamed).
 */
import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  contentPiecesTable,
  websiteProjectsTable,
  type ContentFormatType,
} from "@workspace/db/schema-sqlite";
import {
  buildCacheKey,
  cacheGet,
  cacheSet,
  generateContentPiece,
  AgentPipelineError,
} from "@workspace/content-engine/content/content-studio-generator";
import {
  loopMetaFromRun,
  runResearchThenDraftLoop,
  studioDraftFromKeyword,
  STUDIO_AGENT_LOOP_CAPS,
} from "@workspace/content-engine/agent-loop";
import { evaluateProjectVoiceReady } from "@workspace/content-engine/brand/project-voice-ready";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { CONTENT_FORMAT_TYPES } from "@workspace/db/schema-sqlite";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { getAccessibleProject } from "./project-access";
import {
  loadExistingPieceTitles,
  loadUserAiSettings,
  wordCountFromMarkdown,
} from "./content-pieces-ai";

const generateStreamBody = z.object({
  formatType: z.enum(CONTENT_FORMAT_TYPES),
  targetKeyword: z.string().trim().min(1),
  angleHint: z.string().optional(),
  plannedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  briefId: z.number().int().positive().optional(),
  intendedPublishPlatform: z.string().trim().min(1).optional(),
  competitorFocusUrl: z.string().trim().min(1).optional(),
  competitorUrls: z.array(z.string().trim().min(1)).max(5).optional(),
  useAgentTeam: z.boolean().optional(),
  agentFastMode: z.boolean().optional(),
  title: z.string().trim().min(1).optional(),
});

const sseHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

export async function handleProjectGenerateStream(
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

  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const parsed = generateStreamBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const {
    formatType,
    targetKeyword,
    angleHint,
    plannedDate,
    briefId,
    intendedPublishPlatform,
    competitorFocusUrl,
    competitorUrls,
  } = parsed.data;

  const brand = await loadBrandContextForProject(projectId);
  if (!brand) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [projectRow] = await db
    .select({ scrapeStatus: websiteProjectsTable.scrapeStatus })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const evaluation = evaluateProjectVoiceReady({
    scrapeStatus: projectRow?.scrapeStatus ?? null,
    voiceTone: brand.voiceTone,
    writingExamples: brand.writingExamples,
    brandVoiceSkill: brand.brandVoiceSkill,
    platformVoices: brand.platformVoices,
  });
  if (!evaluation.ready) {
    return withCors(
      request,
      Response.json(
        {
          code: "voice_required",
          error: evaluation.building
            ? "Brand voice is still scanning. Try again in a moment."
            : "Add a brand voice (or connect social) before generating.",
          scrapeStatus: evaluation.scrapeStatus,
        },
        { status: 409 },
      ),
    );
  }

  const generationContext = {
    competitorFocusUrl,
    competitorUrls,
    intendedPublishPlatform,
    existingPieceTitles: await loadExistingPieceTitles(projectId),
  };

  const cacheKeyStr = buildCacheKey(
        formatType,
        targetKeyword,
        brand,
        angleHint,
        intendedPublishPlatform,
        competitorFocusUrl,
        competitorUrls,
      );

  if (cacheKeyStr) {
    const [existing] = await db
      .select()
      .from(contentPiecesTable)
      .where(
        and(
          eq(contentPiecesTable.websiteProjectId, projectId),
          eq(contentPiecesTable.cacheKey, cacheKeyStr),
        ),
      )
      .limit(1);
    if (existing) {
      const encoder = new TextEncoder();
      return withCors(
        request,
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(`event: cached\ndata: ${JSON.stringify(existing)}\n\n`),
              );
              controller.close();
            },
          }),
          { headers: sseHeaders },
        ),
      );
    }

    const aiCached = await cacheGet(cacheKeyStr);
    if (aiCached) {
      const encoder = new TextEncoder();
      return withCors(
        request,
        new Response(
          new ReadableStream({
            async start(controller) {
              const send = (event: string, data: unknown) => {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                );
              };
              try {
                const [inserted] = await db
                  .insert(contentPiecesTable)
                  .values({
                    websiteProjectId: projectId,
                    briefId: briefId ?? null,
                    formatType: formatType as ContentFormatType,
                    title: aiCached.title,
                    targetKeyword: aiCached.target_keyword,
                    bodyMarkdown: aiCached.body_markdown,
                    wordCount: wordCountFromMarkdown(aiCached.body_markdown),
                    status: "draft",
                    cacheKey: cacheKeyStr,
                    plannedDate: plannedDate ?? null,
                    pieceMetadata: aiCached.pieceMetadata ?? null,
                  })
                  .returning();
                send("cached", inserted);
              } catch (err) {
                const message = err instanceof Error ? err.message : "Cache insert failed";
                send("error", { error: message });
              } finally {
                controller.close();
              }
            },
          }),
          { headers: sseHeaders },
        ),
      );
    }
  }

  const billingTier = "execution";
  const [{ userApiKey, aiProviderOptions }, billingPrep] = await Promise.all([
    loadUserAiSettings(userId),
    prepareAiBilling({ userId, tier: billingTier, quotaKind: "article" }),
  ]);
  if (!billingPrep.ok) return withCors(request, billingPrep.response);

  const encoder = new TextEncoder();
  return withCors(
    request,
    new Response(
      new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          };

          try {
            const generatedHolder: { value?: Awaited<ReturnType<typeof generateContentPiece>> } = {};
            const loop = await runResearchThenDraftLoop({
              projectId,
              userId,
              keyword: targetKeyword,
              caps: STUDIO_AGENT_LOOP_CAPS,
              onPersist: (run) => {
                const step = run.trajectory.at(-1);
                if (step) send("agent", { type: "loop_step", ...step, runStatus: run.status });
              },
              generateDraft: async () => {
                let out = await studioDraftFromKeyword({
                  projectId,
                  userId,
                  format: formatType as ContentFormatType,
                  keyword: targetKeyword,
                  angleHint,
                  bypassCache: true,
                  userApiKey,
                  aiProviderOptions,
                  generationContext,
                  streamChunk: (chunk: string) => send("chunk", { text: chunk }),
                  brand,
                });
                if (!out.generated) {
                  out = await studioDraftFromKeyword({
                    projectId,
                    userId,
                    format: formatType as ContentFormatType,
                    keyword: targetKeyword,
                    angleHint,
                    bypassCache: true,
                    userApiKey,
                    aiProviderOptions,
                    generationContext,
                    brand,
                  });
                }
                generatedHolder.value = out.generated;
                return out.tool;
              },
            });
            const result = generatedHolder.value;
            if (!result) {
              throw new Error(loop.stopReason ?? "Agent loop did not produce a draft");
            }

            if (cacheKeyStr) await cacheSet(cacheKeyStr, result);

            const [inserted] = await db
              .insert(contentPiecesTable)
              .values({
                websiteProjectId: projectId,
                briefId: briefId ?? null,
                formatType: formatType as ContentFormatType,
                title: result.title,
                targetKeyword: result.target_keyword,
                bodyMarkdown: result.body_markdown,
                wordCount: wordCountFromMarkdown(result.body_markdown),
                status: "draft",
                cacheKey: cacheKeyStr ?? null,
                plannedDate: plannedDate ?? null,
                pieceMetadata: {
                  ...(result.pieceMetadata ?? {}),
                  ...loopMetaFromRun(loop),
                },
              })
              .returning();

            await completeAiBilling(billingPrep.ctx, {
              userId,
              eventType: "content_generation",
              usedByok: billingPrep.usedByok,
              tier: billingTier,
              companyId: projectId,
              promptTokens: result.generationUsage?.promptTokens,
              outputTokens: result.generationUsage?.outputTokens,
              totalTokens: result.generationUsage?.totalTokens,
            });

            send("done", inserted);
          } catch (err) {
            await cancelAiBilling(billingPrep.ctx);
            if (err instanceof AgentPipelineError) {
              send("error", {
                error: err.message,
                code: err.code,
                agentId: err.agentId,
                retryable: err.retryable,
              });
            } else {
              const message =
                err instanceof Error && err.message
                  ? err.message
                  : "Generation failed. Please try again.";
              send("error", { error: message });
            }
          } finally {
            controller.close();
          }
        },
      }),
      { headers: sseHeaders },
    ),
  );
}
