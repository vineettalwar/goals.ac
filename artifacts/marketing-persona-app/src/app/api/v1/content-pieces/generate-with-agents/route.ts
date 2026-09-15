import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, type ContentFormatType } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  assertProjectInOrg,
  resolveOrgBillingUserId,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { generateContentPieceWithAgents, AgentPipelineError } from "@workspace/content-engine/content/content-studio-generator";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { evaluateProjectVoiceReady } from "@workspace/content-engine/brand/project-voice-ready";
import {
  loadGenerationContext,
  insertGeneratedContentPiece,
  voiceRequiredJsonBody,
} from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { requireApiKeyScope, withPublicApiKey } from "@/lib/public-api/auth";
import { logger } from "@/lib/utils/logger";

interface GenerateWithAgentsRequestBody {
  projectId?: number;
  formatType?: ContentFormatType;
  targetKeyword?: string;
  angleHint?: string;
  intendedPublishPlatform?: string;
  competitorFocusUrl?: string;
  competitorUrls?: string[];
  plannedDate?: string;
  /** Use fast mode (skip marketing and linguist agents) */
  fastMode?: boolean;
  /** Stream agent progress events via SSE */
  stream?: boolean;
}

/**
 * Generate content using the AI agent team pipeline.
 *
 * This endpoint runs all 8 specialist agents in sequence:
 * Owl (Strategy) → Ferret (Research) → Hummingbird (Write) →
 * Spider (SEO) → Fox (Marketing) → Mockingbird (Language) →
 * Hawk (Edit) → Chameleon (Voice)
 *
 * Set `stream: true` to receive SSE events for each agent's progress.
 */
/**
 * @deprecated Public compatibility only. Prefer Studio generate (employee loop).
 * This still runs the named-agent pipeline (Owl → … → Chameleon).
 */
export async function POST(req: Request) {
  return withPublicApiKey(req, async (key) => {
    requireApiKeyScope(key, "content:generate");

    const body = (await req.json().catch(() => null)) as GenerateWithAgentsRequestBody | null;
    if (!body?.projectId || !body.formatType || !body.targetKeyword?.trim()) {
      return NextResponse.json(
        { error: "projectId, formatType, and targetKeyword are required" },
        { status: 400 },
      );
    }

    await assertProjectInOrg(body.projectId, key.organizationId);

    const brand = await loadBrandContextForProject(body.projectId);
    if (!brand) {
      return NextResponse.json({ error: "Project brand profile not found" }, { status: 404 });
    }

    const [project] = await db
      .select({ scrapeStatus: websiteProjectsTable.scrapeStatus })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, body.projectId))
      .limit(1);

    const evaluation = evaluateProjectVoiceReady({
      scrapeStatus: project?.scrapeStatus ?? null,
      voiceTone: brand.voiceTone,
      writingExamples: brand.writingExamples,
      brandVoiceSkill: brand.brandVoiceSkill,
      platformVoices: brand.platformVoices,
    });
    if (!evaluation.ready) {
      return NextResponse.json(voiceRequiredJsonBody(evaluation), { status: 409 });
    }

    const generationContext = await loadGenerationContext(body.projectId, {
      formatType: body.formatType,
      intendedPublishPlatform: body.intendedPublishPlatform,
      competitorFocusUrl: body.competitorFocusUrl,
      competitorUrls: body.competitorUrls,
      targetKeyword: body.targetKeyword,
    });

    const billingUserId = await resolveOrgBillingUserId(key.organizationId);
    if (!billingUserId) {
      return NextResponse.json({ error: "Organization has no billing owner" }, { status: 500 });
    }

    // Agent pipeline uses multiple AI calls, charge at planning tier
    const billingPrep = await prepareAiBilling({
      userId: billingUserId,
      tier: "planning",
      quotaKind: "article",
      companyId: body.projectId,
    });
    if (!billingPrep.ok) return billingPrep.response;

    // SSE streaming response
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (data: string) => {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };

          try {
            const result = await generateContentPieceWithAgents(
              body.formatType!,
              brand,
              body.targetKeyword!,
              body.angleHint,
              {
                fastMode: body.fastMode,
                onAgentEvent: sendEvent,
                projectId: body.projectId,
              },
              generationContext,
            );

            // Insert the generated content
            const inserted = await insertGeneratedContentPiece({
              projectId: body.projectId!,
              formatType: body.formatType!,
              result,
              plannedDate: body.plannedDate,
              intendedPublishPlatform: generationContext.resolvedIntendedPlatform,
              angleHint: body.angleHint,
            });

            await completeAiBilling(billingPrep.ctx, {
              userId: billingUserId,
              eventType: "content_generation",
              usedByok: billingPrep.usedByok,
              tier: "planning",
            });

            // Send final result event
            sendEvent(
              JSON.stringify({
                type: "result",
                contentPiece: inserted,
              }),
            );

            controller.close();
          } catch (err) {
            await cancelAiBilling(billingPrep.ctx);
            logger.error({ err }, "Agent pipeline generation failed");

            const errorPayload =
              err instanceof AgentPipelineError
                ? {
                    type: "error",
                    error: err.message,
                    code: err.code,
                    agentId: err.agentId,
                    retryable: err.retryable,
                  }
                : {
                    type: "error",
                    error: err instanceof Error ? err.message : "Generation failed",
                  };

            sendEvent(JSON.stringify(errorPayload));
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response
    try {
      const result = await generateContentPieceWithAgents(
        body.formatType,
        brand,
        body.targetKeyword,
        body.angleHint,
        { fastMode: body.fastMode, projectId: body.projectId },
        generationContext,
      );

      const inserted = await insertGeneratedContentPiece({
        projectId: body.projectId,
        formatType: body.formatType,
        result,
        plannedDate: body.plannedDate,
        intendedPublishPlatform: generationContext.resolvedIntendedPlatform,
        angleHint: body.angleHint,
      });

      await completeAiBilling(billingPrep.ctx, {
        userId: billingUserId,
        eventType: "content_generation",
        usedByok: billingPrep.usedByok,
        tier: "planning",
      });

      return NextResponse.json(
        {
          ...inserted,
          agentPipeline: {
            generatedWithAgents: true,
            durationMs: result.pieceMetadata?.agentPipelineDurationMs,
            degradedAgents: result.pieceMetadata?.degradedAgents,
          },
          message: "Content generated by agent team. Use /v1/content/render or /v1/content-pieces/{id}/publish.",
        },
        { status: 201 },
      );
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx);
      logger.error(
        { err, projectId: body.projectId, formatType: body.formatType, targetKeyword: body.targetKeyword },
        "Agent pipeline content generation failed",
      );

      if (err instanceof AgentPipelineError) {
        return NextResponse.json(
          {
            error: err.message,
            code: err.code,
            agentId: err.agentId,
            retryable: err.retryable,
          },
          { status: err.retryable ? 503 : 400 },
        );
      }

      const message =
        err instanceof Error && err.message ? err.message : "Failed to generate content. Please try again.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  });
}
