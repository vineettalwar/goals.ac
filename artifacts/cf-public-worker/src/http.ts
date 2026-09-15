import { getDb } from "@workspace/db";
import type { GoalsD1Database } from "@workspace/db/d1";
import { kvGetJson, kvPutJson } from "@workspace/cf-edge/kv-cache";
import type { Env } from "./env";

/** D1-only worker — `getDb()` is always SQLite after `setD1Binding()`. */
export function db(): GoalsD1Database {
  return getDb() as GoalsD1Database;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function rateLimitKv(
  env: Env,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const kv = env.RATE_LIMIT;
  if (!kv) return false;
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const rk = `rl:${key}:${bucket}`;
  const raw = await kv.get(rk, "text");
  const count = raw ? Number.parseInt(raw, 10) : 0;
  if (count >= limit) return true;
  await kv.put(rk, String(count + 1), { expirationTtl: windowSec + 5 });
  return false;
}

export async function cachedReference<T>(
  env: Env,
  key: string,
  loader: () => Promise<T>,
  ttl = 86_400,
): Promise<T> {
  const hit = await kvGetJson<T>(env.AI_CACHE, key);
  if (hit) return hit;
  const data = await loader();
  await kvPutJson(env.AI_CACHE, key, data, ttl);
  return data;
}
