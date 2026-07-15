import { formatAnalyticsDate } from "./analyticsDateRange";

export type GscSearchAnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscSearchAnalyticsResponse = {
  rows?: GscSearchAnalyticsRow[];
  responseAggregationType?: string;
};

export type FetchSearchAnalyticsParams = {
  siteUrl: string;
  accessToken: string;
  startDate: string;
  endDate: string;
  dimensions?: Array<"query" | "page" | "date">;
  rowLimit?: number;
  startRow?: number;
};

function encodeSiteUrl(siteUrl: string): string {
  return encodeURIComponent(siteUrl);
}

export async function fetchSearchAnalytics(
  params: FetchSearchAnalyticsParams,
): Promise<GscSearchAnalyticsResponse> {
  const {
    siteUrl,
    accessToken,
    startDate,
    endDate,
    dimensions = ["query", "page"],
    rowLimit = 25000,
    startRow = 0,
  } = params;

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeSiteUrl(siteUrl)}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      rowLimit,
      startRow,
      dataState: "final",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC Search Analytics failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return (await res.json()) as GscSearchAnalyticsResponse;
}

export async function fetchAllSearchAnalytics(
  params: Omit<FetchSearchAnalyticsParams, "startRow">,
  maxRows = 100_000,
): Promise<GscSearchAnalyticsRow[]> {
  const all: GscSearchAnalyticsRow[] = [];
  const rowLimit = params.rowLimit ?? 25000;

  for (let startRow = 0; startRow < maxRows; startRow += rowLimit) {
    const response = await fetchSearchAnalytics({ ...params, startRow, rowLimit });
    const rows = response.rows ?? [];
    all.push(...rows);
    if (rows.length < rowLimit) break;
  }

  return all;
}

export { defaultSyncDateRange } from "./analyticsDateRange";
export const formatGscDate = formatAnalyticsDate;

export function priorPeriodRange(
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } {
  const end = new Date(endDate);
  const start = new Date(startDate);
  const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const priorEnd = new Date(start);
  priorEnd.setUTCDate(priorEnd.getUTCDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setUTCDate(priorStart.getUTCDate() - (days - 1));
  return {
    startDate: formatGscDate(priorStart),
    endDate: formatGscDate(priorEnd),
  };
}

export function parseAnalyticsRowKeys(
  keys: string[],
  dimensions: Array<"query" | "page" | "date">,
): { query: string; page: string | null; date: string | null } {
  let query = "";
  let page: string | null = null;
  let date: string | null = null;

  dimensions.forEach((dim, i) => {
    const value = keys[i] ?? "";
    if (dim === "query") query = value;
    if (dim === "page") page = value || null;
    if (dim === "date") date = value || null;
  });

  return { query, page, date };
}
