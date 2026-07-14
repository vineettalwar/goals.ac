import { getCloudflareContext } from "@opennextjs/cloudflare";
import { setD1Binding } from "@workspace/db";
import { setJobsQueueBinding } from "@workspace/jobs/cf-queues";
import { setKvBindings } from "@workspace/content-engine/core/kv-binding";

let initialized = false;

/** Wire Cloudflare bindings (D1, KV, Queues) into shared libs. */
export function initCfBindings(): void {
  if (initialized) return;
  if (process.env.DB_DIALECT?.trim().toLowerCase() !== "d1") return;

  try {
    const { env } = getCloudflareContext() as {
      env?: {
        DB?: Parameters<typeof setD1Binding>[0];
        AI_CACHE?: Parameters<typeof setKvBindings>[0]["AI_CACHE"];
        RATE_LIMIT?: Parameters<typeof setKvBindings>[0]["RATE_LIMIT"];
        JOBS_QUEUE?: Parameters<typeof setJobsQueueBinding>[0];
      };
    };

    if (env?.DB) setD1Binding(env.DB);
    if (env?.AI_CACHE || env?.RATE_LIMIT) {
      setKvBindings({ AI_CACHE: env.AI_CACHE ?? null, RATE_LIMIT: env.RATE_LIMIT ?? null });
    }
    if (env?.JOBS_QUEUE) setJobsQueueBinding(env.JOBS_QUEUE);

    initialized = true;
  } catch {
    // next dev / Node.js — bindings unavailable.
  }
}
