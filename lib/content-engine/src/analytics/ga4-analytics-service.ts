import { and, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  analyticsPropertyConnectionsTable,
  ga4PageMetricsTable,
} from "@workspace/db/schema";
import {
  defaultSyncDateRange,
  fetchAllGa4PageMetrics,
} from "@workspace/seo-tools/ga4Analytics";
import {
  encryptStoredTokens,
  parseStoredTokens,
  resolveAccessToken,
} from "../support/integrations/gsc-connection";
import { normalizePagePath } from "../core/utils";
import { logger } from "../core/logger";

export { normalizePagePath } from "../core/utils";

export type Ga4SyncResult = {
  rowsUpserted: number;
  dateRange: { startDate: string; endDate: string };
};

export type Ga4SyncStatus = {
  connected: boolean;
  propertyVerified: boolean;
  propertyId: string | null;
  propertyName: string | null;
  lastSyncedAt: string | null;
  pageCount: number;
};

const UNSELECTED_PROPERTY_ID = "";

async function upsertGa4Row(params: {
  projectId: number;
  connectionId: number;
  pagePath: string;
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  engagementRate: number;
  avgSessionDuration: number;
  bounceRate: number;
}): Promise<void> {
  await db
    .insert(ga4PageMetricsTable)
    .values({
      projectId: params.projectId,
      connectionId: params.connectionId,
      pagePath: params.pagePath,
      date: params.date,
      sessions: params.sessions,
      users: params.users,
      pageviews: params.pageviews,
      engagementRate: params.engagementRate,
      avgSessionDuration: params.avgSessionDuration,
      bounceRate: params.bounceRate,
    })
    .onConflictDoUpdate({
      target: [
        ga4PageMetricsTable.projectId,
        ga4PageMetricsTable.pagePath,
        ga4PageMetricsTable.date,
      ],
      set: {
        sessions: params.sessions,
        users: params.users,
        pageviews: params.pageviews,
        engagementRate: params.engagementRate,
        avgSessionDuration: params.avgSessionDuration,
        bounceRate: params.bounceRate,
        ingestedAt: new Date(),
      },
    });
}

export async function syncGa4PageMetrics(projectId: number, days = 28): Promise<Ga4SyncResult> {
  const [connection] = await db
    .select()
    .from(analyticsPropertyConnectionsTable)
    .where(
      and(
        eq(analyticsPropertyConnectionsTable.projectId, projectId),
        eq(analyticsPropertyConnectionsTable.provider, "google_analytics_4"),
      ),
    )
    .limit(1);

  if (
    !connection?.propertyId ||
    connection.propertyId === UNSELECTED_PROPERTY_ID ||
    !connection.propertyVerified
  ) {
    throw new Error("Connect and verify Google Analytics 4 for this project first");
  }

  let tokens = parseStoredTokens(connection.encryptedTokens);
  const resolved = await resolveAccessToken("google_analytics_4", tokens);
  tokens = resolved.tokens;

  if (resolved.refreshed) {
    await db
      .update(analyticsPropertyConnectionsTable)
      .set({ encryptedTokens: encryptStoredTokens(tokens) })
      .where(eq(analyticsPropertyConnectionsTable.id, connection.id));
  }

  const dateRange = defaultSyncDateRange(days);
  const rows = await fetchAllGa4PageMetrics({
    propertyId: connection.propertyId,
    accessToken: resolved.accessToken,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  let rowsUpserted = 0;
  for (const row of rows) {
    await upsertGa4Row({
      projectId,
      connectionId: connection.id,
      pagePath: normalizePagePath(row.pagePath),
      date: row.date,
      sessions: row.sessions,
      users: row.users,
      pageviews: row.pageviews,
      engagementRate: row.engagementRate,
      avgSessionDuration: row.avgSessionDuration,
      bounceRate: row.bounceRate,
    });
    rowsUpserted += 1;
  }

  logger.info({ projectId, rowsUpserted, dateRange }, "GA4 page metrics synced");
  return { rowsUpserted, dateRange };
}

export async function getGa4SyncStatus(projectId: number): Promise<Ga4SyncStatus> {
  const [connection] = await db
    .select({
      propertyId: analyticsPropertyConnectionsTable.propertyId,
      propertyName: analyticsPropertyConnectionsTable.propertyName,
      propertyVerified: analyticsPropertyConnectionsTable.propertyVerified,
    })
    .from(analyticsPropertyConnectionsTable)
    .where(
      and(
        eq(analyticsPropertyConnectionsTable.projectId, projectId),
        eq(analyticsPropertyConnectionsTable.provider, "google_analytics_4"),
      ),
    )
    .limit(1);

  const [stats] = await db
    .select({
      lastSyncedAt: sql<string | null>`max(${ga4PageMetricsTable.ingestedAt})`,
      pageCount: sql<number>`count(distinct ${ga4PageMetricsTable.pagePath})::int`,
    })
    .from(ga4PageMetricsTable)
    .where(eq(ga4PageMetricsTable.projectId, projectId));

  const propertyId =
    connection?.propertyId && connection.propertyId !== UNSELECTED_PROPERTY_ID
      ? connection.propertyId
      : null;

  return {
    connected: Boolean(connection),
    propertyVerified: connection?.propertyVerified ?? false,
    propertyId,
    propertyName: connection?.propertyName ?? null,
    lastSyncedAt: stats?.lastSyncedAt ?? null,
    pageCount: stats?.pageCount ?? 0,
  };
}

export async function sweepGa4SyncProjects(): Promise<void> {
  const connections = await db
    .select({ projectId: analyticsPropertyConnectionsTable.projectId })
    .from(analyticsPropertyConnectionsTable)
    .where(
      and(
        eq(analyticsPropertyConnectionsTable.provider, "google_analytics_4"),
        eq(analyticsPropertyConnectionsTable.propertyVerified, true),
      ),
    );

  for (const { projectId } of connections) {
    try {
      await syncGa4PageMetrics(projectId);
    } catch (err) {
      logger.warn({ err, projectId }, "GA4 sync failed for project");
    }
  }
}
