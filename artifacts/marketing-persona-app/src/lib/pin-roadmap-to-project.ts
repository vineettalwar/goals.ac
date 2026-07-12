import { db } from "@workspace/db";
import {
  projectRoadmapsTable,
  roadmapsTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

export async function verifyProjectOwnership(projectId: number, userId: number) {
  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(
      and(
        eq(websiteProjectsTable.id, projectId),
        eq(websiteProjectsTable.userId, userId),
      ),
    )
    .limit(1);

  return project ?? null;
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
