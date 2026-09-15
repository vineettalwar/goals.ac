import { eq } from "drizzle-orm";
import { websiteProjectsTable } from "@workspace/db/schema-sqlite";
import {
  assertProjectInOrg,
  requireApiKeyScope,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { decryptCmsCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { renderContentForPlatform } from "@workspace/content-engine/adapters/render-service";
import { resolveEntitlementsForOrg } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";
import { db, withPublicApiKey } from "./http";

export async function handleV1Render(
  request: Request,
  path: string,
): Promise<Response | null> {
  if (path !== "/api/v1/content/render" || request.method !== "POST") return null;

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
