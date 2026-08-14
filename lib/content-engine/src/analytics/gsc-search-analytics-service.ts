import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, countDistinctAsInt } from "@workspace/db";
import {
  gscSearchQueriesTable,
  searchPropertyConnectionsTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import {
  fetchAllSearchAnalytics,
  defaultSyncDateRange,
  parseAnalyticsRowKeys,
  formatGscDate,
} from "@workspace/seo-tools/gscSearchAnalytics";
import {
  encryptStoredTokens,
  parseStoredTokens,
  resolveAccessToken,
} from "../support/integrations/gsc-connection";
import { recordSyncFailure, recordSyncSuccess } from "../support/integrations/connection-sync-status";
import { logger } from "../core/logger";

export type GscSyncResult = {
  rowsUpserted: number;
  dateRange: { startDate: string; endDate: string };
};

async function upsertGscRow(params: {
  projectId: number;
  connectionId: number;
  query: string;
  page: string | null;
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}): Promise<boolean> {
  await db
    .insert(gscSearchQueriesTable)
    .values({
      projectId: params.projectId,
      connectionId: params.connectionId,
      query: params.query,
      page: params.page,
      date: params.date,
      impressions: params.impressions,
      clicks: params.clicks,
      ctr: params.ctr,
      position: params.position,
    })
    .onConflictDoUpdate({
      target: [
        gscSearchQueriesTable.projectId,
        gscSearchQueriesTable.query,
        gscSearchQueriesTable.page,
        gscSearchQueriesTable.date,
      ],
      set: {
        impressions: params.impressions,
        clicks: params.clicks,
        ctr: params.ctr,
        position: params.position,
        ingestedAt: new Date(),
      },
    });
  return true;
}

export async function syncGscSearchAnalytics(
  projectId: number,
  days = 28,
): Promise<GscSyncResult> {
  const [connection] = await db
    .select()
    .from(searchPropertyConnectionsTable)
    .where(
      and(
        eq(searchPropertyConnectionsTable.projectId, projectId),
        eq(searchPropertyConnectionsTable.provider, "google_search_console"),
      ),
    )
    .limit(1);

  if (!connection?.propertyUrl || !connection.propertyVerified) {
    throw new Error("Connect and verify Google Search Console for this project first");
  }

  let tokens = parseStoredTokens(connection.encryptedTokens);
  const resolved = await resolveAccessToken("google_search_console", tokens);
  tokens = resolved.tokens;

  if (resolved.refreshed) {
    await db
      .update(searchPropertyConnectionsTable)
      .set({ encryptedTokens: encryptStoredTokens(tokens) })
      .where(eq(searchPropertyConnectionsTable.id, connection.id));
  }

  const dateRange = defaultSyncDateRange(days);
  const dimensions: Array<"query" | "page" | "date"> = ["date", "query", "page"];

  let rows: Awaited<ReturnType<typeof fetchAllSearchAnalytics>>;
  try {
    rows = await fetchAllSearchAnalytics({
      siteUrl: connection.propertyUrl,
      accessToken: resolved.accessToken,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dimensions,
    });
  } catch (err) {
    // Recorded so a founder relying on this data can see the pipe is dry,
    // rather than a stale "connected and verified" badge that never changes.
    await recordSyncFailure("search", connection.id, err);
    throw err;
  }

  let rowsUpserted = 0;
  for (const row of rows) {
    const parsed = parseAnalyticsRowKeys(row.keys, dimensions);
    if (!parsed.query || !parsed.date) continue;

    await upsertGscRow({
      projectId,
      connectionId: connection.id,
      query: parsed.query,
      page: parsed.page,
      date: parsed.date,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      position: row.position,
    });
    rowsUpserted += 1;
  }

  await recordSyncSuccess("search", connection.id);
  logger.info({ projectId, rowsUpserted, dateRange }, "GSC search analytics synced");

  const { maybeRefreshBrandAfterGscSync } = await import("../support/brand/brand-scrape-orchestrator");
  await maybeRefreshBrandAfterGscSync(projectId);

  return { rowsUpserted, dateRange };
}

export async function getGscQueryRowsForProject(
  projectId: number,
  startDate: string,
  endDate: string,
): Promise<
  Array<{
    query: string;
    page: string | null;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>
> {
  const rows = await db
    .select({
      query: gscSearchQueriesTable.query,
      page: gscSearchQueriesTable.page,
      impressions: gscSearchQueriesTable.impressions,
      clicks: gscSearchQueriesTable.clicks,
      ctr: gscSearchQueriesTable.ctr,
      position: gscSearchQueriesTable.position,
    })
    .from(gscSearchQueriesTable)
    .where(
      and(
        eq(gscSearchQueriesTable.projectId, projectId),
        gte(gscSearchQueriesTable.date, startDate),
        lte(gscSearchQueriesTable.date, endDate),
      ),
    );

  return rows;
}

export async function getGscSyncStatus(projectId: number): Promise<{
  connected: boolean;
  propertyVerified: boolean;
  lastSyncedAt: string | null;
  queryCount: number;
  /** Outcome of the most recent sync *attempt* — distinct from lastSyncedAt, which reflects the newest data row. Null before the first attempt. */
  lastSyncStatus: "ok" | "auth_error" | "error" | null;
  /** Set when lastSyncStatus is not "ok" — a short, user-facing reason. */
  lastSyncError: string | null;
}> {
  const [connection] = await db
    .select({
      propertyVerified: searchPropertyConnectionsTable.propertyVerified,
      propertyUrl: searchPropertyConnectionsTable.propertyUrl,
      lastSyncStatus: searchPropertyConnectionsTable.lastSyncStatus,
      lastSyncError: searchPropertyConnectionsTable.lastSyncError,
    })
    .from(searchPropertyConnectionsTable)
    .where(
      and(
        eq(searchPropertyConnectionsTable.projectId, projectId),
        eq(searchPropertyConnectionsTable.provider, "google_search_console"),
      ),
    )
    .limit(1);

  const [stats] = await db
    .select({
      lastSyncedAt: sql<string | null>`max(${gscSearchQueriesTable.ingestedAt})`,
      queryCount: countDistinctAsInt(gscSearchQueriesTable.query),
    })
    .from(gscSearchQueriesTable)
    .where(eq(gscSearchQueriesTable.projectId, projectId));

  return {
    connected: Boolean(connection?.propertyUrl),
    propertyVerified: connection?.propertyVerified ?? false,
    lastSyncedAt: stats?.lastSyncedAt ?? null,
    queryCount: stats?.queryCount ?? 0,
    lastSyncStatus: connection?.lastSyncStatus ?? null,
    lastSyncError: connection?.lastSyncError ?? null,
  };
}

export async function sweepGscSyncProjects(): Promise<void> {
  const connections = await db
    .select({ projectId: searchPropertyConnectionsTable.projectId })
    .from(searchPropertyConnectionsTable)
    .where(
      and(
        eq(searchPropertyConnectionsTable.provider, "google_search_console"),
        eq(searchPropertyConnectionsTable.propertyVerified, true),
      ),
    );

  const {
    createClickDeclineRefreshOpportunities,
    discoverOpportunities,
  } = await import("../strategy/keyword-opportunity-service");

  for (const { projectId } of connections) {
    try {
      await syncGscSearchAnalytics(projectId);
      const [project] = await db
        .select({ userId: websiteProjectsTable.userId })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, projectId))
        .limit(1);
      if (project) {
        await discoverOpportunities(projectId, project.userId, { sources: ["gsc"] });
        await createClickDeclineRefreshOpportunities(projectId);
      }
    } catch (err) {
      logger.warn({ err, projectId }, "GSC sync failed for project");
    }
  }
}

export async function assertProjectExists(projectId: number): Promise<void> {
  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");
}
