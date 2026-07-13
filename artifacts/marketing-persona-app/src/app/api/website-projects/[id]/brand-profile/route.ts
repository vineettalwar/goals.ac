import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { brandProfilesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { getAccessibleProject } from "@/lib/org-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  return NextResponse.json({
    scrapeStatus: project.scrapeStatus,
    pageCount: project.pageCount ?? 0,
    brandMemory: brand?.brandMemory ?? null,
    voiceTone: brand?.voiceTone ?? "",
    primaryKeywords: brand?.primaryKeywords ?? [],
    writingExamples: brand?.writingExamples ?? [],
    doWords: brand?.doWords ?? [],
    dontWords: brand?.dontWords ?? [],
    discoveryMeta:
      (project.scrapeData as { discoveryMeta?: Record<string, unknown> } | null)?.discoveryMeta ??
      null,
    scanSources: brand?.brandMemory?.scanSources ?? [],
    brandVoiceSkill: brand?.brandVoiceSkill ?? "",
    skillLocked: brand?.skillLocked ?? false,
    lastIndexedAt: brand?.brandMemory?.lastIndexedAt ?? null,
  });
}
