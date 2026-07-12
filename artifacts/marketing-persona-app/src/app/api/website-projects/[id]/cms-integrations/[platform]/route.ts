import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  encryptCmsCredentials,
} from "@workspace/content-engine/support/cms-integrations";

const PLATFORMS = ["notion", "webflow", "wordpress", "ghost", "webhook", "shopify", "drupal", "joomla", "linkedin", "twitter", "meta"] as const;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; platform: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr, platform } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId) || !PLATFORMS.includes(platform as typeof PLATFORMS[number])) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId!)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const decrypted = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
  delete decrypted[platform as keyof CmsIntegrationCredentials];

  const encrypted = encryptCmsCredentials(decrypted);
  await db.update(websiteProjectsTable).set({ cmsIntegrations: encrypted }).where(eq(websiteProjectsTable.id, projectId));

  return new Response(null, { status: 204 });
}
