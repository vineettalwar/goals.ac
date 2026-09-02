import crypto from "node:crypto";

/**
 * Invite tokens are single-use secrets that travel by email. The plaintext is shown
 * exactly once (in the invite URL) and is never persisted; only its SHA-256 digest is
 * stored, so a database read cannot be replayed into an account takeover.
 */

/** 32 bytes of CSPRNG entropy, base64url encoded — URL safe, no padding. */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Digest used as the lookup key. Stable, so it can be indexed and compared directly. */
export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Constant-time comparison of two digests. Lookups go through the unique index on
 * `token_hash`, but any place that compares digests in application code should use
 * this rather than `===` so it cannot leak position information by timing.
 */
export function inviteTokenHashEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** Rejects malformed input before it ever reaches a query. */
export function isWellFormedInviteToken(token: unknown): token is string {
  return typeof token === "string" && token.length >= 32 && token.length <= 128 && /^[A-Za-z0-9_-]+$/.test(token);
}
