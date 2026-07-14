import type { QueueName, QueuePayloadFor } from "@workspace/jobs/queues";

export function acceptedJobResponse(
  jobId: string,
  queue: QueueName,
  extra?: Record<string, unknown>,
): Response {
  return Response.json(
    {
      accepted: true,
      jobId,
      queue,
      status: "queued",
      ...extra,
    },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

export type EnqueueFn = <Q extends QueueName>(
  queue: Q,
  payload: QueuePayloadFor<Q>,
) => Promise<string | null>;
