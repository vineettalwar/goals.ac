import type { AgentLoopPayload, PgBoss } from "@workspace/jobs";
import { QUEUES } from "@workspace/jobs";
import { executeStoredAgentRun } from "@workspace/content-engine/agent-loop";
import { logger } from "../logger";

export async function processAgentLoop(data: AgentLoopPayload): Promise<void> {
  const goalKind = data.goalKind ?? (data.actionItemId ? "execute_action" : "research_then_draft");
  if (goalKind === "opportunity_scan") {
    const result = await executeStoredAgentRun({
      runId: data.runId,
      projectId: data.projectId,
      userId: data.userId ?? null,
      goal: {
        kind: "opportunity_scan",
        text: data.text ?? "Score GSC and persist the action queue",
        projectId: data.projectId,
      },
    });
    logger.info({ projectId: data.projectId, runId: result.id, status: result.status }, "Agent opportunity scan");
    return;
  }

  const result = await executeStoredAgentRun({
    runId: data.runId,
    projectId: data.projectId,
    userId: data.userId ?? null,
    actionItemId: data.actionItemId,
    resumeApproved: data.resumeApproved,
    goal: {
      kind: goalKind,
      text: data.text ?? "Employee run",
      projectId: data.projectId,
      keyword: data.keyword,
      contentPieceId: data.contentPieceId,
      actionItemId: data.actionItemId,
      actionType: data.actionType,
      targetUrl: data.targetUrl,
    },
  });
  logger.info({ projectId: data.projectId, runId: result.id, status: result.status }, "Agent loop finished");
}

export async function registerAgentLoopHandler(boss: PgBoss): Promise<void> {
  await boss.work<AgentLoopPayload>(QUEUES.agentLoop, async ([job]) => {
    await processAgentLoop(job.data);
  });
}
