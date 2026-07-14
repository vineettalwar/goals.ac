import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { LlmVisibilityCheckJobData, LlmVisibilityCheckPayload, PgBoss } from "@workspace/jobs";
import { parseVisibilitySettings } from "@workspace/content-engine/support/settings/visibility-settings";
import { runVisibilityCheckForProject } from "@workspace/content-engine/strategy/llm-visibility-service";
import {
  cancelWorkerAiBilling,
  completeWorkerAiBilling,
  prepareWorkerAiBilling,
  resolveProjectOwnerUserId,
} from "../worker-billing";
import { logger } from "../logger";

/** Weekly on Sunday at 07:00 UTC */
export const LLM_VISIBILITY_SWEEP_CRON = "0 7 * * 0";

function isProjectPayload(data: LlmVisibilityCheckJobData): data is LlmVisibilityCheckPayload {
  return typeof (data as Partial<LlmVisibilityCheckPayload>).projectId === "number";
}

export async function registerLlmVisibilityCheckHandler(boss: PgBoss): Promise<void> {
  await boss.work<LlmVisibilityCheckJobData>(QUEUES.llmVisibilityCheck, async ([job]) => {
    const data = job.data;
    if (isProjectPayload(data)) {
      await runVisibilityCheckWithBilling(data.projectId);
    } else {
      await sweepLlmVisibilityProjects();
    }
  });
}

async function runVisibilityCheckWithBilling(projectId: number): Promise<void> {
  const userId = await resolveProjectOwnerUserId(projectId);
  if (!userId) {
    logger.warn({ projectId }, "LLM visibility check: project owner not found");
    return;
  }

  const billing = await prepareWorkerAiBilling({
    userId,
    tier: "planning",
    quotaKind: "article",
  });
  if (!billing.ok) {
    logger.warn({ projectId, reason: billing.reason }, "LLM visibility check skipped: billing denied");
    return;
  }

  try {
    await runVisibilityCheckForProject(projectId);
    await completeWorkerAiBilling(billing.session, {
      userId,
      eventType: "llm_visibility_check",
      companyId: projectId,
    });
  } catch (err) {
    await cancelWorkerAiBilling(billing.session, err instanceof Error ? err.message : "llm_visibility_failed");
    throw err;
  }
}

async function sweepLlmVisibilityProjects(): Promise<void> {
  const projects = await db
    .select({
      id: websiteProjectsTable.id,
      visibilitySettings: websiteProjectsTable.visibilitySettings,
    })
    .from(websiteProjectsTable);

  const due = projects.filter((p) => parseVisibilitySettings(p.visibilitySettings).llmTrackingEnabled);

  logger.info({ count: due.length }, "LLM visibility sweep: projects due");

  for (const project of due) {
    await enqueue(QUEUES.llmVisibilityCheck, { projectId: project.id });
  }
}
