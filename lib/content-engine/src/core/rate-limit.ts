import { createClient } from "redis";
import { getRateLimitKv } from "./kv-binding";
import { logger } from "./logger";

type RedisClient = ReturnType<typeof createClient>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
}

interface Bucket {
  timestamps: number[];
}

const memoryBuckets = new Map<string, Bucket>();

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweepMemory(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of memoryBuckets) {
    if (
      bucket.timestamps.length === 0 ||
      now - (bucket.timestamps[bucket.timestamps.length - 1] ?? 0) > SWEEP_INTERVAL_MS
    ) {
      memoryBuckets.delete(key);
    }
  }
}

function checkRateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepMemory(now);

  let bucket = memoryBuckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryBuckets.set(key, bucket);
  }

  const windowStart = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds, limit };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - bucket.timestamps.length,
    retryAfterSeconds: 0,
    limit,
  };
}

let redisClient: RedisClient | null = null;
let redisInit: Promise<RedisClient | null> | null = null;

async function getRedisClient(): Promise<RedisClient | null> {
  if (redisInit) return redisInit;

  redisInit = (async () => {
    const redisUrl = process.env["REDIS_URL"];
    if (!redisUrl) return null;

    try {
      const client = createClient({ url: redisUrl });
      client.on("error", (err: unknown) => logger.warn({ err }, "Redis rate-limit client error"));
      await client.connect();
      logger.info("Rate limits: using Redis (multi-instance safe)");
      redisClient = client;
      return client;
    } catch (err) {
      logger.warn({ err }, "Redis rate-limit connection failed, using in-memory limiter");
      return null;
    }
  })();

  return redisInit;
}

/** Fixed-window counter — atomic across instances when KV or Redis is available. */
async function checkRateLimitKv(
  kv: NonNullable<ReturnType<typeof getRateLimitKv>>,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowId = Math.floor(now / windowMs);
  const kvKey = `rl:${key}:${windowId}`;

  const existing = await kv.get(kvKey, "text");
  const count = (existing ? Number.parseInt(existing, 10) : 0) + 1;
  const expirationTtl = Math.max(1, Math.ceil(windowMs / 1000));
  await kv.put(kvKey, String(count), { expirationTtl });

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
      limit,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: 0,
    limit,
  };
}

/** Fixed-window counter — atomic across instances when Redis is available. */
async function checkRateLimitRedis(
  client: RedisClient,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowId = Math.floor(now / windowMs);
  const redisKey = `rl:${key}:${windowId}`;

  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.pExpire(redisKey, windowMs);
  }

  if (count > limit) {
    const ttlMs = await client.pTTL(redisKey);
    const retryAfterSeconds = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds, limit };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: 0,
    limit,
  };
}

/**
 * Checks (and records, if allowed) a request against a limit/window.
 * Uses Redis when REDIS_URL is set; otherwise per-process in-memory sliding window.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const kv = getRateLimitKv();
  if (kv) {
    try {
      return await checkRateLimitKv(kv, key, limit, windowMs);
    } catch (err) {
      logger.warn({ err, key }, "KV rate-limit check failed, falling back to in-memory");
    }
  }

  const client = await getRedisClient();
  if (client) {
    try {
      return await checkRateLimitRedis(client, key, limit, windowMs);
    } catch (err) {
      logger.warn({ err, key }, "Redis rate-limit check failed, falling back to in-memory");
    }
  }

  return checkRateLimitMemory(key, limit, windowMs);
}

/** Returns a 429 JSON Response, or null if the request is allowed. */
export async function rateLimitResponse(
  key: string,
  limit: number,
  windowMs: number,
): Promise<Response | null> {
  const result = await checkRateLimit(key, limit, windowMs);
  if (result.allowed) return null;

  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Too many requests. Please slow down and try again shortly.",
      retryAfterSeconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}

export const RATE_LIMITS = {
  AI_GENERATION_PER_USER: { limit: 10, windowMs: 60_000 },
  PUBLIC_GEO_AUDIT_PER_IP: { limit: 5, windowMs: 60 * 60_000 },
  AUTH_PER_IP: { limit: 20, windowMs: 60_000 },
  GSC_SYNC_PER_PROJECT: { limit: 3, windowMs: 60 * 60_000 },
  GA4_SYNC_PER_PROJECT: { limit: 3, windowMs: 60 * 60_000 },
  SOCIAL_HISTORY_SYNC_PER_PROJECT: { limit: 5, windowMs: 60 * 60_000 },
  SOCIAL_METRICS_SYNC_PER_PROJECT: { limit: 5, windowMs: 60 * 60_000 },
  SEMRUSH_DISCOVERY_PER_PROJECT: { limit: 5, windowMs: 60 * 60_000 },
  SEMRUSH_CREDENTIAL_TEST_PER_USER: { limit: 10, windowMs: 60_000 },
  CSV_IMPORT_PER_USER: { limit: 10, windowMs: 60_000 },
} as const;

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
