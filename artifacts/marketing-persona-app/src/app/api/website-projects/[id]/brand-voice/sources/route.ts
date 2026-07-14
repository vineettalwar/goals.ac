import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import {
  getBrandVoiceSourceStats,
  listBrandVoiceSources,
} from "@workspace/content-engine/brand/brand-voice-indexer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [sources, stats] = await Promise.all([
    listBrandVoiceSources(projectId),
    getBrandVoiceSourceStats(projectId),
  ]);

  return NextResponse.json({ sources, stats });
}
