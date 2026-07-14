import { setD1Binding } from "@workspace/db";
import { setKvBindings } from "@workspace/content-engine/core/kv-binding";
import { processJobEnvelope, type JobEnvelope } from "@workspace/jobs";
import { QUEUES } from "@workspace/jobs/queues";
import {
  KEYWORD_RANK_SWEEP_CRON,
  CONTENT_GENERATE_SWEEP_CRON,
  LLM_VISIBILITY_SWEEP_CRON,
  GEO_REAUDIT_SWEEP_CRON,
  KEYWORD_OPPORTUNITY_SWEEP_CRON,
  GSC_SEARCH_ANALYTICS_SYNC_CRON,
  GA4_ANALYTICS_SYNC_CRON,
  ARTICLE_IDEA_SOURCE_SYNC_CRON,
  BRAND_VOICE_RESYNC_CRON,
  SOCIAL_HISTORY_SYNC_CRON,
  SOCIAL_METRICS_SYNC_CRON,
} from "@workspace/jobs/handlers";

const CONNECTION_HEALTH_CHECK_CRON = "0 4 * * *";
const SCHEDULED_PUBLISH_SWEEP_CRON = "*/15 * * * *";

export interface Env {
  DB: import("@workspace/db").D1DatabaseBinding;
  AI_CACHE: import("@workspace/content-engine/core/kv-binding").KvNamespaceBinding;
  RATE_LIMIT: import("@workspace/content-engine/core/kv-binding").KvNamespaceBinding;
}

function wireBindings(env: Env): void {
  setD1Binding(env.DB);
  setKvBindings({ AI_CACHE: env.AI_CACHE, RATE_LIMIT: env.RATE_LIMIT });
}

async function runCronSweep(cron: string): Promise<void> {
  const sweepByCron: Record<string, () => Promise<void>> = {
    [CONNECTION_HEALTH_CHECK_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.connectionHealthCheck, payload: {} }),
    [SCHEDULED_PUBLISH_SWEEP_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.scheduledPublishSweep, payload: {} }),
    [CONTENT_GENERATE_SWEEP_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.contentGenerateSweep, payload: {} }),
    [KEYWORD_RANK_SWEEP_CRON]: async () => {
      await processJobEnvelope({ queue: QUEUES.keywordRankCheck, payload: {} });
      await processJobEnvelope({ queue: QUEUES.evergreenRecycleSweep, payload: {} });
    },
    [LLM_VISIBILITY_SWEEP_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.llmVisibilityCheck, payload: {} }),
    [GEO_REAUDIT_SWEEP_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.geoReauditSweep, payload: {} }),
    [KEYWORD_OPPORTUNITY_SWEEP_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.keywordOpportunitySweep, payload: {} }),
    [GSC_SEARCH_ANALYTICS_SYNC_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.gscSearchAnalyticsSync, payload: {} }),
    [GA4_ANALYTICS_SYNC_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.ga4AnalyticsSync, payload: {} }),
    [ARTICLE_IDEA_SOURCE_SYNC_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.articleIdeaSourceSync, payload: {} }),
    [BRAND_VOICE_RESYNC_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.brandVoiceResync, payload: {} }),
    [SOCIAL_HISTORY_SYNC_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.socialHistorySync, payload: {} }),
    [SOCIAL_METRICS_SYNC_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.socialMetricsSync, payload: {} }),
  };

  const run = sweepByCron[cron];
  if (!run) {
    console.warn(`[goals-ac-jobs] unhandled cron: ${cron}`);
    return;
  }
  await run();
}

export default {
  async fetch(): Promise<Response> {
    return new Response(JSON.stringify({ status: "ok", worker: "goals-ac-jobs" }), {
      headers: { "Content-Type": "application/json" },
    });
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    wireBindings(env);
    try {
      await runCronSweep(event.cron);
    } catch (err) {
      console.error("[goals-ac-jobs] cron failed", event.cron, err);
      throw err;
    }
  },

  async queue(batch: MessageBatch<JobEnvelope>, env: Env): Promise<void> {
    wireBindings(env);
    for (const message of batch.messages) {
      try {
        await processJobEnvelope(message.body);
        message.ack();
      } catch (err) {
        console.error("[goals-ac-jobs] job failed", message.body?.queue, err);
        message.retry();
      }
    }
  },
};
