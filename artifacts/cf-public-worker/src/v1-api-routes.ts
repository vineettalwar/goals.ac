import { withCors } from "@workspace/cf-edge/cors";
import { getDb } from "@workspace/db";
import type { GoalsD1Database } from "@workspace/db/d1";
import { websiteProjectsTable } from "@workspace/db/schema-sqlite";
import { buildCanonicalContent } from "@workspace/content-engine/content/canonical-content";
import {
  assertProjectInOrg,
  authenticateApiKey,
  checkApiKeyRateLimit,
  requireApiKeyScope,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { decryptCmsCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { renderContentForPlatform } from "@workspace/content-engine/adapters/render-service";
import { resolveEntitlementsForOrg } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";
import { getAdapterCapabilities, listAdaptedPlatforms } from "@workspace/content-engine/adapters/registry";
import { eq } from "drizzle-orm";

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

  return null;
}
