import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { normalizeHost } from "../integrations/search-property-client";

export function normalizeProjectHost(url: string): string {
  return normalizeHost(url);
}

export async function findDuplicateProjectByUrl(
  organizationId: number,
  url: string,
  excludeProjectId?: number,
): Promise<{ id: number; name: string; url: string } | null> {
  const targetHost = normalizeProjectHost(url);

  const projects = await db
    .select({
      id: websiteProjectsTable.id,
      name: websiteProjectsTable.name,
      url: websiteProjectsTable.url,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.organizationId, organizationId));

  for (const project of projects) {
    if (excludeProjectId != null && project.id === excludeProjectId) continue;
    if (normalizeProjectHost(project.url) === targetHost) {
      return project;
    }
  }

  return null;
}
