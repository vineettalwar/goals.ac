/** Minimal KV namespace surface for Workers bindings. */
export type KvNamespaceBinding = {
  get: (key: string, type?: "text") => Promise<string | null>;
  put: (
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ) => Promise<void>;
};

let aiCacheKv: KvNamespaceBinding | null = null;
let rateLimitKv: KvNamespaceBinding | null = null;

export function setKvBindings(bindings: {
  AI_CACHE?: KvNamespaceBinding | null;
  RATE_LIMIT?: KvNamespaceBinding | null;
}): void {
  if (bindings.AI_CACHE !== undefined) aiCacheKv = bindings.AI_CACHE;
  if (bindings.RATE_LIMIT !== undefined) rateLimitKv = bindings.RATE_LIMIT;
}

export function getAiCacheKv(): KvNamespaceBinding | null {
  return aiCacheKv;
}

export function getRateLimitKv(): KvNamespaceBinding | null {
  return rateLimitKv;
}
