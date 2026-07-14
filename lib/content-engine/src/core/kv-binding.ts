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
  if (aiCacheKv) return aiCacheKv;
  return resolveKvFromContext()?.AI_CACHE ?? null;
}

export function getRateLimitKv(): KvNamespaceBinding | null {
  if (rateLimitKv) return rateLimitKv;
  return resolveKvFromContext()?.RATE_LIMIT ?? null;
}

function resolveKvFromContext(): { AI_CACHE?: KvNamespaceBinding; RATE_LIMIT?: KvNamespaceBinding } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext: () => {
        env: { AI_CACHE?: KvNamespaceBinding; RATE_LIMIT?: KvNamespaceBinding };
      };
    };
    const { env } = getCloudflareContext();
    if (env?.AI_CACHE) aiCacheKv = env.AI_CACHE;
    if (env?.RATE_LIMIT) rateLimitKv = env.RATE_LIMIT;
    return env ?? null;
  } catch {
    return null;
  }
}
