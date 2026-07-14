/**
 * Re-exports distributed rate limiting from content-engine.
 * Redis-backed when REDIS_URL is set; in-memory sliding window otherwise.
 */
export {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
  getClientIp,
  type RateLimitResult,
} from "@workspace/content-engine/core/rate-limit";
