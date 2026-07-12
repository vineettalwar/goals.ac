const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface IdempotencyEntry {
  response: unknown;
  statusCode: number;
  createdAt: number;
}

const store = new Map<string, IdempotencyEntry>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > TTL_MS) {
      store.delete(key);
    }
  }
}

// Run cleanup every hour
setInterval(cleanup, 60 * 60 * 1000).unref();

export function getCachedResponse(key: string): { response: unknown; statusCode: number } | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  return { response: entry.response, statusCode: entry.statusCode };
}

export function setCachedResponse(key: string, response: unknown, statusCode: number): void {
  store.set(key, { response, statusCode, createdAt: Date.now() });
}

export function hasPendingRequest(key: string): boolean {
  return store.has(key);
}
