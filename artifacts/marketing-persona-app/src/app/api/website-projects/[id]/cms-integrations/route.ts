import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { getAccessibleProject } from "@/lib/org-access";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  encryptCmsCredentials,
  maskCmsCredentials,
} from "@workspace/content-engine/support/cms-integrations";
import { z } from "zod";

const fieldMappingSchema = z.object({
  titleField: z.string().optional(),
  bodyField: z.string().optional(),
  slugField: z.string().optional(),
  metaDescriptionField: z.string().optional(),
});

const CmsIntegrationsBody = z
  .object({
    notion: z.object({ integrationToken: z.string().min(1), databaseId: z.string().min(1) }).optional(),
    webflow: z.object({
      apiToken: z.string().min(1),
      collectionId: z.string().min(1),
      bodyFieldSlug: z.string().optional(),
      publishStatus: z.enum(["draft", "live"]).optional(),
    }).optional(),
    wordpress: z.union([
      z.object({ connectionType: z.literal("api"), siteUrl: z.string().url(), username: z.string().min(1), appPassword: z.string().min(1) }),
      z.object({ connectionType: z.literal("plugin"), siteUrl: z.string().url(), siteKey: z.string().min(1) }),
    ]).optional(),
    ghost: z.object({ apiUrl: z.string().url(), adminApiKey: z.string().min(1) }).optional(),
    webhook: z.object({ url: z.string().url(), signingSecret: z.string().min(1) }).optional(),
    shopify: z.union([
      z.object({ connectionType: z.literal("api"), shopDomain: z.string().min(1), accessToken: z.string().min(1), blogId: z.string().optional() }),
      z.object({ connectionType: z.literal("plugin"), siteUrl: z.string().url(), siteKey: z.string().min(1), blogId: z.string().optional() }),
    ]).optional(),
    drupal: z.union([
      z.object({ connectionType: z.literal("api"), siteUrl: z.string().url(), authType: z.enum(["basic", "bearer"]).optional(), username: z.string().optional(), password: z.string().optional(), accessToken: z.string().optional(), contentType: z.string().optional() }),
      z.object({ connectionType: z.literal("plugin"), siteUrl: z.string().url(), siteKey: z.string().min(1), contentType: z.string().optional() }),
    ]).optional(),
    joomla: z.union([
      z.object({ connectionType: z.literal("api"), siteUrl: z.string().url(), apiToken: z.string().min(1), categoryId: z.number().optional() }),
      z.object({ connectionType: z.literal("plugin"), siteUrl: z.string().url(), siteKey: z.string().min(1), categoryId: z.number().optional() }),
    ]).optional(),
    wix: z.object({ accessToken: z.string().min(1), siteId: z.string().min(1), memberId: z.string().optional(), publishStatus: z.enum(["draft", "live"]).optional() }).optional(),
    framer: z.object({ apiToken: z.string().min(1), collectionId: z.string().min(1), titleFieldSlug: z.string().min(1), bodyFieldSlug: z.string().min(1), publishStatus: z.enum(["draft", "live"]).optional() }).optional(),
    squarespace: z.object({ apiKey: z.string().min(1), siteId: z.string().min(1), publishStatus: z.enum(["draft", "live"]).optional() }).optional(),
    contentful: z.object({ accessToken: z.string().min(1), spaceId: z.string().min(1), environmentId: z.string().min(1), contentTypeId: z.string().min(1), fieldMapping: fieldMappingSchema }).optional(),
    sanity: z.object({ projectId: z.string().min(1), dataset: z.string().min(1), token: z.string().min(1), documentType: z.string().min(1), fieldMapping: fieldMappingSchema }).optional(),
    strapi: z.object({ baseUrl: z.string().url(), apiToken: z.string().min(1), contentType: z.string().min(1), publishStatus: z.enum(["draft", "live"]).optional() }).optional(),
    beehiiv: z.object({ apiKey: z.string().min(1), publicationId: z.string().min(1) }).optional(),
    convertkit: z.object({ apiSecret: z.string().min(1), formId: z.string().optional() }).optional(),
    mailchimp: z.object({ apiKey: z.string().min(1), serverPrefix: z.string().min(1), listId: z.string().min(1) }).optional(),
    hubspot: z.object({ accessToken: z.string().min(1), blogId: z.string().min(1), publishStatus: z.enum(["draft", "live"]).optional() }).optional(),
    typo3: z.object({ connectionType: z.literal("plugin"), siteUrl: z.string().url(), siteKey: z.string().min(1) }).optional(),
  })
  .refine((d) => Object.values(d).some(Boolean), { message: "At least one integration is required" });

async function loadProject(projectId: number, userId: number) {
  const project = await getAccessibleProject(projectId, userId);
  if (!project) return null;
  return { id: project.id, cmsIntegrations: project.cmsIntegrations };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const project = await loadProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (!project.cmsIntegrations) return NextResponse.json({});

  const decrypted = decryptCmsCredentials(project.cmsIntegrations as CmsIntegrationCredentials);
  return NextResponse.json(maskCmsCredentials(decrypted));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = CmsIntegrationsBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const project = await loadProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const existingDecrypted = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
  const merged: CmsIntegrationCredentials = { ...existingDecrypted };

  if (parsed.data.notion) merged.notion = parsed.data.notion;
  if (parsed.data.webflow) {
    merged.webflow = {
      ...parsed.data.webflow,
      bodyFieldSlug: parsed.data.webflow.bodyFieldSlug ?? "post-body",
      publishStatus: parsed.data.webflow.publishStatus ?? "draft",
    };
  }
  if (parsed.data.wordpress) merged.wordpress = parsed.data.wordpress;
  if (parsed.data.ghost) merged.ghost = parsed.data.ghost;
  if (parsed.data.webhook) merged.webhook = parsed.data.webhook;
  if (parsed.data.shopify) merged.shopify = parsed.data.shopify;
  if (parsed.data.drupal) merged.drupal = parsed.data.drupal as CmsIntegrationCredentials["drupal"];
  if (parsed.data.joomla) merged.joomla = parsed.data.joomla as CmsIntegrationCredentials["joomla"];
  if (parsed.data.wix) merged.wix = parsed.data.wix;
  if (parsed.data.framer) merged.framer = parsed.data.framer;
  if (parsed.data.squarespace) merged.squarespace = parsed.data.squarespace;
  if (parsed.data.contentful) merged.contentful = parsed.data.contentful;
  if (parsed.data.sanity) merged.sanity = parsed.data.sanity;
  if (parsed.data.strapi) merged.strapi = parsed.data.strapi;
  if (parsed.data.beehiiv) merged.beehiiv = parsed.data.beehiiv;
  if (parsed.data.convertkit) merged.convertkit = parsed.data.convertkit;
  if (parsed.data.mailchimp) merged.mailchimp = parsed.data.mailchimp;
  if (parsed.data.hubspot) merged.hubspot = parsed.data.hubspot;
  if (parsed.data.typo3) merged.typo3 = parsed.data.typo3;

  const encrypted = encryptCmsCredentials(merged);
  await db.update(websiteProjectsTable).set({ cmsIntegrations: encrypted }).where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json(maskCmsCredentials(merged));
}
