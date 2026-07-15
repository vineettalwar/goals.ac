import { getSession } from "@/auth";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { NewProjectButton } from "./new-project-button";
import { ProjectList } from "./project-list";
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

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each project is a website with its own content strategy, roadmap, and studio.
          </p>
          {quota != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {projectCount} of {quota} sites used on your plan
            </p>
          )}
        </div>
        <NewProjectButton />
      </div>

      {membership && isSiteAdmin(session.user.orgRole) && (
        <TeamManagement projects={projects} />
      )}

      {rows.length === 0 ? (
        <div className="paper-card flex flex-col items-center justify-center gap-4 p-16 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a project to generate content strategies, roadmaps, and SEO articles for your website.
            </p>
          </div>
          <NewProjectButton />
        </div>
      ) : (
        <ProjectList
          projects={rows.map(({ project, brand }) => ({
            id: project.id,
            name: project.name,
            url: project.url,
            scrapeStatus: project.scrapeStatus,
            industry: brand?.industry ?? null,
          }))}
        />
      )}
    </div>
  );
}
