import { isCfEdgeHttp } from "@workspace/cf-edge/http-mode";
import { NextResponse } from "next/server";
import { enqueue } from "@workspace/jobs";
import type { QueueName, QueuePayloadFor } from "@workspace/jobs/queues";

export { isCfEdgeHttp };

/** On CF Free edge, all heavy writes must enqueue (ignore inline unless local dev). */
export function shouldQueueWrites(body?: { async?: boolean } | null): boolean {
  return isCfEdgeHttp() || body?.async === true;
}

/** SSE/stream routes cannot run on Free HTTP Workers (10 ms CPU). */
export function edgeStreamingBlocked(): NextResponse | null {
  if (!isCfEdgeHttp()) return null;
  return NextResponse.json(
    {
      error:
        "Streaming is unavailable on Cloudflare Free edge. Use the non-stream route with async:true.",
      code: "EDGE_STREAMING_DISABLED",
    },
    { status: 501, headers: { "Cache-Control": "no-store" } },
  );
}

export async function enqueueOnEdge<Q extends QueueName>(
  queue: Q,
  payload: QueuePayloadFor<Q>,
  extra?: Record<string, unknown>,
): Promise<NextResponse | null> {
  if (!isCfEdgeHttp()) return null;
  const jobId = await enqueue(queue, payload);
  return NextResponse.json(
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
