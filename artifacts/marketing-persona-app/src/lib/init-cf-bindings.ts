import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";
// Edge-safe deep import — `@workspace/db` barrel pulls pg/postgres (Node crypto).
import { setD1Binding } from "@workspace/db/d1-binding";
import { setJobsQueueBinding } from "@workspace/jobs/cf-queues";
import { setKvBindings } from "@workspace/content-engine/core/kv-binding";
import { setContentMediaR2Binding } from "@workspace/media";

let initialized = false;

/** Wire Cloudflare bindings (D1, KV, Queues, content-media R2) into shared libs. */
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
        CONTENT_MEDIA_R2?: Parameters<typeof setContentMediaR2Binding>[0];
      };
    };

    if (env?.DB) setD1Binding(env.DB);
    if (env?.AI_CACHE || env?.RATE_LIMIT) {
      setKvBindings({ AI_CACHE: env.AI_CACHE ?? null, RATE_LIMIT: env.RATE_LIMIT ?? null });
    }
    if (env?.JOBS_QUEUE) setJobsQueueBinding(env.JOBS_QUEUE);
    if (env?.CONTENT_MEDIA_R2) setContentMediaR2Binding(env.CONTENT_MEDIA_R2);

    initialized = true;
  } catch {
    // next dev / Node.js — bindings unavailable.
  }
}
