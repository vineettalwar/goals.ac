import { eq } from "drizzle-orm";
import { websiteProjectsTable } from "@workspace/db/schema-sqlite";
import { buildCanonicalContent } from "@workspace/content-engine/content/canonical-content";
import {
  assertProjectInOrg,
  requireApiKeyScope,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { decryptCmsCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { getAdapterCapabilities, listAdaptedPlatforms } from "@workspace/content-engine/adapters/registry";
import { db, withPublicApiKey } from "./http";

export async function handleV1Connections(
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

  return null;
}
