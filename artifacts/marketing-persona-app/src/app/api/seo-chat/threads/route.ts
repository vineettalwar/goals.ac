import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import {
  bootstrapOnboardThread,
  createSeoChatThread,
  getSeoChatThread,
  listSeoChatThreads,
} from "@workspace/content-engine/agent-loop";

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
  const body = (await req.json().catch(() => null)) as {
    projectId?: number;
    title?: string;
    onboard?: boolean;
    text?: string;
  } | null;
  if (body?.onboard || (!body?.projectId && body?.text)) {
    try {
      const started = await bootstrapOnboardThread({ userId: userId!, text: body.text ?? body.title ?? "" });
      const packed = await getSeoChatThread(started.threadId);
      return NextResponse.json({ thread: packed?.thread, projectId: started.projectId }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Onboard failed" }, { status: 400 });
    }
  }
  const projectId = Number(body?.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const thread = await createSeoChatThread({ projectId, userId: userId!, title: body?.title });
    return NextResponse.json({ thread }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start a thread" },
      { status: 500 },
    );
  }
}
