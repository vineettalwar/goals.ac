import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject, requireIntegrationsManage } from "@/lib/org/org-access";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  encryptCmsCredentials,
  isCmsIntegrationPlatformKey,
  maskCmsCredentials,
} from "@workspace/content-engine/support/publishing/cms-integrations";
import {
  assertOutputModeAllowed,
  getOutputModes,
} from "@workspace/content-engine/support/publishing/platform-output-modes";
import { resolveEntitlementsForProject } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";

const OutputModeBody = z.object({
  outputMode: z.string().min(1),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; platform: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr, platform } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId) || !isCmsIntegrationPlatformKey(platform)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const modeOptions = getOutputModes(platform);
  if (modeOptions.length === 0) {
    return NextResponse.json(
      { error: "This platform does not support configurable output modes" },
      { status: 400 },
    );
  }

  const manage = await requireIntegrationsManage(userId!, projectId);
  if (!manage.ok) {
    return NextResponse.json({ error: manage.error }, { status: manage.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = OutputModeBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const decrypted = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
  const existing = decrypted[platform as keyof CmsIntegrationCredentials];
  if (!existing || typeof existing !== "object") {
    return NextResponse.json({ error: "Integration not connected" }, { status: 404 });
  }

  const entitlements = await resolveEntitlementsForProject(projectId, userId!);
  const allowedMode = assertOutputModeAllowed(parsed.data.outputMode, platform, entitlements);

  const merged: CmsIntegrationCredentials = { ...decrypted };

  if (platform === "wordpress" && merged.wordpress) {
    merged.wordpress = {
      ...merged.wordpress,
      outputMode: allowedMode as NonNullable<CmsIntegrationCredentials["wordpress"]>["outputMode"],
      editorMode: allowedMode as NonNullable<CmsIntegrationCredentials["wordpress"]>["editorMode"],
    };
  } else {
    (merged as Record<string, Record<string, unknown>>)[platform] = {
      ...(existing as Record<string, unknown>),
      outputMode: allowedMode,
    };
  }

  const encrypted = encryptCmsCredentials(merged);
  await db
    .update(websiteProjectsTable)
    .set({ cmsIntegrations: encrypted })
    .where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json(maskCmsCredentials(merged));
}
