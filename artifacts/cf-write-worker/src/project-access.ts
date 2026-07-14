import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema-sqlite";
import { and, eq } from "drizzle-orm";

export async function ownedProject(projectId: number, userId: number) {
  const [project] = await db
    .select()
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
