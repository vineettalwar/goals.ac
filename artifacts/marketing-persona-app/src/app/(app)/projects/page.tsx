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
  getOrgMembership,
  isSiteAdmin,
  isSuperAdmin,
  listAccessibleProjects,
} from "@/lib/org-access";
import { getProjectQuota } from "@/lib/usage";
import { TeamManagement } from "./team-management";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const canManageAllSites =
    isSuperAdmin(session.user.role) || isSiteAdmin(session.user.orgRole);

  if (!canManageAllSites) {
    redirect("/dashboard");
  }

  const projects = await listAccessibleProjects(userId);
  const membership = await getOrgMembership(userId);
  const projectCount =
    membership && !isSuperAdmin(session.user.role)
      ? await countOrganizationProjects(membership.organizationId)
      : projects.length;
  const quota =
    membership && !isSuperAdmin(session.user.role)
      ? getProjectQuota(membership.organizationPlan)
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
