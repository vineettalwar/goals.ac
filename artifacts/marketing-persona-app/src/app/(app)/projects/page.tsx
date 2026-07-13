import { getSession } from "@/auth";
import { db } from "@workspace/db";
import { brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NewProjectButton } from "./new-project-button";
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
        <div className="grid gap-3">
          {rows.map(({ project, brand }) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="paper-card p-5 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{project.name}</p>
                    <Badge variant={project.scrapeStatus === "complete" ? "success" : "muted"} className="text-xs">
                      {project.scrapeStatus === "complete" ? "Ready" : project.scrapeStatus ?? "New"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{project.url}</p>
                  {brand?.industry && (
                    <p className="text-xs text-muted-foreground mt-0.5">{brand.industry}</p>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
