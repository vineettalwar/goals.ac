import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { evaluateProjectVoiceReady } from "@workspace/content-engine/brand/project-voice-ready";

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

  const voice = evaluateProjectVoiceReady({
    scrapeStatus: project.scrapeStatus,
    voiceTone: brand?.voiceTone,
    writingExamples: brand?.writingExamples,
    brandVoiceSkill: brand?.brandVoiceSkill,
    platformVoices: brand?.platformVoices,
  });

  return NextResponse.json({
    scrapeStatus: project.scrapeStatus,
    pageCount: project.pageCount ?? 0,
    companyName: brand?.companyName ?? "",
    industry: brand?.industry ?? "",
    targetAudience: brand?.targetAudience ?? "",
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
    platformVoices: brand?.platformVoices ?? null,
    voiceReady: voice.ready,
    voiceBuilding: voice.building,
    hasBrandVoice: voice.hasBrandVoice,
    hasPlatformVoice: voice.hasPlatformVoice,
  });
}
