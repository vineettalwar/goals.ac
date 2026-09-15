import { eq } from "drizzle-orm";
import {
  brandProfilesTable,
  contentPiecesTable,
  websiteProjectsTable,
  type ContentStyle,
} from "@workspace/db/schema-sqlite";
import {
  assertProjectInOrg,
  requireApiKeyScope,
  resolveOrgBillingUserId,
} from "@workspace/content-engine/support/auth/api-key-auth";
import {
  enrichContentPieceImages,
  parseImageSettings,
} from "@workspace/content-engine/articles/article-image-enricher";
import { loadStockCredentialContextForProject } from "@workspace/content-engine/support/integrations/stock-credentials";
import { kvPutJson } from "@workspace/cf-edge/kv-cache";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { assessPublishReadiness } from "@workspace/content-engine/content/publish-readiness";
import { buildPublishReadinessOptions } from "@workspace/content-engine/support/publishing/readiness-options";
import { withCors } from "@workspace/cf-edge/cors";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "../ai-billing";
import { db, withPublicApiKey } from "./http";

export async function handleV1PublishAndImage(
  request: Request,
  path: string,
  env?: CfEdgeBindings,
): Promise<Response | null> {
  const publishMatch = path.match(/^\/api\/v1\/content-pieces\/(\d+)\/publish$/);
  if (publishMatch && request.method === "POST") {
    return withPublicApiKey(request, async (key) => {
      requireApiKeyScope(key, "publish:write");
      const pieceId = Number(publishMatch[1]);
      const body = (await request.json().catch(() => ({}))) as {
        platform?: string;
        projectId?: number;
        overrideReason?: string;
      };

      if (!body.platform || !body.projectId) {
        return Response.json({ error: "platform and projectId are required" }, { status: 400 });
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

      const readinessOptions = await buildPublishReadinessOptions(
        { id: piece.id, websiteProjectId: piece.websiteProjectId, targetKeyword: piece.targetKeyword },
        { unattended: true },
      );
      const readiness = assessPublishReadiness(
        {
          title: piece.title,
          bodyMarkdown: piece.bodyMarkdown ?? "",
          pieceMetadata: piece.pieceMetadata,
        },
        readinessOptions,
      );

      if (!readiness.ok && !body.overrideReason) {
        return Response.json(
          {
            error: "Content not ready to publish",
            blockers: readiness.blockers,
            warnings: readiness.warnings,
            qualityScore: readiness.qualityScore,
          },
          { status: 422 },
        );
      }

      const billingUserId = await resolveOrgBillingUserId(key.organizationId);
      if (!billingUserId) {
        return Response.json({ error: "Organization has no billing owner" }, { status: 500 });
      }

      if (!readiness.ok && body.overrideReason) {
        await db()
          .update(contentPiecesTable)
          .set({
            pieceMetadata: {
              ...((piece.pieceMetadata as Record<string, unknown> | null) ?? {}),
              publishOverride: {
                reason: body.overrideReason,
                blockers: readiness.blockers,
                organizationId: key.organizationId,
                overriddenAt: new Date().toISOString(),
              },
            },
          })
          .where(eq(contentPiecesTable.id, pieceId));
      }

      const jobId = await sendToCfQueue(QUEUES.contentPublish, {
        contentPieceId: pieceId,
        userId: billingUserId,
        platform: body.platform,
        cmsStatus: "draft",
      });
      const id = jobId ?? `cf:${QUEUES.contentPublish}:${crypto.randomUUID()}`;
      await kvPutJson(
        env?.AI_CACHE,
        `job:status:${id}`,
        {
          jobId: id,
          queue: QUEUES.contentPublish,
          status: "queued",
          userId: billingUserId,
          projectId: body.projectId,
          contentPieceId: pieceId,
          platform: body.platform,
          updatedAt: new Date().toISOString(),
        },
        86_400,
      );

      return withCors(request, acceptedJobResponse(id, QUEUES.contentPublish, { contentPieceId: pieceId }));
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
