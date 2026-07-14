import { QUEUES, type LegacyCompanyAutopilotJobData, type PgBoss } from "@workspace/jobs";
import { sweepLegacyCompanyAutopilot } from "@workspace/content-engine/legacy-company-autopilot";

export async function registerLegacyCompanyAutopilotHandler(boss: PgBoss): Promise<void> {
  await boss.work<LegacyCompanyAutopilotJobData>(QUEUES.legacyCompanyAutopilot, async () => {
    await sweepLegacyCompanyAutopilot();
  });
}
