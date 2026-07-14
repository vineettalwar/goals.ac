import type { QueueName, QueuePayloadFor } from "./queues";

/** Minimal Cloudflare Queue producer surface (avoids @cloudflare/workers-types in lib/jobs). */
export type CfQueueProducer = {
  send: (body: unknown, options?: { delaySeconds?: number }) => Promise<void>;
};

export interface JobEnvelope<Q extends QueueName = QueueName> {
  queue: Q;
  payload: QueuePayloadFor<Q>;
}

let jobsQueue: CfQueueProducer | null = null;

export function setJobsQueueBinding(binding: CfQueueProducer | null): void {
  jobsQueue = binding;
}

export function resolveJobsQueue(): CfQueueProducer | null {
  if (jobsQueue) return jobsQueue;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext: () => { env: { JOBS_QUEUE?: CfQueueProducer } };
    };
    const { env } = getCloudflareContext();
    if (env?.JOBS_QUEUE) {
      setJobsQueueBinding(env.JOBS_QUEUE);
      return jobsQueue;
    }
  } catch {
    // Not in Workers runtime.
  }

  return null;
}

export async function sendToCfQueue<Q extends QueueName>(
  queue: Q,
  payload: QueuePayloadFor<Q>,
  options?: { delaySeconds?: number },
): Promise<string | null> {
  const producer = resolveJobsQueue();
  if (!producer) {
    throw new Error(
      "JOBS_QUEUE binding is not configured. Add queues.producers to wrangler.jsonc and deploy the goals-ac Worker.",
    );
  }

  const envelope: JobEnvelope<Q> = { queue, payload };
  await producer.send(envelope, options?.delaySeconds ? { delaySeconds: options.delaySeconds } : undefined);
  return `cf:${queue}:${Date.now()}`;
}
