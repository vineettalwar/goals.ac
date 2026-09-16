import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  generateContentPiece,
  cacheGet,
  cacheSet,
  AgentPipelineError,
} from "@workspace/content-engine/content/content-studio-generator";
import {
  loopMetaFromRun,
  runResearchThenDraftLoop,
  studioDraftFromKeyword,
  STUDIO_AGENT_LOOP_CAPS,
} from "@workspace/content-engine/agent-loop";
import {
  GenerateBody,
  loadProjectBrand,
  loadProjectVoiceGate,
  voiceRequiredJsonBody,
  loadUserAiSettings,
  buildCacheKey,
  insertGeneratedContentPiece,
  loadBriefForProject,
  loadGenerationContext,
  withBedrockModelOverride,
  persistOrgBedrockModel,
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
import { resolveProviderId } from "@workspace/ai-providers/config";

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

  const {
    formatType,
    targetKeyword,
    angleHint,
    plannedDate,
    briefId,
    intendedPublishPlatform,
    intendedOutputMode,
    intendedEditorMode,
    competitorFocusUrl,
    competitorUrls,
    cmsCategories,
    cmsTags,
    bedrockModel,
    saveBedrockModel,
  } = parsed.data;
  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  }

  const { evaluation } = await loadProjectVoiceGate(projectId);
  if (!evaluation.ready) {
    return new Response(JSON.stringify(voiceRequiredJsonBody(evaluation)), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (saveBedrockModel && bedrockModel) {
    const { requireSiteAdmin } = await import("@/lib/auth/require-site-admin");
    const { getOrgAiSettingsForUser } = await import(
      "@workspace/content-engine/support/ai/org-ai-settings"
    );
    const admin = await requireSiteAdmin();
    if (!admin.error && admin.userId === userId) {
      const orgSettings = await getOrgAiSettingsForUser(userId!);
      if (orgSettings) {
        await persistOrgBedrockModel(orgSettings.organizationId, bedrockModel);
      }
    }
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
    competitorUrls,
    targetKeyword,
    briefId,
  });

  const bypassCache = req.headers.get("x-bypass-cache") === "true";
  const cacheKeyStr = buildCacheKey(
    formatType,
    targetKeyword,
    ctx.brand,
    angleHint,
    generationContext.intendedPublishPlatform,
    generationContext.competitorFocusUrl,
    generationContext.competitorUrls,
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
                angleHint,
                cmsCategories,
                cmsTags,
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

  const billingTier = "execution";

  const [{ userApiKey, aiProviderOptions: baseAiOptions }, billingPrep] = await Promise.all([
    loadUserAiSettings(userId!),
    prepareAiBilling({
      userId: userId!,
      tier: billingTier,
      quotaKind: "article",
    }),
  ]);
  if (!billingPrep.ok) return billingDeniedResponse(billingPrep);
  const aiProviderOptions = withBedrockModelOverride(baseAiOptions, bedrockModel);

  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
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
                if (!step && run.id) send("agent", { type: "run", agentRunId: run.id, runStatus: run.status });
                if (step) send("agent", { type: "loop_step", ...step, runStatus: run.status, agentRunId: run.id });
              },
            generateDraft: async () => {
              let out = await studioDraftFromKeyword({
                projectId,
                userId,
                format: formatType,
                keyword: targetKeyword,
                angleHint,
                bypassCache: true,
                userApiKey,
                aiProviderOptions,
                generationContext,
                streamChunk: (chunk: string) => send("chunk", { text: chunk }),
                brand: ctx.brand,
              });
              if (!out.generated) {
                out = await studioDraftFromKeyword({
                  projectId,
                  userId,
                  format: formatType,
                  keyword: targetKeyword,
                  angleHint,
                  bypassCache: true,
                  userApiKey,
                  aiProviderOptions,
                  generationContext,
                  brand: ctx.brand,
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
          result.pieceMetadata = { ...(result.pieceMetadata ?? {}), ...loopMetaFromRun(loop) };

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
            angleHint,
            cmsCategories,
            cmsTags,
          });

          await completeAiBilling(billingPrep.ctx, {
            userId: userId!,
            eventType: "content_generation",
            usedByok: billingPrep.usedByok,
            tier: billingTier,
            provider: resolveProviderId(aiProviderOptions),
            model: aiProviderOptions.ollamaModel ?? aiProviderOptions.bedrock?.model ?? undefined,
            promptTokens: result.generationUsage?.promptTokens,
            outputTokens: result.generationUsage?.outputTokens,
            totalTokens: result.generationUsage?.totalTokens,
          });

          send("done", inserted);
        } catch (err) {
          await cancelAiBilling(billingPrep.ctx);
          logger.error({ err, projectId, formatType, targetKeyword }, "Content piece generation failed");

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
  );
}
