import { db, gscUrlInspectionsTable } from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";

const RATE_LIMIT_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Returns true if the same project+url was inspected in the last 60 minutes.
 */
export async function wasRecentlyInspected(
  projectId: number,
  inspectionUrl: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - RATE_LIMIT_MS);
  const [existing] = await db
    .select({ id: gscUrlInspectionsTable.id })
    .from(gscUrlInspectionsTable)
    .where(
      and(
        eq(gscUrlInspectionsTable.websiteProjectId, projectId),
        eq(gscUrlInspectionsTable.inspectionUrl, inspectionUrl),
        gte(gscUrlInspectionsTable.inspectedAt, cutoff),
      ),
    )
    .limit(1);
  return !!existing;
}
