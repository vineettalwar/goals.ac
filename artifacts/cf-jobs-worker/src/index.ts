import { setD1Binding } from "@workspace/db";
import { setKvBindings, getAiCacheKv } from "@workspace/content-engine/core/kv-binding";
import { setContentMediaR2Binding } from "@workspace/media";
import { processJobEnvelope, type JobEnvelope } from "@workspace/jobs";
import { QUEUES } from "@workspace/jobs/queues";
import { CONTENT_GENERATE_SWEEP_CRON } from "@workspace/jobs/handlers";

const JOB_STATUS_TTL_SECONDS = 86_400;

async function patchJobStatusKv(
  jobId: string,
  patch: { status: string; error?: string; message?: string },
): Promise<void> {
  const kv = getAiCacheKv();
  if (!kv) return;
  const key = `job:status:${jobId}`;
  const raw = await kv.get(key, "text");
  let existing: Record<string, unknown> = { jobId };
  if (raw) {
    try {
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      existing = { jobId };
    }
  }
  await kv.put(
    key,
    JSON.stringify({
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    }),
    { expirationTtl: JOB_STATUS_TTL_SECONDS },
  );
}

async function processQueueMessage(message: Message<JobEnvelope>): Promise<void> {
  const jobId = message.body.jobId;
  if (jobId) {
    await patchJobStatusKv(jobId, { status: "running" });
  }
  try {
    await processJobEnvelope(message.body);
    if (jobId) {
      await patchJobStatusKv(jobId, { status: "completed" });
    }
    message.ack();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Job failed";
    if (jobId) {
      await patchJobStatusKv(jobId, { status: "failed", error: errorMessage, message: errorMessage });
    }
    console.error("[goals-ac-jobs] job failed", message.body?.queue, err);
    message.retry();
  }
}

const CONNECTION_HEALTH_CHECK_CRON = "0 4 * * *";
const SCHEDULED_PUBLISH_SWEEP_CRON = "*/15 * * * *";
/** Workers Free allows 5 crons/account — daily bundle at 07:00 UTC */
const DAILY_SWEEP_CRON = "0 7 * * *";
/** Weekly bundle — Monday 09:00 UTC */
const WEEKLY_SWEEP_CRON = "0 9 * * 1";

export interface Env {
  DB: import("@workspace/db").D1DatabaseBinding;
  AI_CACHE: import("@workspace/content-engine/core/kv-binding").KvNamespaceBinding;
  RATE_LIMIT: import("@workspace/content-engine/core/kv-binding").KvNamespaceBinding;
  CONTENT_MEDIA_R2?: import("@workspace/media").ContentMediaR2Binding;
}

function wireBindings(env: Env): void {
  setD1Binding(env.DB);
  setKvBindings({ AI_CACHE: env.AI_CACHE, RATE_LIMIT: env.RATE_LIMIT });
  if (env.CONTENT_MEDIA_R2) setContentMediaR2Binding(env.CONTENT_MEDIA_R2);
}

async function runDailySweep(): Promise<void> {
  const sweeps = [
    QUEUES.keywordRankCheck,
    QUEUES.evergreenRecycleSweep,
    QUEUES.gscSearchAnalyticsSync,
    QUEUES.ga4AnalyticsSync,
    QUEUES.socialMetricsSync,
    QUEUES.publishReliabilityAlert,
  ] as const;
  for (const queue of sweeps) {
    await processJobEnvelope({ queue, payload: {} });
  }
}

async function runWeeklySweep(): Promise<void> {
  const sweeps = [
    QUEUES.llmVisibilityCheck,
    QUEUES.geoReauditSweep,
    // Before the keyword sweep: a refresh for a page that already ranks should
    // reach the autopilot queue ahead of new-article opportunities.
    QUEUES.contentDecaySweep,
    QUEUES.keywordOpportunitySweep,
    QUEUES.articleIdeaSourceSync,
    QUEUES.brandVoiceResync,
    QUEUES.socialHistorySync,
  ] as const;
  for (const queue of sweeps) {
    await processJobEnvelope({ queue, payload: {} });
  }
}

async function runCronSweep(cron: string): Promise<void> {
  const sweepByCron: Record<string, () => Promise<void>> = {
    [CONNECTION_HEALTH_CHECK_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.connectionHealthCheck, payload: {} }),
    [SCHEDULED_PUBLISH_SWEEP_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.scheduledPublishSweep, payload: {} }),
    [CONTENT_GENERATE_SWEEP_CRON]: () =>
      processJobEnvelope({ queue: QUEUES.contentGenerateSweep, payload: {} }),
    [DAILY_SWEEP_CRON]: runDailySweep,
    [WEEKLY_SWEEP_CRON]: runWeeklySweep,
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
      await processQueueMessage(message);
    }
  },
};
