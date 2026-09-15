import { db } from "@workspace/db";
import {
  projectRoadmapsTable,
  roadmapsTable,
} from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getAccessibleProject } from "@/lib/org/org-access";

export const ROADMAP_SUMMARY_COLUMNS = {
  id: roadmapsTable.id,
  slug: roadmapsTable.slug,
  industry: roadmapsTable.industry,
  location: roadmapsTable.location,
  stage: roadmapsTable.stage,
  viewCount: roadmapsTable.viewCount,
} as const;

export async function listPinnedRoadmapSummaries(projectId: number) {
  return db
    .select(ROADMAP_SUMMARY_COLUMNS)
    .from(projectRoadmapsTable)
    .innerJoin(roadmapsTable, eq(projectRoadmapsTable.roadmapId, roadmapsTable.id))
    .where(eq(projectRoadmapsTable.projectId, projectId))
    .orderBy(desc(roadmapsTable.createdAt));
}

export async function verifyProjectOwnership(projectId: number, userId: number) {
  const project = await getAccessibleProject(projectId, userId);
  if (!project) return null;
  return { id: project.id };
}

export async function pinRoadmapToProject(projectId: number, roadmapId: number) {
  await db
    .insert(projectRoadmapsTable)
    .values({ projectId, roadmapId })
    .onConflictDoNothing();
}

export async function unpinRoadmapFromProject(projectId: number, roadmapId: number) {
  await db
    .delete(projectRoadmapsTable)
    .where(
      and(
        eq(projectRoadmapsTable.projectId, projectId),
        eq(projectRoadmapsTable.roadmapId, roadmapId),
      ),
    );
}

export async function verifyRoadmapExists(roadmapId: number) {
  const [roadmap] = await db
    .select({ id: roadmapsTable.id })
    .from(roadmapsTable)
    .where(eq(roadmapsTable.id, roadmapId))
    .limit(1);

  return roadmap ?? null;
}
