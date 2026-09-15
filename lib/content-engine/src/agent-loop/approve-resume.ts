import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentActionItemsTable } from "@workspace/db/schema";
import { loadAgentRun } from "./persist";
import { executeStoredAgentRun } from "./run-job";
import type { AgentLoopPayload } from "@workspace/jobs/queues";
import type { RunAgentLoopResult } from "./types";

export type ApproveActionResult = {
  status: "approved" | "resumed";
  itemId: number;
  runId: number | null;
  /** Caller must enqueue this when status is resumed (API/worker, not this module). */
  resumePayload?: AgentLoopPayload;
  result?: RunAgentLoopResult;
};

/**
 * Action Queue Approve:
 * - If the last run is `awaiting_approval`, resume that run (live publish executes).
 * - Otherwise stamp `approved` so Autopilot may pick it up.
 */
export async function approveActionQueueItem(input: {
  projectId: number;
  actionId: number;
  userId: number;
  /** When true, resume inline. Routes should leave this false and enqueue. */
  runInline?: boolean;
}): Promise<ApproveActionResult> {
  const [item] = await db
    .select()
    .from(agentActionItemsTable)
    .where(eq(agentActionItemsTable.id, input.actionId))
    .limit(1);
  if (!item || item.websiteProjectId !== input.projectId) {
    throw new Error("Action not found");
  }

  const lastRun = item.lastRunId ? await loadAgentRun(item.lastRunId) : null;
  if (lastRun?.status === "awaiting_approval") {
    const payload: AgentLoopPayload = {
      projectId: input.projectId,
      userId: input.userId,
      runId: lastRun.id,
      actionItemId: item.id,
      goalKind: lastRun.goal.kind,
      keyword: lastRun.goal.keyword,
      contentPieceId: lastRun.contentPieceId ?? lastRun.goal.contentPieceId,
      actionType: lastRun.goal.actionType,
      targetUrl: lastRun.goal.targetUrl,
      text: lastRun.goal.text,
      resumeApproved: true,
    };
    await db
      .update(agentActionItemsTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(agentActionItemsTable.id, item.id));

    if (input.runInline) {
      const result = await executeStoredAgentRun({
        runId: lastRun.id,
        projectId: input.projectId,
        userId: input.userId,
        goal: lastRun.goal,
        actionItemId: item.id,
        resumeApproved: true,
      });
      return { status: "resumed", itemId: item.id, runId: lastRun.id ?? null, result };
    }
    return { status: "resumed", itemId: item.id, runId: lastRun.id ?? null, resumePayload: payload };
  }

  await db
    .update(agentActionItemsTable)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(agentActionItemsTable.id, item.id));
  return { status: "approved", itemId: item.id, runId: item.lastRunId };
}
