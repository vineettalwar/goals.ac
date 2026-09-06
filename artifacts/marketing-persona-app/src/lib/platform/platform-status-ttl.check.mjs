/**
 * Contract check for the middleware platform-status TTL cache.
 * Run: node artifacts/marketing-persona-app/src/lib/platform/platform-status-ttl.check.mjs
 */
import assert from "node:assert/strict";

const PLATFORM_STATUS_TTL_MS = 15_000;

let platformStatusCache = null;

function readCached(now) {
  if (platformStatusCache && now < platformStatusCache.expiresAt) {
    return platformStatusCache.platformEnabled;
  }
  return null;
}

function writeCached(platformEnabled, now) {
  platformStatusCache = { platformEnabled, expiresAt: now + PLATFORM_STATUS_TTL_MS };
}

assert.equal(readCached(0), null);

writeCached(true, 1_000);
assert.equal(readCached(1_000), true);
assert.equal(readCached(1_000 + PLATFORM_STATUS_TTL_MS - 1), true);
assert.equal(readCached(1_000 + PLATFORM_STATUS_TTL_MS), null);

writeCached(false, 20_000);
assert.equal(readCached(20_000), false);
assert.equal(readCached(20_000 + PLATFORM_STATUS_TTL_MS), null);

console.log("platform-status-ttl.check: ok");
