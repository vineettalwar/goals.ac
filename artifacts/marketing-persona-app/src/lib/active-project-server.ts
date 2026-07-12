import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/active-project-cookie";

export const resolveActiveProjectId = cache(async (userId: number): Promise<number | null> => {
  const cookieStore = await cookies();
  const stored = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;
  const storedId = stored ? Number.parseInt(stored, 10) : Number.NaN;

  if (!Number.isNaN(storedId)) {
    const [owned] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.userId, userId), eq(websiteProjectsTable.id, storedId)))
      .limit(1);

    if (owned) return owned.id;
  }

  const [first] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId))
    .limit(1);

  return first?.id ?? null;
});
