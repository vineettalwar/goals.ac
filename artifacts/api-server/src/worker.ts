/**
 * Standalone job-worker entrypoint (roadmap §2 backlog item 6, §7).
 *
 * Deliberately NOT imported by `src/index.ts` — the HTTP API and the job
 * worker are separate processes/deployments sharing the same Postgres-backed
 * queue (`@workspace/jobs`, pg-boss). Run with `pnpm run start:worker`
 * (or `pnpm run dev:worker` in development).
 */
import { getBoss, stopBoss, scheduleCron, QUEUES } from "@workspace/jobs";
import { logger } from "./lib/logger";
import { registerConnectionHealthCheckHandler } from "./jobs/connectionHealthCheck";

// Daily at 04:00 UTC.
const CONNECTION_HEALTH_CHECK_CRON = "0 4 * * *";

async function main(): Promise<void> {
  const boss = await getBoss();

  boss.on("error", (err) => {
    logger.error({ err }, "pg-boss error");
  });

  // pg-boss v10+ requires a queue to be created before send/work is called
  // against it.
  for (const queueName of Object.values(QUEUES)) {
    await boss.createQueue(queueName);
  }

  await registerConnectionHealthCheckHandler(boss);

  // The cron payload is an empty sweep job — the handler enumerates every
  // connection and fans out one per-row health-check job.
  await scheduleCron(QUEUES.connectionHealthCheck, CONNECTION_HEALTH_CHECK_CRON, {});

  logger.info({ queues: Object.values(QUEUES) }, "Job worker started");

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Worker received shutdown signal, stopping pg-boss");
    stopBoss()
      .then(() => {
        logger.info("pg-boss stopped, exiting");
        process.exit(0);
      })
      .catch((err) => {
        logger.error({ err }, "Error stopping pg-boss during shutdown");
        process.exit(1);
      });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "Job worker failed to start");
  process.exit(1);
});
