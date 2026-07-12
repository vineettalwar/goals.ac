import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { LlmVisibilityCheckJobData, LlmVisibilityCheckPayload, PgBoss } from "@workspace/jobs";
import { parseVisibilitySettings } from "../lib/visibilitySettings";
import { runVisibilityCheckForProject } from "../services/llmVisibilityService";
import { logger } from "../lib/logger";

/** Weekly on Sunday at 07:00 UTC */
export const LLM_VISIBILITY_SWEEP_CRON = "0 7 * * 0";

function isProjectPayload(data: LlmVisibilityCheckJobData): data is LlmVisibilityCheckPayload {
  return typeof (data as Partial<LlmVisibilityCheckPayload>).projectId === "number";
}

export async function registerLlmVisibilityCheckHandler(boss: PgBoss): Promise<void> {
  await boss.work<LlmVisibilityCheckJobData>(QUEUES.llmVisibilityCheck, async ([job]) => {
    const data = job.data;
    if (isProjectPayload(data)) {
      await runVisibilityCheckForProject(data.projectId);
    } else {
      await sweepLlmVisibilityProjects();
    }
  });
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
