import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/org/org-access";
import { listPinnedRoadmapSummaries } from "@/lib/projects/pin-roadmap-to-project";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(id, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const roadmaps = await listPinnedRoadmapSummaries(id);
  return NextResponse.json({ roadmaps });
}
