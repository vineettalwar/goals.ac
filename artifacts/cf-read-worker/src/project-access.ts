import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema-sqlite";
import { and, eq, inArray } from "drizzle-orm";

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

export async function userProjectIds(userId: number): Promise<number[]> {
  const rows = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId));
  return rows.map((r) => r.id);
}

export async function requireOwnedProject(projectId: number, userId: number) {
  const project = await ownedProject(projectId, userId);
  if (!project) return null;
  return project;
}

export function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
