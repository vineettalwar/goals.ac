import type { D1DatabaseBinding } from "@workspace/db";
import type { CfQueueProducer } from "@workspace/jobs/cf-queues";

export type KvNamespaceBinding = {
  get: (key: string, type?: "text") => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
};

export interface CfEdgeBindings {
  DB: D1DatabaseBinding;
  AI_CACHE?: KvNamespaceBinding;
  RATE_LIMIT?: KvNamespaceBinding;
  JOBS_QUEUE?: CfQueueProducer;
}

let bindings: CfEdgeBindings | null = null;

export function setCfEdgeBindings(env: CfEdgeBindings): void {
  bindings = env;
}

export function getCfEdgeBindings(): CfEdgeBindings {
  if (!bindings) throw new Error("CF edge bindings not initialized");
  return bindings;
}
