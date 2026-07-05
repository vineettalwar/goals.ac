/**
 * Small dependency-free in-memory sliding-window rate limiter.
 *
 * Not distributed-safe (per-process only) — fine for a single-instance deploy
 * and for slowing down obvious abuse. Swap for a Redis-backed limiter if the
 * app scales to multiple instances.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodically drop empty/stale buckets so the map doesn't grow unbounded.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.length === 0 || now - (bucket.timestamps[bucket.timestamps.length - 1] ?? 0) > SWEEP_INTERVAL_MS) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
}

/**
 * Checks (and records, if allowed) a request against a sliding window of
 * `limit` requests per `windowMs` milliseconds, scoped to `key`.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  const windowStart = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds, limit };
  }

  bucket.timestamps.push(now);
  return { allowed: true, remaining: limit - bucket.timestamps.length, retryAfterSeconds: 0, limit };
}

/** Convenience wrapper returning a ready-to-send 429 JSON response, or null if the request is allowed. */
export function rateLimitResponse(
  key: string,
  limit: number,
  windowMs: number
): Response | null {
  const result = checkRateLimit(key, limit, windowMs);
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
    }
  );
}

// Common presets used across routes.
export const RATE_LIMITS = {
  AI_GENERATION_PER_USER: { limit: 10, windowMs: 60_000 },
  AUTH_PER_IP: { limit: 20, windowMs: 60_000 },
} as const;

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
