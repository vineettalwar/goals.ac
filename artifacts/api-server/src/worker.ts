/**
 * @deprecated Use `artifacts/worker` (`pnpm --filter @workspace/worker run dev`) as the
 * canonical pg-boss worker. This duplicate entrypoint remains for legacy `--profile legacy`
 * Docker setups only.
 *
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
import {
  registerKeywordRankCheckHandler,
  KEYWORD_RANK_SWEEP_CRON,
} from "./jobs/keywordRankCheck";
import { registerContentGenerateHandler } from "./jobs/contentGenerate";
import {
  registerContentGenerateSweepHandler,
  CONTENT_GENERATE_SWEEP_CRON,
} from "./jobs/contentGenerateSweep";
import {
  registerContentPublishHandler,
  registerScheduledPublishSweepHandler,
} from "./jobs/contentPublish";
import {
  registerLlmVisibilityCheckHandler,
  LLM_VISIBILITY_SWEEP_CRON,
} from "./jobs/llmVisibilityCheck";
import {
  registerGeoReauditSweepHandler,
  GEO_REAUDIT_SWEEP_CRON,
} from "./jobs/geoReauditSweep";
import {
  registerKeywordOpportunitySweepHandler,
  KEYWORD_OPPORTUNITY_SWEEP_CRON,
  registerGscSearchAnalyticsSyncHandler,
  GSC_SEARCH_ANALYTICS_SYNC_CRON,
  registerGa4AnalyticsSyncHandler,
  GA4_ANALYTICS_SYNC_CRON,
  registerArticleIdeaSourceSyncHandler,
  ARTICLE_IDEA_SOURCE_SYNC_CRON,
  registerBrandVoiceIndexHandler,
  registerBrandVoiceSkillRegenHandler,
  registerBrandVoiceResyncHandler,
  BRAND_VOICE_RESYNC_CRON,
  registerEvergreenRecycleSweepHandler,
  EVERGREEN_RECYCLE_SWEEP_CRON,
  registerSocialHistorySyncHandler,
  SOCIAL_HISTORY_SYNC_CRON,
  registerSocialMetricsSyncHandler,
  SOCIAL_METRICS_SYNC_CRON,
} from "@workspace/jobs";

// Daily at 04:00 UTC.
const CONNECTION_HEALTH_CHECK_CRON = "0 4 * * *";
const SCHEDULED_PUBLISH_SWEEP_CRON = "*/15 * * * *";

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
  await registerKeywordRankCheckHandler(boss);
  await registerContentGenerateHandler(boss);
  await registerContentGenerateSweepHandler(boss);
  await registerContentPublishHandler(boss);
  await registerScheduledPublishSweepHandler(boss);
  await registerLlmVisibilityCheckHandler(boss);
  await registerGeoReauditSweepHandler(boss);
  await registerKeywordOpportunitySweepHandler(boss);
  await registerGscSearchAnalyticsSyncHandler(boss);
  await registerGa4AnalyticsSyncHandler(boss);
  await registerArticleIdeaSourceSyncHandler(boss);
  await registerBrandVoiceIndexHandler(boss);
  await registerBrandVoiceSkillRegenHandler(boss);
  await registerBrandVoiceResyncHandler(boss);
  await registerEvergreenRecycleSweepHandler(boss);
  await registerSocialHistorySyncHandler(boss);
  await registerSocialMetricsSyncHandler(boss);

  // The cron payload is an empty sweep job — the handler enumerates every
  // connection and fans out one per-row health-check job.
  await scheduleCron(QUEUES.connectionHealthCheck, CONNECTION_HEALTH_CHECK_CRON, {});
  await scheduleCron(QUEUES.keywordRankCheck, KEYWORD_RANK_SWEEP_CRON, {});
  await scheduleCron(QUEUES.contentGenerateSweep, CONTENT_GENERATE_SWEEP_CRON, {});
  await scheduleCron(QUEUES.scheduledPublishSweep, SCHEDULED_PUBLISH_SWEEP_CRON, {});
  await scheduleCron(QUEUES.llmVisibilityCheck, LLM_VISIBILITY_SWEEP_CRON, {});
  await scheduleCron(QUEUES.geoReauditSweep, GEO_REAUDIT_SWEEP_CRON, {});
  await scheduleCron(QUEUES.keywordOpportunitySweep, KEYWORD_OPPORTUNITY_SWEEP_CRON, {});
  await scheduleCron(QUEUES.gscSearchAnalyticsSync, GSC_SEARCH_ANALYTICS_SYNC_CRON, {});
  await scheduleCron(QUEUES.ga4AnalyticsSync, GA4_ANALYTICS_SYNC_CRON, {});
  await scheduleCron(QUEUES.articleIdeaSourceSync, ARTICLE_IDEA_SOURCE_SYNC_CRON, {});
  await scheduleCron(QUEUES.brandVoiceResync, BRAND_VOICE_RESYNC_CRON, {});
  await scheduleCron(QUEUES.evergreenRecycleSweep, EVERGREEN_RECYCLE_SWEEP_CRON, {});
  await scheduleCron(QUEUES.socialHistorySync, SOCIAL_HISTORY_SYNC_CRON, {});
  await scheduleCron(QUEUES.socialMetricsSync, SOCIAL_METRICS_SYNC_CRON, {});

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
