import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptCmsCredentials } from "@workspace/content-engine/support/cms-integrations";
import { renderAndPublish } from "@workspace/content-engine/adapters/render-service";
import { resolveEntitlementsForOrg } from "@workspace/content-engine/support/resolve-publish-entitlements";
import { assertProjectInOrg } from "@workspace/content-engine/support/api-key-auth";
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

    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, body.projectId))
      .limit(1);

    const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
    const entitlements = await resolveEntitlementsForOrg(key.organizationId);

    const result = await renderAndPublish({
      piece: {
        id: piece.id,
        title: piece.title,
        bodyMarkdown: piece.bodyMarkdown,
        targetKeyword: piece.targetKeyword,
        formatType: piece.formatType,
        pieceMetadata: piece.pieceMetadata,
      },
      platform: body.platform,
      creds,
      entitlements,
      idempotencyKey: `api-piece-${pieceId}`,
    });

    await db
      .update(contentPiecesTable)
      .set({
        status: "published",
        publishedUrl: result.url,
        publishPlatform: body.platform,
        publishError: null,
      })
      .where(eq(contentPiecesTable.id, pieceId));

    return NextResponse.json({
      publishedUrl: result.url,
      platform: body.platform,
      warnings: result.warnings,
    });
  });
}
