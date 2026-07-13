import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable, llmVisibilityPromptsTable } from "@workspace/db/schema";
import type { VisibilitySettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { getAccessibleProject } from "@/lib/org-access";
import { parseVisibilitySettings } from "@workspace/content-engine/support/visibility-settings";
import { seedPromptsForProject } from "@workspace/content-engine/llm-visibility-service";
import { z } from "zod";

const VisibilitySettingsBody = z.object({
  llmTrackingEnabled: z.boolean().optional(),
  geoReauditEnabled: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json(parseVisibilitySettings(project.visibilitySettings));
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
  const parsed = VisibilitySettingsBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const current = parseVisibilitySettings(project.visibilitySettings);
  const updated: VisibilitySettings = { ...current, ...parsed.data };

  await db
    .update(websiteProjectsTable)
    .set({ visibilitySettings: updated })
    .where(eq(websiteProjectsTable.id, projectId));

  if (updated.llmTrackingEnabled && !current.llmTrackingEnabled) {
    const existing = await db
      .select({ id: llmVisibilityPromptsTable.id })
      .from(llmVisibilityPromptsTable)
      .where(eq(llmVisibilityPromptsTable.websiteProjectId, projectId))
      .limit(1);
    if (existing.length === 0) {
      await seedPromptsForProject(projectId);
    }
  }

  return NextResponse.json(updated);
}
