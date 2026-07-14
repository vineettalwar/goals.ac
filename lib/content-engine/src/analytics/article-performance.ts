import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  ga4PageMetricsTable,
  gscSearchQueriesTable,
} from "@workspace/db/schema";
import { getGa4SyncStatus } from "./ga4-analytics-service";
import { getGscSyncStatus } from "./gsc-search-analytics-service";
import { normalizePagePath } from "../core/utils";

export type ArticlePerformanceMetrics = {
  sessions: number;
  users: number;
  pageviews: number;
  engagementRate: number;
  avgSessionDuration: number;
  bounceRate: number;
};

export type ArticleGscMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type ArticlePerformanceRow = {
  contentPieceId: number;
  title: string;
  publishedUrl: string | null;
  targetKeyword: string;
  status: string;
  ga4: ArticlePerformanceMetrics;
  gsc: ArticleGscMetrics;
};

export type ArticlePerformanceResult = {
  articles: ArticlePerformanceRow[];
  totals: {
    ga4: ArticlePerformanceMetrics;
    gsc: ArticleGscMetrics;
  };
  connectionStatus: {
    ga4: Awaited<ReturnType<typeof getGa4SyncStatus>>;
    gsc: Awaited<ReturnType<typeof getGscSyncStatus>>;
  };
  dateRange: { startDate: string; endDate: string };
};

const emptyGa4Metrics = (): ArticlePerformanceMetrics => ({
  sessions: 0,
  users: 0,
  pageviews: 0,
  engagementRate: 0,
  avgSessionDuration: 0,
  bounceRate: 0,
});

const emptyGscMetrics = (): ArticleGscMetrics => ({
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 0,
});

function weightedAverage(values: Array<{ weight: number; value: number }>): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  return values.reduce((sum, item) => sum + item.weight * item.value, 0) / totalWeight;
}

export async function getArticlePerformance(
  projectId: number,
  startDate: string,
  endDate: string,
): Promise<ArticlePerformanceResult> {
  const [articles, ga4Rows, gscRows, ga4Status, gscStatus] = await Promise.all([
    db
      .select({
        id: contentPiecesTable.id,
        title: contentPiecesTable.title,
        publishedUrl: contentPiecesTable.publishedUrl,
        targetKeyword: contentPiecesTable.targetKeyword,
        status: contentPiecesTable.status,
      })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, projectId)),
    db
      .select({
        pagePath: ga4PageMetricsTable.pagePath,
        sessions: sql<number>`coalesce(sum(${ga4PageMetricsTable.sessions}), 0)::int`,
        users: sql<number>`coalesce(sum(${ga4PageMetricsTable.users}), 0)::int`,
        pageviews: sql<number>`coalesce(sum(${ga4PageMetricsTable.pageviews}), 0)::int`,
        engagementRate: sql<number>`CASE WHEN sum(${ga4PageMetricsTable.sessions}) > 0 THEN sum(${ga4PageMetricsTable.engagementRate} * ${ga4PageMetricsTable.sessions}) / sum(${ga4PageMetricsTable.sessions}) ELSE 0 END`,
        avgSessionDuration: sql<number>`CASE WHEN sum(${ga4PageMetricsTable.sessions}) > 0 THEN sum(${ga4PageMetricsTable.avgSessionDuration} * ${ga4PageMetricsTable.sessions}) / sum(${ga4PageMetricsTable.sessions}) ELSE 0 END`,
        bounceRate: sql<number>`CASE WHEN sum(${ga4PageMetricsTable.sessions}) > 0 THEN sum(${ga4PageMetricsTable.bounceRate} * ${ga4PageMetricsTable.sessions}) / sum(${ga4PageMetricsTable.sessions}) ELSE 0 END`,
      })
      .from(ga4PageMetricsTable)
      .where(
        and(
          eq(ga4PageMetricsTable.projectId, projectId),
          gte(ga4PageMetricsTable.date, startDate),
          lte(ga4PageMetricsTable.date, endDate),
        ),
      )
      .groupBy(ga4PageMetricsTable.pagePath),
    db
      .select({
        page: gscSearchQueriesTable.page,
        clicks: sql<number>`coalesce(sum(${gscSearchQueriesTable.clicks}), 0)::int`,
        impressions: sql<number>`coalesce(sum(${gscSearchQueriesTable.impressions}), 0)::int`,
        ctr: sql<number>`CASE WHEN sum(${gscSearchQueriesTable.impressions}) > 0 THEN sum(${gscSearchQueriesTable.clicks})::float / sum(${gscSearchQueriesTable.impressions}) ELSE 0 END`,
        position: sql<number>`CASE WHEN sum(${gscSearchQueriesTable.impressions}) > 0 THEN sum(${gscSearchQueriesTable.position} * ${gscSearchQueriesTable.impressions}) / sum(${gscSearchQueriesTable.impressions}) ELSE 0 END`,
      })
      .from(gscSearchQueriesTable)
      .where(
        and(
          eq(gscSearchQueriesTable.projectId, projectId),
          gte(gscSearchQueriesTable.date, startDate),
          lte(gscSearchQueriesTable.date, endDate),
        ),
      )
      .groupBy(gscSearchQueriesTable.page),
    getGa4SyncStatus(projectId),
    getGscSyncStatus(projectId),
  ]);

  const ga4ByPath = new Map<string, ArticlePerformanceMetrics>();
  for (const row of ga4Rows) {
    ga4ByPath.set(normalizePagePath(row.pagePath), {
      sessions: row.sessions,
      users: row.users,
      pageviews: row.pageviews,
      engagementRate: row.engagementRate,
      avgSessionDuration: row.avgSessionDuration,
      bounceRate: row.bounceRate,
    });
  }

  const gscByPath = new Map<string, ArticleGscMetrics>();
  for (const row of gscRows) {
    if (!row.page) continue;
    const path = normalizePagePath(row.page);
    const existing = gscByPath.get(path);
    if (existing) {
      const clicks = existing.clicks + row.clicks;
      const impressions = existing.impressions + row.impressions;
      gscByPath.set(path, {
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: weightedAverage([
          { weight: existing.impressions, value: existing.position },
          { weight: row.impressions, value: row.position },
        ]),
      });
      continue;
    }
    gscByPath.set(path, {
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.impressions > 0 ? row.clicks / row.impressions : row.ctr,
      position: row.position,
    });
  }

  const performanceRows: ArticlePerformanceRow[] = articles.map((article) => {
    const path = article.publishedUrl ? normalizePagePath(article.publishedUrl) : null;
    return {
      contentPieceId: article.id,
      title: article.title,
      publishedUrl: article.publishedUrl,
      targetKeyword: article.targetKeyword,
      status: article.status,
      ga4: path ? (ga4ByPath.get(path) ?? emptyGa4Metrics()) : emptyGa4Metrics(),
      gsc: path ? (gscByPath.get(path) ?? emptyGscMetrics()) : emptyGscMetrics(),
    };
  });

  const totalsGa4 = performanceRows.reduce(
    (acc, row) => ({
      sessions: acc.sessions + row.ga4.sessions,
      users: acc.users + row.ga4.users,
      pageviews: acc.pageviews + row.ga4.pageviews,
      engagementRate: acc.engagementRate,
      avgSessionDuration: acc.avgSessionDuration,
      bounceRate: acc.bounceRate,
      _engagementWeights: acc._engagementWeights.concat(
        row.ga4.sessions > 0 ? [{ weight: row.ga4.sessions, value: row.ga4.engagementRate }] : [],
      ),
      _durationWeights: acc._durationWeights.concat(
        row.ga4.sessions > 0 ? [{ weight: row.ga4.sessions, value: row.ga4.avgSessionDuration }] : [],
      ),
      _bounceWeights: acc._bounceWeights.concat(
        row.ga4.sessions > 0 ? [{ weight: row.ga4.sessions, value: row.ga4.bounceRate }] : [],
      ),
    }),
    {
      sessions: 0,
      users: 0,
      pageviews: 0,
      engagementRate: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      _engagementWeights: [] as Array<{ weight: number; value: number }>,
      _durationWeights: [] as Array<{ weight: number; value: number }>,
      _bounceWeights: [] as Array<{ weight: number; value: number }>,
    },
  );

  const totalsGsc = performanceRows.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.gsc.clicks,
      impressions: acc.impressions + row.gsc.impressions,
      ctr: 0,
      position: 0,
      _positionWeights: acc._positionWeights.concat(
        row.gsc.impressions > 0 ? [{ weight: row.gsc.impressions, value: row.gsc.position }] : [],
      ),
    }),
    {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      _positionWeights: [] as Array<{ weight: number; value: number }>,
    },
  );

  return {
    articles: performanceRows,
    totals: {
      ga4: {
        sessions: totalsGa4.sessions,
        users: totalsGa4.users,
        pageviews: totalsGa4.pageviews,
        engagementRate: weightedAverage(totalsGa4._engagementWeights),
        avgSessionDuration: weightedAverage(totalsGa4._durationWeights),
        bounceRate: weightedAverage(totalsGa4._bounceWeights),
      },
      gsc: {
        clicks: totalsGsc.clicks,
        impressions: totalsGsc.impressions,
        ctr: totalsGsc.impressions > 0 ? totalsGsc.clicks / totalsGsc.impressions : 0,
        position: weightedAverage(totalsGsc._positionWeights),
      },
    },
    connectionStatus: {
      ga4: ga4Status,
      gsc: gscStatus,
    },
    dateRange: { startDate, endDate },
  };
}
