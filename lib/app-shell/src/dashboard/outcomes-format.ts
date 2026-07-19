export type PublishHealthInput = {
  ok: number;
  failed: number;
  lastAt?: string | null;
};

/** Compact publish-health label, e.g. `4 ok · 1 failed` or `No publishes yet`. */
export function formatPublishHealth(health: PublishHealthInput): string {
  if (health.ok === 0 && health.failed === 0) return "No publishes yet";
  if (health.failed === 0) return `${health.ok} ok`;
  if (health.ok === 0) return `${health.failed} failed`;
  return `${health.ok} ok · ${health.failed} failed`;
}

/** GEO score delta vs previous audit; null when trend unavailable. */
export function formatGeoTrend(
  latest: number | null | undefined,
  previous: number | null | undefined,
): string | null {
  if (latest == null || previous == null) return null;
  const delta = latest - previous;
  if (delta === 0) return "flat vs prior";
  return `${delta > 0 ? "+" : ""}${delta} vs prior`;
}

/** Citation-rate delta in percentage points; null when unavailable or flat. */
export function formatCitationDelta(delta: number | null | undefined): string | null {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}pp vs prior`;
}
