import { db } from "@workspace/db";
import {
  contentItemsTable,
  contentPiecesTable,
  contentStrategiesTable,
  organizationsTable,
  roadmapsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot-scheduler";

export type AdminStrategyItemCounts = {
  total: number;
  draft: number;
  prepared: number;
  published: number;
};

export type AdminContentStrategyListRow = {
  id: number;
  roadmapId: number;
  websiteProjectId: number | null;
  industry: string;
  location: string;
  stage: string;
  month: number;
  year: number;
  createdAt: string;
  roadmapSlug: string | null;
  projectName: string | null;
  projectUrl: string | null;
  organizationId: number | null;
  organizationName: string | null;
  organizationPlan: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  itemCounts: AdminStrategyItemCounts;
};

export type AdminContentStrategyDetail = AdminContentStrategyListRow & {
  autopilotEnabled: boolean;
  autopilotPublishMode: string | null;
  items: Array<{
    id: number;
    day: number;
    format: string;
    title: string;
    topicAngle: string;
    primaryKeyword: string;
    status: string;
    contentPiece: { id: number; title: string; status: string } | null;
  }>;
};

function emptyCounts(): AdminStrategyItemCounts {
  return { total: 0, draft: 0, prepared: 0, published: 0 };
}

function buildCounts(
  rows: Array<{ strategyId: number; status: string; count: number }>,
): Map<number, AdminStrategyItemCounts> {
  const map = new Map<number, AdminStrategyItemCounts>();

  for (const row of rows) {
    const current = map.get(row.strategyId) ?? emptyCounts();
    const n = Number(row.count);
    current.total += n;
    if (row.status === "draft") current.draft = n;
    else if (row.status === "prepared") current.prepared = n;
    else if (row.status === "published") current.published = n;
    map.set(row.strategyId, current);
  }

  return map;
}

type ListFilters = {
  search?: string;
  organizationId?: number;
  unlinkedOnly?: boolean;
  strategyId?: number;
};

export async function listAdminContentStrategies(
  filters: ListFilters = {},
): Promise<AdminContentStrategyListRow[]> {
  const conditions = [];

  if (filters.strategyId) {
    conditions.push(eq(contentStrategiesTable.id, filters.strategyId));
  }

  if (filters.organizationId) {
    conditions.push(eq(websiteProjectsTable.organizationId, filters.organizationId));
  }

  if (filters.unlinkedOnly) {
    conditions.push(sql`${contentStrategiesTable.websiteProjectId} IS NULL`);
  }

  const search = filters.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(organizationsTable.name, pattern),
        ilike(websiteProjectsTable.name, pattern),
        ilike(websiteProjectsTable.url, pattern),
        ilike(usersTable.email, pattern),
        ilike(usersTable.name, pattern),
        ilike(contentStrategiesTable.industry, pattern),
        ilike(contentStrategiesTable.location, pattern),
        ilike(roadmapsTable.slug, pattern),
        sql`cast(${contentStrategiesTable.id} as text) = ${search}`,
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: contentStrategiesTable.id,
      roadmapId: contentStrategiesTable.roadmapId,
      websiteProjectId: contentStrategiesTable.websiteProjectId,
      industry: contentStrategiesTable.industry,
      location: contentStrategiesTable.location,
      stage: contentStrategiesTable.stage,
      month: contentStrategiesTable.month,
      year: contentStrategiesTable.year,
      createdAt: contentStrategiesTable.createdAt,
      roadmapSlug: roadmapsTable.slug,
      projectName: websiteProjectsTable.name,
      projectUrl: websiteProjectsTable.url,
      organizationId: organizationsTable.id,
      organizationName: organizationsTable.name,
      organizationPlan: organizationsTable.plan,
      ownerEmail: usersTable.email,
      ownerName: usersTable.name,
    })
    .from(contentStrategiesTable)
    .leftJoin(roadmapsTable, eq(roadmapsTable.id, contentStrategiesTable.roadmapId))
    .leftJoin(websiteProjectsTable, eq(websiteProjectsTable.id, contentStrategiesTable.websiteProjectId))
    .leftJoin(organizationsTable, eq(organizationsTable.id, websiteProjectsTable.organizationId))
    .leftJoin(usersTable, eq(usersTable.id, organizationsTable.ownerId))
    .where(whereClause)
    .orderBy(desc(contentStrategiesTable.createdAt));

  const strategyIds = rows.map((r) => r.id);
  const countMap = new Map<number, AdminStrategyItemCounts>();

  if (strategyIds.length > 0) {
    const countRows = await db
      .select({
        strategyId: contentItemsTable.strategyId,
        status: contentItemsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(contentItemsTable)
      .where(inArray(contentItemsTable.strategyId, strategyIds))
      .groupBy(contentItemsTable.strategyId, contentItemsTable.status);

    const built = buildCounts(
      countRows.map((r) => ({
        strategyId: r.strategyId,
        status: r.status,
        count: Number(r.count),
      })),
    );
    for (const [id, counts] of built) {
      countMap.set(id, counts);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    roadmapId: row.roadmapId,
    websiteProjectId: row.websiteProjectId,
    industry: row.industry,
    location: row.location,
    stage: row.stage,
    month: row.month,
    year: row.year,
    createdAt: row.createdAt.toISOString(),
    roadmapSlug: row.roadmapSlug,
    projectName: row.projectName,
    projectUrl: row.projectUrl,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    organizationPlan: row.organizationPlan,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    itemCounts: countMap.get(row.id) ?? emptyCounts(),
  }));
}

export async function getAdminContentStrategyDetail(
  strategyId: number,
): Promise<AdminContentStrategyDetail | null> {
  const [summary] = await listAdminContentStrategies({ strategyId });
  if (!summary) return null;
  return buildAdminContentStrategyDetail(summary, strategyId);
}

async function buildAdminContentStrategyDetail(
  summary: AdminContentStrategyListRow,
  strategyId: number,
): Promise<AdminContentStrategyDetail> {

  const [projectRow] = summary.websiteProjectId
    ? await db
        .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, summary.websiteProjectId))
        .limit(1)
    : [null];

  const items = await db
    .select()
    .from(contentItemsTable)
    .where(eq(contentItemsTable.strategyId, strategyId))
    .orderBy(contentItemsTable.day);

  const itemIds = items.map((i) => i.id);
  const pieceMap = new Map<number, { id: number; title: string; status: string }>();

  if (itemIds.length > 0) {
    const pieces = await db
      .select({
        contentItemId: contentPiecesTable.contentItemId,
        id: contentPiecesTable.id,
        title: contentPiecesTable.title,
        status: contentPiecesTable.status,
      })
      .from(contentPiecesTable)
      .where(inArray(contentPiecesTable.contentItemId, itemIds));

    for (const piece of pieces) {
      if (piece.contentItemId != null) {
        pieceMap.set(piece.contentItemId, {
          id: piece.id,
          title: piece.title,
          status: piece.status,
        });
      }
    }
  }

  const autopilot = parseAutopilotSettings(projectRow?.autopilotSettings);

  return {
    ...summary,
    autopilotEnabled: autopilot.enabled,
    autopilotPublishMode: autopilot.enabled ? autopilot.publishMode : null,
    items: items.map((item) => ({
      id: item.id,
      day: item.day,
      format: item.format,
      title: item.title,
      topicAngle: item.topicAngle,
      primaryKeyword: item.primaryKeyword,
      status: item.status,
      contentPiece: pieceMap.get(item.id) ?? null,
    })),
  };
}
