import { withCors } from "@workspace/cf-edge/cors";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema-sqlite";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  encryptCmsCredentials,
  maskCmsCredentials,
} from "@workspace/content-engine/support/publishing/cms-integrations";
import { getAccessibleProject } from "./project-access";

function requireEncryptionSecret(request: Request): Response | null {
  if (process.env.GEMINI_KEY_ENCRYPTION_SECRET) return null;
  return withCors(
    request,
    Response.json(
      {
        error:
          "CMS credential encryption is not configured on the API worker (GEMINI_KEY_ENCRYPTION_SECRET).",
      },
      { status: 503 },
    ),
  );
}

const cmsIntegrationsBody = z.object({
  notion: z
    .object({
      integrationToken: z.string().min(1),
      databaseId: z.string().min(1),
    })
    .optional(),
  webflow: z
    .object({
      apiToken: z.string().min(1),
      collectionId: z.string().min(1),
      bodyFieldSlug: z.string().min(1).default("post-body"),
    })
    .optional(),
  wordpress: z
    .discriminatedUnion("connectionType", [
      z.object({
        connectionType: z.literal("api"),
        siteUrl: z.string().url(),
        username: z.string().min(1),
        appPassword: z.string().min(1),
      }),
      z.object({
        connectionType: z.literal("plugin"),
        siteUrl: z.string().url(),
        siteKey: z.string().min(1),
      }),
    ])
    .optional(),
  ghost: z
    .object({
      apiUrl: z.string().url(),
      adminApiKey: z.string().min(1),
    })
    .optional(),
  webhook: z
    .object({
      url: z.string().url(),
      signingSecret: z.string().min(1),
    })
    .optional(),
  shopify: z
    .discriminatedUnion("connectionType", [
      z.object({
        connectionType: z.literal("api"),
        shopDomain: z.string().min(1),
        accessToken: z.string().min(1),
        blogId: z.string().optional(),
      }),
      z.object({
        connectionType: z.literal("plugin"),
        siteUrl: z.string().url(),
        siteKey: z.string().min(1),
        blogId: z.string().optional(),
      }),
    ])
    .optional(),
  drupal: z
    .discriminatedUnion("connectionType", [
      z.object({
        connectionType: z.literal("api"),
        siteUrl: z.string().url(),
        authType: z.enum(["basic", "bearer"]).default("basic"),
        username: z.string().optional(),
        password: z.string().optional(),
        accessToken: z.string().optional(),
        contentType: z.string().optional(),
      }),
      z.object({
        connectionType: z.literal("plugin"),
        siteUrl: z.string().url(),
        siteKey: z.string().min(1),
      }),
    ])
    .optional(),
  joomla: z
    .discriminatedUnion("connectionType", [
      z.object({
        connectionType: z.literal("api"),
        siteUrl: z.string().url(),
        apiToken: z.string().min(1),
        categoryId: z.number().int().positive().optional(),
      }),
      z.object({
        connectionType: z.literal("plugin"),
        siteUrl: z.string().url(),
        siteKey: z.string().min(1),
      }),
    ])
    .optional(),
});

const CMS_PLATFORMS = new Set([
  "notion",
  "webflow",
  "wordpress",
  "ghost",
  "webhook",
  "shopify",
  "drupal",
  "joomla",
]);

function mergeCmsCredentials(
  existing: CmsIntegrationCredentials,
  patch: z.infer<typeof cmsIntegrationsBody>,
): CmsIntegrationCredentials {
  const merged: CmsIntegrationCredentials = { ...existing };
  if (patch.notion) merged.notion = patch.notion;
  if (patch.webflow) {
    merged.webflow = {
      ...patch.webflow,
      bodyFieldSlug: patch.webflow.bodyFieldSlug ?? "post-body",
    };
  }
  if (patch.wordpress) merged.wordpress = patch.wordpress;
  if (patch.ghost) merged.ghost = patch.ghost;
  if (patch.webhook) merged.webhook = patch.webhook;
  if (patch.shopify) merged.shopify = patch.shopify;
  if (patch.drupal) merged.drupal = patch.drupal;
  if (patch.joomla) merged.joomla = patch.joomla;
  return merged;
}

export async function handleCmsIntegrationsWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const patchMatch = path.match(/^\/api\/website-projects\/(\d+)\/cms-integrations$/);
  if (patchMatch && request.method === "PATCH") {
    const configError = requireEncryptionSecret(request);
    if (configError) return configError;

    const projectId = Number.parseInt(patchMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const parsed = cmsIntegrationsBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    const existing = (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
    const merged = mergeCmsCredentials(decryptCmsCredentials(existing), parsed.data);
    await db
      .update(websiteProjectsTable)
      .set({ cmsIntegrations: encryptCmsCredentials(merged) })
      .where(eq(websiteProjectsTable.id, projectId));

    return withCors(request, Response.json(maskCmsCredentials(merged)));
  }

  const deleteMatch = path.match(/^\/api\/website-projects\/(\d+)\/cms-integrations\/([^/]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const configError = requireEncryptionSecret(request);
    if (configError) return configError;

    const projectId = Number.parseInt(deleteMatch[1]!, 10);
    const platform = deleteMatch[2]!;
    if (!CMS_PLATFORMS.has(platform)) {
      return withCors(request, Response.json({ error: "Invalid platform" }, { status: 400 }));
    }

    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const existing = decryptCmsCredentials(
      (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials,
    );
    delete existing[platform as keyof CmsIntegrationCredentials];

    await db
      .update(websiteProjectsTable)
      .set({ cmsIntegrations: encryptCmsCredentials(existing) })
      .where(eq(websiteProjectsTable.id, projectId));

    return withCors(request, Response.json(maskCmsCredentials(existing)));
  }

  return null;
}
