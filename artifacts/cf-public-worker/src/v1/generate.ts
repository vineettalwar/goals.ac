import { and, eq } from "drizzle-orm";
import {
  contentPiecesTable,
  websiteProjectsTable,
  type ContentFormatType,
} from "@workspace/db/schema-sqlite";
import {
  assertProjectInOrg,
  requireApiKeyScope,
  resolveOrgBillingUserId,
} from "@workspace/content-engine/support/auth/api-key-auth";
import {
  buildCacheKey,
  cacheGet,
  generateContentPiece,
} from "@workspace/content-engine/content/content-studio-generator";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { evaluateProjectVoiceReady } from "@workspace/content-engine/brand/project-voice-ready";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "../ai-billing";
import { db, withPublicApiKey } from "./http";

export async function handleV1Generate(
  request: Request,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/v1/content-pieces/generate" || request.method !== "POST") return null;

  return withPublicApiKey(request, async (key) => {
    requireApiKeyScope(key, "content:generate");
    const body = (await request.json().catch(() => null)) as {
      projectId?: number;
      formatType?: ContentFormatType;
      targetKeyword?: string;
      angleHint?: string;
      competitorFocusUrl?: string;
      competitorUrls?: string[];
      bypassCache?: boolean;
    } | null;

    if (!body?.projectId || !body.formatType || !body.targetKeyword?.trim()) {
      return Response.json(
        { error: "projectId, formatType, and targetKeyword are required" },
        { status: 400 },
      );
    }

    await assertProjectInOrg(body.projectId, key.organizationId);

    const brand = await loadBrandContextForProject(body.projectId);
    if (!brand) {
      return Response.json({ error: "Project brand profile not found" }, { status: 404 });
    }

    const [project] = await db()
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
      return Response.json(
        {
          code: "voice_required",
          error: evaluation.building
            ? "Brand voice is still scanning. Try again in a moment."
            : "Add a brand voice (or connect social) before generating.",
          scrapeStatus: evaluation.scrapeStatus,
        },
        { status: 409 },
      );
    }

    const bypassCache = body.bypassCache === true;
    const generationContext = {
      competitorFocusUrl: body.competitorFocusUrl,
      competitorUrls: body.competitorUrls,
    };
    const cacheKeyStr = buildCacheKey(
      body.formatType,
      body.targetKeyword,
      brand,
      body.angleHint,
      undefined,
      generationContext.competitorFocusUrl,
      generationContext.competitorUrls,
    );

    if (!bypassCache) {
      const [existing] = await db()
        .select()
        .from(contentPiecesTable)
        .where(
          and(
            eq(contentPiecesTable.websiteProjectId, body.projectId),
            eq(contentPiecesTable.cacheKey, cacheKeyStr),
          ),
        )
        .limit(1);
      if (existing) return Response.json(existing);

      const aiCached = await cacheGet(cacheKeyStr);
      if (aiCached) {
        const [inserted] = await db()
          .insert(contentPiecesTable)
          .values({
            websiteProjectId: body.projectId,
            formatType: body.formatType,
            title: aiCached.title,
            targetKeyword: aiCached.target_keyword,
            bodyMarkdown: aiCached.body_markdown,
            wordCount: aiCached.body_markdown.split(/\s+/).filter(Boolean).length,
            status: "draft",
            cacheKey: cacheKeyStr,
            pieceMetadata: aiCached.pieceMetadata ?? null,
          })
          .returning();
        return Response.json(inserted, { status: 201 });
      }
    }

    const billingUserId = await resolveOrgBillingUserId(key.organizationId);
    if (!billingUserId) {
      return Response.json({ error: "Organization has no billing owner" }, { status: 500 });
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

      const [inserted] = await db()
        .insert(contentPiecesTable)
        .values({
          websiteProjectId: body.projectId,
          formatType: body.formatType,
          title: result.title,
          targetKeyword: result.target_keyword,
          bodyMarkdown: result.body_markdown,
          wordCount: result.body_markdown.split(/\s+/).filter(Boolean).length,
          status: "draft",
          cacheKey: cacheKeyStr,
          pieceMetadata: result.pieceMetadata ?? null,
        })
        .returning();

      await completeAiBilling(billingPrep.ctx, {
        userId: billingUserId,
        eventType: "content_generation",
        usedByok: billingPrep.usedByok,
        tier: "execution",
        promptTokens: result.generationUsage?.promptTokens,
        outputTokens: result.generationUsage?.outputTokens,
        totalTokens: result.generationUsage?.totalTokens,
      });

      return Response.json(
        {
          ...inserted,
          message:
            "Draft generated. Publish with POST /api/v1/content-pieces/:id/publish or render via /v1/content/render.",
        },
        { status: 201 },
      );
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx);
      const message =
        err instanceof Error && err.message ? err.message : "Failed to generate content. Please try again.";
      return Response.json({ error: message }, { status: 503 });
    }
  });
}
