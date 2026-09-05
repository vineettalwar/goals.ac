import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, type ContentFormatType } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import {
  assertProjectInOrg,
  resolveOrgBillingUserId,
} from "@workspace/content-engine/support/auth/api-key-auth";
import {
  generateContentPiece,
  cacheGet,
  buildCacheKey,
} from "@workspace/content-engine/content/content-studio-generator";
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

interface GenerateRequestBody {
  projectId?: number;
  formatType?: ContentFormatType;
  targetKeyword?: string;
  angleHint?: string;
  intendedPublishPlatform?: string;
  intendedOutputMode?: string;
  intendedEditorMode?: "classic" | "gutenberg" | "elementor" | "divi";
  competitorFocusUrl?: string;
  competitorUrls?: string[];
  cmsCategories?: string[];
  cmsTags?: string[];
  plannedDate?: string;
  bypassCache?: boolean;
}

/**
 * Public "generate content from the goals-backing dataset" endpoint. Runs the
 * same personalized generator (brand voice / style vector / research
 * grounding) as the interactive Studio, persists the result as a draft, and
 * hands back a piece id — feed that into /v1/content/render for a
 * platform-shaped payload (Gutenberg, Elementor, LinkedIn, Twitter threads,
 * ...) or /v1/content-pieces/{id}/publish to ship it.
 */
export async function POST(req: Request) {
  return withPublicApiKey(req, async (key) => {
    requireApiKeyScope(key, "content:generate");

    const body = (await req.json().catch(() => null)) as GenerateRequestBody | null;
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
      intendedOutputMode: body.intendedOutputMode,
      intendedEditorMode: body.intendedEditorMode,
      competitorFocusUrl: body.competitorFocusUrl,
      competitorUrls: body.competitorUrls,
      targetKeyword: body.targetKeyword,
    });

    const cacheKeyStr = buildCacheKey(
      body.formatType,
      body.targetKeyword,
      brand,
      body.angleHint,
      generationContext.intendedPublishPlatform,
      generationContext.competitorFocusUrl,
      generationContext.competitorUrls,
    );

    const bypassCache = body.bypassCache === true;

    if (!bypassCache) {
      const [existing] = await db
        .select()
        .from(contentPiecesTable)
        .where(
          and(
            eq(contentPiecesTable.websiteProjectId, body.projectId),
            eq(contentPiecesTable.cacheKey, cacheKeyStr),
          ),
        )
        .limit(1);
      if (existing) {
        return NextResponse.json(existing, { headers: { "X-Cache": "HIT" } });
      }

      const aiCached = await cacheGet(cacheKeyStr);
      if (aiCached) {
        const inserted = await insertGeneratedContentPiece({
          projectId: body.projectId,
          formatType: body.formatType,
          result: aiCached,
          cacheKey: cacheKeyStr,
          plannedDate: body.plannedDate,
          intendedPublishPlatform: generationContext.resolvedIntendedPlatform,
          intendedOutputMode: generationContext.intendedOutputMode,
          intendedEditorMode: generationContext.intendedEditorMode,
          angleHint: body.angleHint,
          cmsCategories: body.cmsCategories,
          cmsTags: body.cmsTags,
        });
        return NextResponse.json(inserted, { status: 201, headers: { "X-Cache": "HIT" } });
      }
    }

    const billingUserId = await resolveOrgBillingUserId(key.organizationId);
    if (!billingUserId) {
      return NextResponse.json({ error: "Organization has no billing owner" }, { status: 500 });
    }

    const billingPrep = await prepareAiBilling({
      userId: billingUserId,
      tier: "execution",
      quotaKind: "article",
      companyId: body.projectId,
    });
    if (!billingPrep.ok) return billingPrep.response;

    try {
      const result = await generateContentPiece(
        body.formatType,
        brand,
        body.targetKeyword,
        body.angleHint,
        bypassCache,
        null,
        undefined,
        generationContext,
      );

      const inserted = await insertGeneratedContentPiece({
        projectId: body.projectId,
        formatType: body.formatType,
        result,
        cacheKey: cacheKeyStr,
        plannedDate: body.plannedDate,
        intendedPublishPlatform: generationContext.resolvedIntendedPlatform,
        intendedOutputMode: generationContext.intendedOutputMode,
        intendedEditorMode: generationContext.intendedEditorMode,
        angleHint: body.angleHint,
        cmsCategories: body.cmsCategories,
        cmsTags: body.cmsTags,
      });

      await completeAiBilling(billingPrep.ctx, {
        userId: billingUserId,
        eventType: "content_generation",
        usedByok: billingPrep.usedByok,
        tier: "execution",
        promptTokens: result.generationUsage?.promptTokens,
        outputTokens: result.generationUsage?.outputTokens,
        totalTokens: result.generationUsage?.totalTokens,
      });

      return NextResponse.json(
        {
          ...inserted,
          message:
            "Draft generated. Render it for a destination via /v1/content/render or publish directly via /v1/content-pieces/{id}/publish.",
        },
        { status: 201 },
      );
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx);
      logger.error(
        { err, projectId: body.projectId, formatType: body.formatType, targetKeyword: body.targetKeyword },
        "Public API content generation failed",
      );
      const message =
        err instanceof Error && err.message ? err.message : "Failed to generate content. Please try again.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  });
}
