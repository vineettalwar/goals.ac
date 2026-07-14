import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import type { PublishingSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { parsePublishingSettings } from "@workspace/content-engine/support/publishing/publishing-settings";
import { z } from "zod";

const PublishingSettingsBody = z.object({
  primaryBlogDestination: z.string().min(1).nullable().optional(),
});

async function loadOwnedProject(projectId: number, userId: number) {
  const project = await getAccessibleProject(projectId, userId);
  if (!project) return null;
  return { id: project.id, publishingSettings: project.publishingSettings };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number((await params).id);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const project = await loadOwnedProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json(parsePublishingSettings(project.publishingSettings));
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
  const parsed = PublishingSettingsBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const project = await loadOwnedProject(projectId, userId!);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const current = parsePublishingSettings(project.publishingSettings);
  const updated: PublishingSettings = { ...current, ...parsed.data };

  await db
    .update(websiteProjectsTable)
    .set({ publishingSettings: updated })
    .where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json(updated);
}
