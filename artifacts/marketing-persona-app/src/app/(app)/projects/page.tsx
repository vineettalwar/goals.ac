import { auth } from "@/auth";
import { db } from "@workspace/db";
import { websiteProjectsTable, brandProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewProjectButton } from "./new-project-button";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const projects = await db
    .select({ project: websiteProjectsTable, brand: brandProfilesTable })
    .from(websiteProjectsTable)
    .leftJoin(brandProfilesTable, eq(brandProfilesTable.websiteProjectId, websiteProjectsTable.id))
    .where(eq(websiteProjectsTable.userId, userId));

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Each project is a website with its own content strategy, roadmap, and studio.</p>
        </div>
        <NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <div className="paper-card flex flex-col items-center justify-center gap-4 p-16 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a project to generate content strategies, roadmaps, and SEO articles for your website.</p>
          </div>
          <NewProjectButton />
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map(({ project, brand }) => (
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
