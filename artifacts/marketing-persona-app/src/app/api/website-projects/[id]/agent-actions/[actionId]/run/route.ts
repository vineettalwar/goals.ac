import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { startExecuteActionRun } from "@workspace/content-engine/agent-loop";
import { enqueue, QUEUES } from "@workspace/jobs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; actionId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr, actionId: actionIdStr } = await params;
  const projectId = Number(idStr);
  const actionId = Number(actionIdStr);
  if (isNaN(projectId) || isNaN(actionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const started = await startExecuteActionRun({ projectId, userId: userId!, actionId });
    await enqueue(QUEUES.agentLoop, started.payload);
    return NextResponse.json({ queued: true, runId: started.runId }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Run failed";
    const status = message === "Action not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
