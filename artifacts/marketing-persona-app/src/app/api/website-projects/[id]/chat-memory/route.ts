import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { getOrCreateProjectChatMemory, patchProjectChatMemory } from "@workspace/content-engine/agent-loop";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;
  const projectId = Number((await params).id);
  if (!Number.isInteger(projectId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const memory = await getOrCreateProjectChatMemory(projectId);
  return NextResponse.json({ memory });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;
  const projectId = Number((await params).id);
  if (!Number.isInteger(projectId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = (await req.json().catch(() => null)) as {
    brandVoiceNotes?: string;
    bannedClaims?: string;
    lastDecision?: string;
  } | null;
  const memory = await patchProjectChatMemory(projectId, body ?? {});
  return NextResponse.json({ memory });
}
