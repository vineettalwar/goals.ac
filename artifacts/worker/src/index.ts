/**
 * Standalone pg-boss worker — no Express HTTP server.
 * Run: pnpm --filter @workspace/worker run dev
 */
import {
  getBoss,
  stopBoss,
  scheduleCron,
  QUEUES,
  registerConnectionHealthCheckHandler,
  registerKeywordRankCheckHandler,
  KEYWORD_RANK_SWEEP_CRON,
  registerContentGenerateHandler,
  registerContentGenerateSweepHandler,
  CONTENT_GENERATE_SWEEP_CRON,
  registerContentPublishHandler,
  registerScheduledPublishSweepHandler,
  registerLlmVisibilityCheckHandler,
  LLM_VISIBILITY_SWEEP_CRON,
  registerGeoReauditSweepHandler,
  GEO_REAUDIT_SWEEP_CRON,
  registerKeywordOpportunitySweepHandler,
  KEYWORD_OPPORTUNITY_SWEEP_CRON,
} from "@workspace/jobs";
import pino from "pino";

const workerLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV === "production"
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});

const CONNECTION_HEALTH_CHECK_CRON = "0 4 * * *";
const SCHEDULED_PUBLISH_SWEEP_CRON = "0 5 * * *";

async function main(): Promise<void> {
  const boss = await getBoss();

  boss.on("error", (err) => {
    workerLogger.error({ err }, "pg-boss error");
  });

  for (const queueName of Object.values(QUEUES)) {
    await boss.createQueue(queueName);
  }

  await registerConnectionHealthCheckHandler(boss);
  await registerKeywordRankCheckHandler(boss);
  await registerContentGenerateHandler(boss);
  await registerContentGenerateSweepHandler(boss);
  await registerContentPublishHandler(boss);
  await registerScheduledPublishSweepHandler(boss);
  await registerLlmVisibilityCheckHandler(boss);
  await registerGeoReauditSweepHandler(boss);
  await registerKeywordOpportunitySweepHandler(boss);

  await scheduleCron(QUEUES.connectionHealthCheck, CONNECTION_HEALTH_CHECK_CRON, {});
  await scheduleCron(QUEUES.keywordRankCheck, KEYWORD_RANK_SWEEP_CRON, {});
  await scheduleCron(QUEUES.contentGenerateSweep, CONTENT_GENERATE_SWEEP_CRON, {});
  await scheduleCron(QUEUES.scheduledPublishSweep, SCHEDULED_PUBLISH_SWEEP_CRON, {});
  await scheduleCron(QUEUES.llmVisibilityCheck, LLM_VISIBILITY_SWEEP_CRON, {});
  await scheduleCron(QUEUES.geoReauditSweep, GEO_REAUDIT_SWEEP_CRON, {});
  await scheduleCron(QUEUES.keywordOpportunitySweep, KEYWORD_OPPORTUNITY_SWEEP_CRON, {});

  workerLogger.info({ queues: Object.values(QUEUES) }, "Job worker started");

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    workerLogger.info({ signal }, "Worker received shutdown signal");
    stopBoss()
      .then(() => process.exit(0))
      .catch((err) => {
        workerLogger.error({ err }, "Error stopping pg-boss");
        process.exit(1);
      });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  workerLogger.error({ err }, "Job worker failed to start");
  process.exit(1);
});
