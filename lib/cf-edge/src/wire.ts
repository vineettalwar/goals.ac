import { setD1Binding } from "@workspace/db";
import { setJobsQueueBinding } from "@workspace/jobs/cf-queues";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";

export function wireCfEdgeEnv(env: CfEdgeBindings & { DB_DIALECT?: string }): void {
  setD1Binding(env.DB);
  if (env.JOBS_QUEUE) setJobsQueueBinding(env.JOBS_QUEUE);
  process.env.DB_DIALECT = env.DB_DIALECT ?? "d1";
  process.env.CF_EDGE_HTTP = "1";
}
