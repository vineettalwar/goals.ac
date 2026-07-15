import { getSession } from "@/auth";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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

  const rows = await Promise.all(
    projects.map(async (project) => {
      const [brand] = await db
        .select()
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, project.id))
        .limit(1);
      return { project, brand: brand ?? null };
    }),
  );

  const quotaLabel =
    quota != null ? `${projectCount} of ${quota} sites used on your plan` : null;

  return (
    <>
      {membership && isSiteAdmin(session.user.orgRole) ? (
        <div className="px-8 pt-8 max-w-5xl">
          <TeamManagement projects={projects} />
        </div>
      ) : null}
      <ProjectsPageClient
        projects={rows.map(({ project, brand }) => ({
          id: project.id,
          name: project.name,
          url: project.url,
          scrapeStatus: project.scrapeStatus,
          industry: brand?.industry ?? null,
        }))}
        quotaLabel={quotaLabel}
      />
    </>
  );
}
