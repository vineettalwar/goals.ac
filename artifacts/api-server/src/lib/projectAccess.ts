import { db, websiteProjectsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export async function validateProjectAccess(
  projectId: number,
  userId: number,
): Promise<boolean> {
  const [proj] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  return Boolean(proj);
}

export async function requireProjectAccess(
  projectId: number,
  userId: number,
): Promise<{ ok: true } | { ok: false; status: 403 | 404; error: string }> {
  const allowed = await validateProjectAccess(projectId, userId);
  if (!allowed) {
    return { ok: false, status: 403, error: "You do not have access to this project" };
  }
  return { ok: true };
}
