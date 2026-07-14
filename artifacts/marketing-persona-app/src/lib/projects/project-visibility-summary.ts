import { cache } from "react";
import { db } from "@workspace/db";
import {
  llmVisibilityPromptsTable,
  llmVisibilitySnapshotsTable,
  geoAuditsTable,
} from "@workspace/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { computeVisibilityScore } from "@workspace/seo-tools/llmVisibilityChecker";

export interface ProjectVisibilitySummary {
  visibilityScore: number;
  latestGeoScore: number | null;
  /** Change in citation rate vs prior 14-day window (percentage points). */
  visibilityDelta: number | null;
  /** Change in latest GEO score vs previous audit. */
  geoScoreDelta: number | null;
}

function citationRate(snapshots: { cited: boolean }[]): number {
  if (snapshots.length === 0) return 0;
  return computeVisibilityScore(
    snapshots.filter((s) => s.cited).length,
    snapshots.length,
  );
}

export const loadProjectVisibilitySummary = cache(async (
  projectId: number,
): Promise<ProjectVisibilitySummary> => {
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
});
