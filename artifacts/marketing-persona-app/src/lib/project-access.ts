import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export async function requireProjectAccess(
  projectId: number,
  userId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);

  if (!project) {
    return { ok: false, status: 404, error: "Project not found" };
  }
  return { ok: true };
}
