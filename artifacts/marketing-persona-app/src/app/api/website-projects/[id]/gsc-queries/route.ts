import { NextResponse } from "next/server";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { gscSearchQueriesTable } from "@workspace/db/schema";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/project-access";
import { defaultSyncDateRange } from "@workspace/seo-tools/gscSearchAnalytics";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const defaultRange = defaultSyncDateRange(28);
  const startDate = url.searchParams.get("startDate") ?? defaultRange.startDate;
  const endDate = url.searchParams.get("endDate") ?? defaultRange.endDate;
  const minImpressions = Number(url.searchParams.get("minImpressions") ?? "0");
  const minPosition = Number(url.searchParams.get("minPosition") ?? "0");
  const maxPosition = Number(url.searchParams.get("maxPosition") ?? "100");
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? "50"));
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const rows = await db
    .select({
      query: gscSearchQueriesTable.query,
      impressions: sql<number>`sum(${gscSearchQueriesTable.impressions})::int`,
      clicks: sql<number>`sum(${gscSearchQueriesTable.clicks})::int`,
      ctr: sql<number>`case when sum(${gscSearchQueriesTable.impressions}) > 0 then sum(${gscSearchQueriesTable.clicks})::float / sum(${gscSearchQueriesTable.impressions}) else 0 end`,
      position: sql<number>`case when sum(${gscSearchQueriesTable.impressions}) > 0 then sum(${gscSearchQueriesTable.position} * ${gscSearchQueriesTable.impressions}) / sum(${gscSearchQueriesTable.impressions}) else 0 end`,
    })
    .from(gscSearchQueriesTable)
    .where(
      and(
        eq(gscSearchQueriesTable.projectId, projectId),
        gte(gscSearchQueriesTable.date, startDate),
        lte(gscSearchQueriesTable.date, endDate),
      ),
    )
    .groupBy(gscSearchQueriesTable.query)
    .having(
      and(
        sql`sum(${gscSearchQueriesTable.impressions}) >= ${minImpressions}`,
        sql`case when sum(${gscSearchQueriesTable.impressions}) > 0 then sum(${gscSearchQueriesTable.position} * ${gscSearchQueriesTable.impressions}) / sum(${gscSearchQueriesTable.impressions}) else 0 end >= ${minPosition}`,
        sql`case when sum(${gscSearchQueriesTable.impressions}) > 0 then sum(${gscSearchQueriesTable.position} * ${gscSearchQueriesTable.impressions}) / sum(${gscSearchQueriesTable.impressions}) else 0 end <= ${maxPosition}`,
      ),
    )
    .orderBy(desc(sql`sum(${gscSearchQueriesTable.impressions})`))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    queries: rows,
    dateRange: { startDate, endDate },
    pagination: { limit, offset },
  });
}
