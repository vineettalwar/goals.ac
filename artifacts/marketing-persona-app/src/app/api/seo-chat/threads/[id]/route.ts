import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { getSeoChatThread } from "@workspace/content-engine/agent-loop";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;
  const threadId = Number((await params).id);
  if (!Number.isInteger(threadId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const packed = await getSeoChatThread(threadId);
  if (!packed || packed.thread.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await requireProjectAccess(packed.thread.websiteProjectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  return NextResponse.json(packed);
}
