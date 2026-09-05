import { withCors } from "@workspace/cf-edge/cors";
import { getDb } from "@workspace/db";
import type { GoalsD1Database } from "@workspace/db/d1";
import {
  brandProfilesTable,
  contentPiecesTable,
  websiteProjectsTable,
  type ContentFormatType,
  type ContentStyle,
} from "@workspace/db/schema-sqlite";
import { buildCanonicalContent } from "@workspace/content-engine/content/canonical-content";
import {
  assertProjectInOrg,
  authenticateApiKey,
  checkApiKeyRateLimit,
  requireApiKeyScope,
  resolveOrgBillingUserId,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { decryptCmsCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { renderContentForPlatform } from "@workspace/content-engine/adapters/render-service";
import { resolveEntitlementsForOrg } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";
import { getAdapterCapabilities, listAdaptedPlatforms } from "@workspace/content-engine/adapters/registry";
import {
  buildCacheKey,
  cacheGet,
  generateContentPiece,
} from "@workspace/content-engine/content/content-studio-generator";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { evaluateProjectVoiceReady } from "@workspace/content-engine/brand/project-voice-ready";
import {
  enrichContentPieceImages,
  parseImageSettings,
} from "@workspace/content-engine/articles/article-image-enricher";
import { loadStockCredentialContextForProject } from "@workspace/content-engine/support/integrations/stock-credentials";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { and, eq } from "drizzle-orm";

function db(): GoalsD1Database {
  return getDb() as GoalsD1Database;
}

async function withPublicApiKey(
  request: Request,
  handler: (key: NonNullable<Awaited<ReturnType<typeof authenticateApiKey>>>) => Promise<Response>,
): Promise<Response> {
  const key = await authenticateApiKey(request.headers.get("authorization") ?? undefined);
  if (!key) {
    return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
  }
  if (!checkApiKeyRateLimit(key)) {
    return withCors(request, Response.json({ error: "Rate limit exceeded" }, { status: 429 }));
  }
  try {
    return await handler(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = message.includes("scope") ? 403 : message.includes("not found") ? 404 : 400;
    return withCors(request, Response.json({ error: message }, { status }));
  }
}

export async function handleV1Api(
  request: Request,
  path: string,
): Promise<Response | null> {
  if (path === "/api/v1/connections" && request.method === "GET") {
    return withPublicApiKey(request, async (key) => {
      requireApiKeyScope(key, "content:read");
      const url = new URL(request.url);
      const projectId = Number(url.searchParams.get("projectId"));
      if (!projectId) {
        return Response.json({ error: "projectId query param required" }, { status: 400 });
      }

      await assertProjectInOrg(projectId, key.organizationId);

      const [project] = await db()
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);

      const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
      const platforms = listAdaptedPlatforms().filter((platform) => Boolean(creds[platform as keyof typeof creds]));

      return Response.json({
        projectId,
        connections: platforms.map((platform) => ({
          platform,
          capabilities: getAdapterCapabilities(platform),
        })),
      });
    });
  }

  if (path === "/api/v1/content-pieces" && request.method === "POST") {
    return withPublicApiKey(request, async (key) => {
      requireApiKeyScope(key, "content:read");
      const body = (await request.json().catch(() => null)) as {
        projectId?: number;
        title?: string;
        markdown?: string;
        formatType?: string;
      } | null;

      if (!body?.projectId || !body.title || !body.markdown) {
        return Response.json(
          { error: "projectId, title, and markdown are required" },
          { status: 400 },
        );
      }

      await assertProjectInOrg(body.projectId, key.organizationId);

      const canonical = buildCanonicalContent({
        title: body.title,
        bodyMarkdown: body.markdown,
        formatType: body.formatType,
      });

      return Response.json(
        {
          canonical,
          message: "Draft accepted — persist via product UI or publish endpoint with piece id",
        },
        { status: 201 },
      );
    });
  }

  if (path === "/api/v1/content/render" && request.method === "POST") {
    return withPublicApiKey(request, async (key) => {
      requireApiKeyScope(key, "render:preview");
      const body = (await request.json().catch(() => null)) as {
        projectId?: number;
        platform?: string;
        markdown?: string;
        title?: string;
        outputMode?: string;
        editorMode?: string;
      } | null;

      if (!body?.projectId || !body.platform || !body.markdown || !body.title) {
        return Response.json(
          { error: "projectId, platform, markdown, and title are required" },
          { status: 400 },
        );
      }

      await assertProjectInOrg(body.projectId, key.organizationId);

      const [project] = await db()
        .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, body.projectId))
        .limit(1);

      const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
      const entitlements = await resolveEntitlementsForOrg(key.organizationId);

      const preview = await renderContentForPlatform({
        piece: { title: body.title, bodyMarkdown: body.markdown },
        platform: body.platform,
        creds,
        outputMode: body.outputMode,
        editorMode: body.editorMode as "classic" | "gutenberg" | "elementor" | "divi" | undefined,
        entitlements,
      });

      if (!entitlements.renderNativePayloads && preview.payloadKind !== "html") {
        return Response.json(
          {
            error: "Native platform payloads require BYOK or Growth plan",
            payloadKind: preview.payloadKind,
          },
          { status: 403 },
        );
      }

      return Response.json(preview);
    });
  }

  if (path === "/api/v1/content-pieces/generate" && request.method === "POST") {
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
              "Draft generated. Render it for a destination via /v1/content/render or publish via the product UI.",
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

  const imageMatch = path.match(/^\/api\/v1\/content-pieces\/(\d+)\/image$/);
  if (imageMatch && request.method === "POST") {
    return withPublicApiKey(request, async (key) => {
      requireApiKeyScope(key, "image:generate");
      const pieceId = Number(imageMatch[1]);

      const body = (await request.json().catch(() => ({}))) as { projectId?: number };
      if (!body.projectId) {
        return Response.json({ error: "projectId is required" }, { status: 400 });
      }

      await assertProjectInOrg(body.projectId, key.organizationId);

      const [piece] = await db()
        .select()
        .from(contentPiecesTable)
        .where(eq(contentPiecesTable.id, pieceId))
        .limit(1);

      if (!piece || piece.websiteProjectId !== body.projectId) {
        return Response.json({ error: "Content piece not found" }, { status: 404 });
      }

      const [[project], [brand]] = await Promise.all([
        db()
          .select({ contentStyle: websiteProjectsTable.contentStyle })
          .from(websiteProjectsTable)
          .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
          .limit(1),
        db()
          .select({ companyName: brandProfilesTable.companyName })
          .from(brandProfilesTable)
          .where(eq(brandProfilesTable.websiteProjectId, piece.websiteProjectId))
          .limit(1),
      ]);

      const excludeImageIds =
        piece.pieceMetadata?.images?.map((img) => `${img.provider}:${img.remoteId}`) ?? [];

      const billingUserId = await resolveOrgBillingUserId(key.organizationId);
      if (!billingUserId) {
        return Response.json({ error: "Organization has no billing owner" }, { status: 500 });
      }

      const billingPrep = await prepareAiBilling({
        userId: billingUserId,
        tier: "rapid",
        quotaKind: "article",
        companyId: piece.websiteProjectId,
      });
      if (!billingPrep.ok) return billingPrep.response;

      try {
        const stockCredentials = await loadStockCredentialContextForProject(piece.websiteProjectId);
        const enriched = await enrichContentPieceImages(
          {
            title: piece.title,
            target_keyword: piece.targetKeyword,
            body_markdown: piece.bodyMarkdown,
            formatType: piece.formatType,
            pieceMetadata: piece.pieceMetadata ?? undefined,
          },
          {
            imageSettings: parseImageSettings(project?.contentStyle as ContentStyle | null),
            brandName: brand?.companyName ?? undefined,
            excludeImageIds,
            stockCredentials,
          },
        );

        const wordCount = enriched.body_markdown.split(/\s+/).filter(Boolean).length;

        const [updated] = await db()
          .update(contentPiecesTable)
          .set({
            bodyMarkdown: enriched.body_markdown,
            pieceMetadata: enriched.pieceMetadata,
            wordCount,
          })
          .where(eq(contentPiecesTable.id, pieceId))
          .returning();

        await completeAiBilling(billingPrep.ctx, {
          userId: billingUserId,
          eventType: "image_regeneration",
          usedByok: billingPrep.usedByok,
          tier: "rapid",
          companyId: piece.websiteProjectId,
        });

        return Response.json({ piece: updated });
      } catch (err) {
        await cancelAiBilling(
          billingPrep.ctx,
          err instanceof Error ? err.message : "image_generation_failed",
        );
        const message = err instanceof Error ? err.message : "Image generation failed";
        return Response.json({ error: message }, { status: 500 });
      }
    });
  }

  return null;
}
