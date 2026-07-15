/** Shared YYYY-MM-DD date helpers for GA4 / GSC sync windows. */

export function formatAnalyticsDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Default lookback ending ~3 days ago (API latency) for analytics sync. */
export function defaultSyncDateRange(days = 28): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    startDate: formatAnalyticsDate(start),
    endDate: formatAnalyticsDate(end),
  };
}
