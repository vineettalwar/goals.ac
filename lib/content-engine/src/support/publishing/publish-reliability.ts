import { db } from "@workspace/db";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  contentPiecesTable,
  organizationsTable,
  publishRecordsTable,
  websiteProjectsTable,
} from "@workspace/db/schema";

export type FailedPublishRecord = {
  publishRecordId: number;
  createdAt: Date;
  organizationId: number;
  organizationName: string | null;
  websiteProjectId: number;
  websiteProjectName: string;
  contentPieceId: number;
  pieceTitle: string | null;
  provider: string;
  status: string;
  errorMessage: string | null;
  outputMode: string | null;
};

export type BackgroundJobFailuresSummary = {
  total: number;
  byQueue: Array<{ queue: string; count: number }>;
};

export type PublishReliabilityWindowResult = {
  windowHours: number;
  pilotOrganizationIds: number[];
  pilotOrganizationIdsConfigured: boolean;
  failedPublishRecordsCount: number;
  failedPublishRecords: FailedPublishRecord[];
  backgroundJobFailures24h: BackgroundJobFailuresSummary | null;
};

const DEFAULT_WINDOW_HOURS = 24;

export function parseIntIdList(raw: string | null | undefined): number[] {
  const cleaned = (raw ?? "").trim();
  if (!cleaned) return [];
  return cleaned
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function parsePilotOrganizationIds(envValue?: string): number[] {
  return parseIntIdList(envValue ?? process.env.PILOT_ORGANIZATION_IDS);
}

export async function getPublishReliabilityWindow(opts?: {
  windowHours?: number;
  failedRecordsLimit?: number;
  includeBackgroundJobFailures?: boolean;
}): Promise<PublishReliabilityWindowResult> {
  const windowHours = opts?.windowHours ?? DEFAULT_WINDOW_HOURS;
  const failedRecordsLimit = opts?.failedRecordsLimit ?? 50;
  const includeBackgroundJobFailures = opts?.includeBackgroundJobFailures ?? false;

  const pilotOrganizationIds = parsePilotOrganizationIds();
  const pilotOrganizationIdsConfigured = pilotOrganizationIds.length > 0;

  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const pilotFilter =
    pilotOrganizationIdsConfigured && pilotOrganizationIds.length > 0
      ? inArray(websiteProjectsTable.organizationId, pilotOrganizationIds)
      : undefined;

  const commonWhere = and(
    eq(publishRecordsTable.status, "failed"),
    gte(publishRecordsTable.createdAt, windowStart),
  );

  const where = pilotFilter ? and(commonWhere, pilotFilter) : commonWhere;

  const [{ count: failedPublishRecordsCountRaw }] = await db
    .select({ count: count() })
    .from(publishRecordsTable)
    .innerJoin(
      websiteProjectsTable,
      eq(publishRecordsTable.websiteProjectId, websiteProjectsTable.id),
    )
    .innerJoin(organizationsTable, eq(websiteProjectsTable.organizationId, organizationsTable.id))
    .where(where);

  const failedPublishRecords: FailedPublishRecord[] =
    failedRecordsLimit > 0
      ? await db
          .select({
            publishRecordId: publishRecordsTable.id,
            createdAt: publishRecordsTable.createdAt,
            organizationId: organizationsTable.id,
            organizationName: organizationsTable.name,
            websiteProjectId: websiteProjectsTable.id,
            websiteProjectName: websiteProjectsTable.name,
            contentPieceId: publishRecordsTable.contentPieceId,
            pieceTitle: contentPiecesTable.title,
            provider: publishRecordsTable.provider,
            status: publishRecordsTable.status,
            errorMessage: publishRecordsTable.errorMessage,
            outputMode: publishRecordsTable.outputMode,
          })
          .from(publishRecordsTable)
          .innerJoin(
            websiteProjectsTable,
            eq(publishRecordsTable.websiteProjectId, websiteProjectsTable.id),
          )
          .innerJoin(organizationsTable, eq(websiteProjectsTable.organizationId, organizationsTable.id))
          .leftJoin(contentPiecesTable, eq(publishRecordsTable.contentPieceId, contentPiecesTable.id))
          .where(where)
          .orderBy(desc(publishRecordsTable.createdAt))
          .limit(failedRecordsLimit)
      : [];

  const backgroundJobFailures24h = includeBackgroundJobFailures
    ? await (async (): Promise<BackgroundJobFailuresSummary | null> => {
        try {
          const result = await db.execute(
            sql`
              SELECT
                name AS "queue",
                count(*)::int AS "count"
              FROM pgboss.job
              WHERE state = 'failed'
                AND created_on > ${windowStart}
              GROUP BY name
              ORDER BY "count" DESC
              LIMIT 10
            `,
          );

          const rows = (result.rows ?? result) as Array<{ queue: string; count: number | string }>;
          const byQueue = rows.map((r) => ({
            queue: r.queue,
            count: Number(r.count),
          }));
          const total = byQueue.reduce((sum, r) => sum + r.count, 0);

          return { total, byQueue };
        } catch {
          return null;
        }
      })()
    : null;

  return {
    windowHours,
    pilotOrganizationIds,
    pilotOrganizationIdsConfigured,
    failedPublishRecordsCount: Number(failedPublishRecordsCountRaw ?? 0),
    failedPublishRecords: failedPublishRecords.map((r) => ({
      ...r,
      organizationName: r.organizationName ?? null,
      pieceTitle: r.pieceTitle ?? null,
      errorMessage: r.errorMessage ?? null,
      outputMode: r.outputMode ?? null,
    })),
    backgroundJobFailures24h,
  };
}
