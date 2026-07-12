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
}

export async function loadProjectVisibilitySummary(
  projectId: number,
): Promise<ProjectVisibilitySummary> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [prompts, geoAudits] = await Promise.all([
    db
      .select({ id: llmVisibilityPromptsTable.id })
      .from(llmVisibilityPromptsTable)
      .where(eq(llmVisibilityPromptsTable.websiteProjectId, projectId)),
    db
      .select({
        geoScore: geoAuditsTable.geoScore,
      })
      .from(geoAuditsTable)
      .where(
        and(eq(geoAuditsTable.websiteProjectId, projectId), gte(geoAuditsTable.createdAt, since)),
      )
      .orderBy(desc(geoAuditsTable.createdAt))
      .limit(1),
  ]);

  const promptCount = prompts.length;
  const snapshotLimit = Math.max(promptCount * 4, 4);

  const snapshots = await db
    .select()
    .from(llmVisibilitySnapshotsTable)
    .where(
      and(
        eq(llmVisibilitySnapshotsTable.websiteProjectId, projectId),
        gte(llmVisibilitySnapshotsTable.checkedAt, since),
      ),
    )
    .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt))
    .limit(snapshotLimit);

  const latestBatch = snapshots;
  const citedLatest = latestBatch.filter((s) => s.cited).length;
  const visibilityScore = computeVisibilityScore(citedLatest, latestBatch.length || 1);

  return {
    visibilityScore,
    latestGeoScore: geoAudits[0]?.geoScore ?? null,
  };
}
