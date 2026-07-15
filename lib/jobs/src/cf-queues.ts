import type { QueueName, QueuePayloadFor } from "./queues";

/** Minimal Cloudflare Queue producer surface (avoids @cloudflare/workers-types in lib/jobs). */
export type CfQueueProducer = {
  send: (body: unknown, options?: { delaySeconds?: number }) => Promise<void>;
};

export interface JobEnvelope<Q extends QueueName = QueueName> {
  queue: Q;
  payload: QueuePayloadFor<Q>;
  /** Correlates with KV `job:status:*` written by the write worker. */
  jobId?: string;
}

let jobsQueue: CfQueueProducer | null = null;

export function setJobsQueueBinding(binding: CfQueueProducer | null): void {
  jobsQueue = binding;
}

export function resolveJobsQueue(): CfQueueProducer | null {
  return jobsQueue;
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

  const jobId = `cf:${queue}:${Date.now()}`;
  const envelope: JobEnvelope<Q> = { queue, payload, jobId };
  await producer.send(envelope, options?.delaySeconds ? { delaySeconds: options.delaySeconds } : undefined);
  return jobId;
}
