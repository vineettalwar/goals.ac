import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptCmsCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { renderAndPublish } from "@workspace/content-engine/adapters/render-service";
import { resolveEntitlementsForOrg } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";
import { assertProjectInOrg } from "@workspace/content-engine/support/auth/api-key-auth";
import { withPublishRecord } from "@workspace/content-engine/support/publishing/publish-records";
import { assessPublishReadiness } from "@workspace/content-engine/content/publish-readiness";
import { requireApiKeyScope, withPublicApiKey } from "@/lib/public-api/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPublicApiKey(req, async (key) => {
    requireApiKeyScope(key, "publish:write");
    const { id } = await params;
    const pieceId = Number(id);
    if (!pieceId) {
      return NextResponse.json({ error: "Invalid content piece id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      platform?: string;
      projectId?: number;
      overrideReason?: string;
    };

    if (!body.platform || !body.projectId) {
      return NextResponse.json({ error: "platform and projectId are required" }, { status: 400 });
    }

    await assertProjectInOrg(body.projectId, key.organizationId);

    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, pieceId))
      .limit(1);

    if (!piece || piece.websiteProjectId !== body.projectId) {
      return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
    }

    // Same gate the interactive route applies. A public API key is still a
    // publish path to a customer's live site, so it does not get a free pass.
    const readiness = assessPublishReadiness({
      title: piece.title,
      bodyMarkdown: piece.bodyMarkdown ?? "",
      pieceMetadata: piece.pieceMetadata,
    });

    if (!readiness.ok && !body.overrideReason) {
      return NextResponse.json(
        {
          error: "Content not ready to publish",
          blockers: readiness.blockers,
          warnings: readiness.warnings,
          qualityScore: readiness.qualityScore,
        },
        { status: 422 },
      );
    }

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, body.projectId))
      .limit(1);

    const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
    const entitlements = await resolveEntitlementsForOrg(key.organizationId);

    let publishWarnings: Awaited<ReturnType<typeof renderAndPublish>>["warnings"] = [];

    const publishOutcome = await withPublishRecord(
      {
        contentPieceId: pieceId,
        websiteProjectId: body.projectId,
        provider: body.platform,
      },
      async (idempotencyKey) => {
        const result = await renderAndPublish({
          piece: {
            id: piece.id,
            title: piece.title,
            bodyMarkdown: piece.bodyMarkdown,
            targetKeyword: piece.targetKeyword,
            formatType: piece.formatType,
            pieceMetadata: piece.pieceMetadata,
          },
          platform: body.platform!,
          creds,
          entitlements,
          idempotencyKey,
        });

        publishWarnings = result.warnings;

        return {
          publishedUrl: result.url,
          publishPlatform: body.platform!,
          outputMode: result.outputMode,
        };
      },
    );

    await db
      .update(contentPiecesTable)
      .set({
        status: "published",
        publishedUrl: publishOutcome.publishedUrl,
        publishPlatform: body.platform,
        publishError: null,
        ...(readiness.ok
          ? {}
          : {
              pieceMetadata: {
                ...((piece.pieceMetadata as Record<string, unknown> | null) ?? {}),
                publishOverride: {
                  reason: body.overrideReason,
                  blockers: readiness.blockers,
                  organizationId: key.organizationId,
                  overriddenAt: new Date().toISOString(),
                },
              },
            }),
      })
      .where(eq(contentPiecesTable.id, pieceId));

    return NextResponse.json({
      publishedUrl: publishOutcome.publishedUrl,
      platform: body.platform,
      warnings: publishWarnings,
    });
  });
}
