import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  pinRoadmapToProject,
  unpinRoadmapFromProject,
  verifyProjectOwnership,
  verifyRoadmapExists,
} from "@/lib/projects/pin-roadmap-to-project";

type RouteParams = { params: Promise<{ id: string; roadmapId: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr, roadmapId: roadmapIdStr } = await params;
  const projectId = Number(idStr);
  const roadmapId = Number(roadmapIdStr);

  if (isNaN(projectId) || isNaN(roadmapId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const project = await verifyProjectOwnership(projectId, userId!);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const roadmap = await verifyRoadmapExists(roadmapId);
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    await pinRoadmapToProject(projectId, roadmapId);
    return NextResponse.json({ message: "Roadmap pinned to project" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr, roadmapId: roadmapIdStr } = await params;
  const projectId = Number(idStr);
  const roadmapId = Number(roadmapIdStr);

  if (isNaN(projectId) || isNaN(roadmapId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const project = await verifyProjectOwnership(projectId, userId!);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await unpinRoadmapFromProject(projectId, roadmapId);
    return NextResponse.json({ message: "Roadmap unpinned from project" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
