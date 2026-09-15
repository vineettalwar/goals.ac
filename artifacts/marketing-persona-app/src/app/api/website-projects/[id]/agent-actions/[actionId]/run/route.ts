import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentActionItemsTable, agentRunsTable } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
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

  const [action] = await db
    .select()
    .from(agentActionItemsTable)
    .where(eq(agentActionItemsTable.id, actionId))
    .limit(1);
  if (!action || action.websiteProjectId !== projectId) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const [run] = await db
    .insert(agentRunsTable)
    .values({
      websiteProjectId: projectId,
      userId: userId!,
      goalKind: "execute_action",
      goal: {
        kind: "execute_action",
        text: action.title,
        projectId,
        keyword: action.keyword,
        actionItemId: action.id,
        actionType: action.actionType,
        targetUrl: action.url,
      },
      status: "running",
      policy: { allowLivePublish: false, approveFirstForLivePublish: true, maxCredits: 20 },
      trajectory: [],
    })
    .returning({ id: agentRunsTable.id });

  await db
    .update(agentActionItemsTable)
    .set({ status: "running", lastRunId: run?.id ?? null, updatedAt: new Date() })
    .where(eq(agentActionItemsTable.id, actionId));

  await enqueue(QUEUES.agentLoop, {
    projectId,
    userId: userId!,
    runId: run?.id,
    actionItemId: actionId,
    goalKind: "execute_action",
    keyword: action.keyword,
    actionType: action.actionType,
    targetUrl: action.url ?? undefined,
    text: action.title,
  });

  return NextResponse.json({ queued: true, runId: run?.id }, { status: 202 });
}
