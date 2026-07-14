import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptCmsCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { renderContentForPlatform } from "@workspace/content-engine/adapters/render-service";
import { resolveEntitlementsForOrg } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";
import { assertProjectInOrg } from "@workspace/content-engine/support/auth/api-key-auth";
import { requireApiKeyScope, withPublicApiKey } from "@/lib/public-api/auth";

export async function POST(req: Request) {
  return withPublicApiKey(req, async (key) => {
    requireApiKeyScope(key, "render:preview");
    const body = (await req.json().catch(() => null)) as {
      projectId?: number;
      platform?: string;
      markdown?: string;
      title?: string;
      outputMode?: string;
      editorMode?: string;
    } | null;

    if (!body?.projectId || !body.platform || !body.markdown || !body.title) {
      return NextResponse.json(
        { error: "projectId, platform, markdown, and title are required" },
        { status: 400 },
      );
    }

    await assertProjectInOrg(body.projectId, key.organizationId);

    const [project] = await db
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
      return NextResponse.json(
        {
          error: "Native platform payloads require BYOK or Growth plan",
          payloadKind: preview.payloadKind,
        },
        { status: 403 },
      );
    }

    return NextResponse.json(preview);
  });
}
