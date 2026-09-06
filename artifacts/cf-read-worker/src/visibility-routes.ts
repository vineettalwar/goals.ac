import { db } from "./db";
import {
  geoAuditsTable,
  llmVisibilityPromptsTable,
  llmVisibilitySnapshotsTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { and, desc, eq, gte } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { parseVisibilitySettings } from "@workspace/content-engine/support/settings/visibility-settings";
import { getAccessibleProject, requireProjectAccess } from "./project-access";

function computeVisibilityScore(citedCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((citedCount / totalCount) * 100);
}

function aggregateSnapshotsByDate(
  snapshots: Array<{ checkedAt: Date | string; cited: boolean }>,
): Array<{ date: string; score: number; cited: number; total: number }> {
  const buckets = new Map<string, { cited: number; total: number }>();

  for (const snap of snapshots) {
    const date = new Date(snap.checkedAt).toISOString().slice(0, 10);
    const bucket = buckets.get(date) ?? { cited: 0, total: 0 };
    bucket.total += 1;
    if (snap.cited) bucket.cited += 1;
    buckets.set(date, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { cited, total }]) => ({
      date,
      cited,
      total,
      score: computeVisibilityScore(cited, total),
    }));
}

export type ProjectVisibilitySummary = {
  visibilityScore: number;
  latestGeoScore: number | null;
  visibilityDelta: number | null;
  geoScoreDelta: number | null;
};

function citationRate(snapshots: { cited: boolean }[]): number {
  if (snapshots.length === 0) return 0;
  return computeVisibilityScore(
    snapshots.filter((s) => s.cited).length,
    snapshots.length,
  );
}

export async function loadProjectVisibilitySummary(
  projectId: number,
): Promise<ProjectVisibilitySummary> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 14);

  const priorCutoff = new Date();
  priorCutoff.setDate(priorCutoff.getDate() - 28);

  const [prompts, geoAudits] = await Promise.all([
    db
      .select({ id: llmVisibilityPromptsTable.id })
      .from(llmVisibilityPromptsTable)
      .where(eq(llmVisibilityPromptsTable.websiteProjectId, projectId)),
    db
      .select({
        geoScore: geoAuditsTable.geoScore,
        createdAt: geoAuditsTable.createdAt,
      })
      .from(geoAuditsTable)
      .where(
        and(eq(geoAuditsTable.websiteProjectId, projectId), gte(geoAuditsTable.createdAt, since)),
      )
      .orderBy(desc(geoAuditsTable.createdAt))
      .limit(2),
  ]);

  const snapshotLimit = Math.max(prompts.length * 8, 8);

  const snapshots = await db
    .select({
      cited: llmVisibilitySnapshotsTable.cited,
      checkedAt: llmVisibilitySnapshotsTable.checkedAt,
    })
    .from(llmVisibilitySnapshotsTable)
    .where(
      and(
        eq(llmVisibilitySnapshotsTable.websiteProjectId, projectId),
        gte(llmVisibilitySnapshotsTable.checkedAt, priorCutoff),
      ),
    )
    .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt))
    .limit(snapshotLimit);

  const latestBatch = snapshots.slice(0, Math.max(prompts.length * 4, 4));
  const visibilityScore = citationRate(latestBatch);

  const recentSnaps = snapshots.filter((s) => new Date(s.checkedAt) >= recentCutoff);
  const priorSnaps = snapshots.filter(
    (s) => new Date(s.checkedAt) >= priorCutoff && new Date(s.checkedAt) < recentCutoff,
  );

  let visibilityDelta: number | null = null;
  if (recentSnaps.length > 0 && priorSnaps.length > 0) {
    visibilityDelta = citationRate(recentSnaps) - citationRate(priorSnaps);
  }

  const latestGeoScore = geoAudits[0]?.geoScore ?? null;
  let geoScoreDelta: number | null = null;
  if (geoAudits.length >= 2 && latestGeoScore != null) {
    geoScoreDelta = latestGeoScore - (geoAudits[1]?.geoScore ?? latestGeoScore);
  }

  return {
    visibilityScore,
    latestGeoScore,
    visibilityDelta,
    geoScoreDelta,
  };
}

export async function handleVisibilityRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const visibilityMatch = path.match(/^\/api\/website-projects\/(\d+)\/visibility$/);
  if (!visibilityMatch || request.method !== "GET") return null;

  const projectId = Number.parseInt(visibilityMatch[1]!, 10);
  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) {
    return withCors(request, Response.json({ error: access.error }, { status: access.status }));
  }

  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [snapshots, prompts, geoAudits] = await Promise.all([
    db
      .select({
        id: llmVisibilitySnapshotsTable.id,
        engine: llmVisibilitySnapshotsTable.engine,
        cited: llmVisibilitySnapshotsTable.cited,
        checkedAt: llmVisibilitySnapshotsTable.checkedAt,
        competitorsMentioned: llmVisibilitySnapshotsTable.competitorsMentioned,
      })
      .from(llmVisibilitySnapshotsTable)
      .where(
        and(
          eq(llmVisibilitySnapshotsTable.websiteProjectId, projectId),
          gte(llmVisibilitySnapshotsTable.checkedAt, since),
        ),
      )
      .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt)),
    db
      .select({
        id: llmVisibilityPromptsTable.id,
        isActive: llmVisibilityPromptsTable.isActive,
      })
      .from(llmVisibilityPromptsTable)
      .where(eq(llmVisibilityPromptsTable.websiteProjectId, projectId)),
    db
      .select({
        id: geoAuditsTable.id,
        geoScore: geoAuditsTable.geoScore,
        createdAt: geoAuditsTable.createdAt,
      })
      .from(geoAuditsTable)
      .where(
        and(eq(geoAuditsTable.websiteProjectId, projectId), gte(geoAuditsTable.createdAt, since)),
      )
      .orderBy(desc(geoAuditsTable.createdAt)),
  ]);

  const latestBatch = snapshots.slice(0, prompts.length * 4);
  const citedLatest = latestBatch.filter((s) => s.cited).length;
  const visibilityScore = computeVisibilityScore(citedLatest, latestBatch.length || 1);

  const byEngine = ["chatgpt", "perplexity", "claude", "gemini"].map((engine) => {
    const engineSnaps = latestBatch.filter((s) => s.engine === engine);
    const cited = engineSnaps.filter((s) => s.cited).length;
    return {
      engine,
      cited,
      total: engineSnaps.length,
      score: computeVisibilityScore(cited, engineSnaps.length || 1),
    };
  });

  const competitorHeatmap = new Map<string, number>();
  for (const snap of latestBatch) {
    for (const comp of snap.competitorsMentioned ?? []) {
      competitorHeatmap.set(comp, (competitorHeatmap.get(comp) ?? 0) + 1);
    }
  }

  const [projectRow] = await db
    .select({ visibilitySettings: websiteProjectsTable.visibilitySettings })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  return withCors(
    request,
    Response.json({
      settings: parseVisibilitySettings(projectRow?.visibilitySettings),
      visibilityScore,
      promptCount: prompts.filter((p) => p.isActive).length,
      trend: aggregateSnapshotsByDate(snapshots),
      byEngine,
      competitorMentions: [...competitorHeatmap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      geoScoreTrend: geoAudits
        .slice()
        .reverse()
        .map((a) => ({
          date: new Date(a.createdAt).toISOString().slice(0, 10),
          score: a.geoScore,
        })),
      latestGeoScore: geoAudits[0]?.geoScore ?? null,
      recentSnapshots: snapshots.slice(0, 20),
      score: {
        overall: visibilityScore,
        byEngine: Object.fromEntries(byEngine.map((e) => [e.engine, e.score])),
      },
      prompts,
      snapshots,
    }),
  );
}
