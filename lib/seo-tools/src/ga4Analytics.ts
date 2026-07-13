export type Ga4DimensionValue = {
  value: string;
};

export type Ga4MetricValue = {
  value: string;
};

export type Ga4ReportRow = {
  dimensionValues: Ga4DimensionValue[];
  metricValues: Ga4MetricValue[];
};

export type Ga4RunReportResponse = {
  dimensionHeaders?: Array<{ name: string }>;
  metricHeaders?: Array<{ name: string; type?: string }>;
  rows?: Ga4ReportRow[];
  rowCount?: number;
  metadata?: {
    currencyCode?: string;
    timeZone?: string;
  };
};

export type Ga4PageMetricsRow = {
  date: string;
  pagePath: string;
  sessions: number;
  users: number;
  pageviews: number;
  engagementRate: number;
  avgSessionDuration: number;
  bounceRate: number;
};

export type FetchGa4PageMetricsParams = {
  propertyId: string;
  accessToken: string;
  startDate: string;
  endDate: string;
  limit?: number;
  offset?: number;
};

const GA4_DIMENSIONS = ["date", "pagePath"] as const;
const GA4_METRICS = [
  "sessions",
  "activeUsers",
  "screenPageViews",
  "engagementRate",
  "averageSessionDuration",
  "bounceRate",
] as const;

function normalizePropertyId(propertyId: string): string {
  return propertyId.startsWith("properties/") ? propertyId : `properties/${propertyId}`;
}

function parseMetricNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatGa4ApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function defaultSyncDateRange(days = 28): { startDate: string; endDate: string } {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    startDate: formatGa4ApiDate(start),
    endDate: formatGa4ApiDate(end),
  };
}

export function formatGa4DateValue(ga4Date: string): string {
  if (/^\d{8}$/.test(ga4Date)) {
    return `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`;
  }
  return ga4Date;
}

export function parseGa4RowKeys(
  dimensionValues: Ga4DimensionValue[],
  dimensions: ReadonlyArray<(typeof GA4_DIMENSIONS)[number]> = GA4_DIMENSIONS,
): { date: string | null; pagePath: string | null } {
  let date: string | null = null;
  let pagePath: string | null = null;

  dimensions.forEach((dim, i) => {
    const value = dimensionValues[i]?.value ?? "";
    if (dim === "date") date = value ? formatGa4DateValue(value) : null;
    if (dim === "pagePath") pagePath = value || null;
  });

  return { date, pagePath };
}

export function parseGa4PageMetricsRow(row: Ga4ReportRow): Ga4PageMetricsRow | null {
  const { date, pagePath } = parseGa4RowKeys(row.dimensionValues);
  if (!date || !pagePath) return null;

  const [sessions, users, pageviews, engagementRate, avgSessionDuration, bounceRate] =
    row.metricValues.map((metric) => parseMetricNumber(metric.value));

  return {
    date,
    pagePath,
    sessions,
    users,
    pageviews,
    engagementRate,
    avgSessionDuration,
    bounceRate,
  };
}

export async function fetchGa4PageMetrics(
  params: FetchGa4PageMetricsParams,
): Promise<Ga4RunReportResponse> {
  const { propertyId, accessToken, startDate, endDate, limit = 10_000, offset = 0 } = params;
  const resourceName = normalizePropertyId(propertyId);
  const url = `https://analyticsdata.googleapis.com/v1beta/${resourceName}:runReport`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: GA4_DIMENSIONS.map((name) => ({ name })),
      metrics: GA4_METRICS.map((name) => ({ name })),
      limit,
      offset,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GA4 runReport failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return (await res.json()) as Ga4RunReportResponse;
}

export async function fetchAllGa4PageMetrics(
  params: Omit<FetchGa4PageMetricsParams, "offset" | "limit">,
  maxRows = 100_000,
): Promise<Ga4PageMetricsRow[]> {
  const all: Ga4PageMetricsRow[] = [];
  const limit = 10_000;

  for (let offset = 0; offset < maxRows; offset += limit) {
    const response = await fetchGa4PageMetrics({ ...params, limit, offset });
    const rows = response.rows ?? [];
    for (const row of rows) {
      const parsed = parseGa4PageMetricsRow(row);
      if (parsed) all.push(parsed);
    }
    if (rows.length < limit) break;
  }

  return all;
}
