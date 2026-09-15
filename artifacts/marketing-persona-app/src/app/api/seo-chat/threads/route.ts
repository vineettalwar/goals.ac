import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { createSeoChatThread, listSeoChatThreads } from "@workspace/content-engine/agent-loop";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;
  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const threads = await listSeoChatThreads(projectId, userId!);
  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;
  const body = (await req.json().catch(() => null)) as { projectId?: number; title?: string } | null;
  const projectId = Number(body?.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const thread = await createSeoChatThread({ projectId, userId: userId!, title: body?.title });
  return NextResponse.json({ thread }, { status: 201 });
}
