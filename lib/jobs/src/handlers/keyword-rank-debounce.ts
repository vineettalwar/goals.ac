const DEFAULT_WINDOW_MS = 45 * 60 * 1000; // 45 minutes

/**
 * Returns true when a rank check should be skipped because one ran recently.
 * Pure helper — no I/O, easy to test.
 */
export function shouldSkipRankCheck(
  lastCheckedAt: Date | string | null | undefined,
  now = new Date(),
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  if (!lastCheckedAt) return false;
  const last = lastCheckedAt instanceof Date ? lastCheckedAt : new Date(lastCheckedAt);
  return now.getTime() - last.getTime() < windowMs;
}
