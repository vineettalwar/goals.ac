import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject, requireIntegrationsManage } from "@/lib/org/org-access";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  encryptCmsCredentials,
  isCmsIntegrationPlatformKey,
} from "@workspace/content-engine/support/cms-integrations";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; platform: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr, platform } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId) || !isCmsIntegrationPlatformKey(platform)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const manage = await requireIntegrationsManage(userId!, projectId);
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const decrypted = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
  delete decrypted[platform as keyof CmsIntegrationCredentials];

  const encrypted = encryptCmsCredentials(decrypted);
  await db.update(websiteProjectsTable).set({ cmsIntegrations: encrypted }).where(eq(websiteProjectsTable.id, projectId));

  return new Response(null, { status: 204 });
}
