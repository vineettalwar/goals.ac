import { getSession } from "@/auth";
import { db } from "@workspace/db";
import { brandProfilesTable, contentPiecesTable, organizationsTable } from "@workspace/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  getOrgMembership,
  getOrganizationSupportContext,
  isSiteAdmin,
  isSuperAdmin,
  listAccessibleProjects,
} from "@/lib/org/org-access";
import { getSupportOrganizationId } from "@/lib/org/project-scope";
import { loadProjectVisibilitySummary } from "@/lib/projects/project-visibility-summary";
import { getProjectInternalLinkSummary } from "@/lib/projects/internal-links-summary";
import {
  PartnerWorkspaceClient,
  type PartnerProjectRow,
} from "@/components/partner/partner-workspace-client";

export default async function PartnerPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const supportOrganizationId = getSupportOrganizationId(session);
  const canAccessPartner =
    isSuperAdmin(session.user.role) ||
    isSiteAdmin(session.user.orgRole) ||
    supportOrganizationId != null;

  if (!canAccessPartner) {
    redirect("/dashboard");
  }

  const projects = await listAccessibleProjects(userId, supportOrganizationId);
  const membership = await getOrgMembership(userId);
  const supportOrg =
    supportOrganizationId != null
      ? await getOrganizationSupportContext(supportOrganizationId)
      : null;

  let organizationName = supportOrg?.name ?? null;
  if (!organizationName && membership) {
    const [org] = await db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, membership.organizationId))
      .limit(1);
    organizationName = org?.name ?? null;
  }

  const projectIds = projects.map((p) => p.id);
  const pieceCounts =
    projectIds.length === 0
      ? []
      : await db
          .select({
            projectId: contentPiecesTable.websiteProjectId,
            publishedCount: sql<number>`count(*) filter (where ${contentPiecesTable.status} = 'published')`.mapWith(
              Number,
            ),
            draftCount: sql<number>`count(*) filter (where ${contentPiecesTable.status} != 'published')`.mapWith(
              Number,
            ),
          })
          .from(contentPiecesTable)
          .where(inArray(contentPiecesTable.websiteProjectId, projectIds))
          .groupBy(contentPiecesTable.websiteProjectId);

  const countByProject = new Map(
    pieceCounts.map((row) => [
      row.projectId,
      { published: row.publishedCount, draft: row.draftCount },
    ]),
  );

  const brands =
    projectIds.length === 0
      ? []
      : await db
          .select({
            projectId: brandProfilesTable.websiteProjectId,
            industry: brandProfilesTable.industry,
          })
          .from(brandProfilesTable)
          .where(inArray(brandProfilesTable.websiteProjectId, projectIds));

  const industryByProject = new Map(brands.map((b) => [b.projectId, b.industry]));

  const rows: PartnerProjectRow[] = await Promise.all(
    projects.map(async (project) => {
      const [visibility, links] = await Promise.all([
        loadProjectVisibilitySummary(project.id),
        getProjectInternalLinkSummary(project.id),
      ]);
      const counts = countByProject.get(project.id) ?? { published: 0, draft: 0 };

      return {
        id: project.id,
        name: project.name,
        url: project.url,
        industry: industryByProject.get(project.id) ?? null,
        visibilityScore: visibility.visibilityScore,
        visibilityDelta: visibility.visibilityDelta,
        geoScore: visibility.latestGeoScore,
        geoScoreDelta: visibility.geoScoreDelta,
        linkCoverage: links.coverageScore,
        publishedCount: counts.published,
        draftCount: counts.draft,
      };
    }),
  );

  return <PartnerWorkspaceClient projects={rows} organizationName={organizationName} />;
}
