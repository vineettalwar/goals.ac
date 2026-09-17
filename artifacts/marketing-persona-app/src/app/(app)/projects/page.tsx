import { getSession } from "@/auth";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  countOrganizationProjects,
  getOrganizationSupportContext,
  getOrgMembership,
  isSiteAdmin,
  isSuperAdmin,
  listAccessibleProjects,
} from "@/lib/org/org-access";
import { getSupportOrganizationId } from "@/lib/org/project-scope";
import { resolvePlanProjectQuota } from "@workspace/billing";
import { TeamManagement } from "./team-management";
import { ProjectsPageClient } from "./projects-page-client";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const supportOrganizationId = getSupportOrganizationId(session);
  const canManageAllSites =
    isSuperAdmin(session.user.role) ||
    isSiteAdmin(session.user.orgRole) ||
    supportOrganizationId != null;

  if (!canManageAllSites) {
    redirect("/dashboard");
  }

  const [projects, membership, supportOrg] = await Promise.all([
    listAccessibleProjects(userId, supportOrganizationId),
    getOrgMembership(userId),
    supportOrganizationId != null
      ? getOrganizationSupportContext(supportOrganizationId)
      : Promise.resolve(null),
  ]);
  const projectCount =
    supportOrg != null
      ? projects.length
      : membership && !isSuperAdmin(session.user.role)
        ? await countOrganizationProjects(membership.organizationId)
        : projects.length;
  const quota =
    supportOrg != null
      ? await resolvePlanProjectQuota(supportOrg.plan)
      : membership && !isSuperAdmin(session.user.role)
        ? await resolvePlanProjectQuota(membership.organizationPlan)
        : null;

  const projectIds = projects.map((p) => p.id);
  const brandRows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            websiteProjectId: brandProfilesTable.websiteProjectId,
            industry: brandProfilesTable.industry,
          })
          .from(brandProfilesTable)
          .where(inArray(brandProfilesTable.websiteProjectId, projectIds));
  const industryByProject = new Map(
    brandRows.map((row) => [row.websiteProjectId, row.industry ?? null]),
  );

  const quotaLabel =
    quota != null ? `${projectCount} of ${quota} sites used on your plan` : null;

  return (
    <>
      {membership && isSiteAdmin(session.user.orgRole) ? (
        <div className={APP_SHELL_PAGE}>
          <TeamManagement projects={projects} />
        </div>
      ) : null}
      <ProjectsPageClient
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          url: project.url,
          scrapeStatus: project.scrapeStatus,
          industry: industryByProject.get(project.id) ?? null,
        }))}
        quotaLabel={quotaLabel}
      />
    </>
  );
}
