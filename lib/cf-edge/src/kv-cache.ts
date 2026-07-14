import type { KvNamespaceBinding } from "./bindings";

export async function kvGetJson<T>(
  kv: KvNamespaceBinding | undefined,
  key: string,
): Promise<T | null> {
  if (!kv) return null;
  const raw = await kv.get(key, "text");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvPutJson(
  kv: KvNamespaceBinding | undefined,
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  if (!kv) return;
  await kv.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
}
