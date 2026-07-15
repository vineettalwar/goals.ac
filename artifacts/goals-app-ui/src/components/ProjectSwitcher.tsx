import { Link } from "react-router-dom";
import { Globe, Plus } from "lucide-react";
import { cn } from "@workspace/app-shell";
import { useActiveProject } from "@/hooks/use-active-project";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ProjectSwitcher({ className }: { className?: string }) {
  const { projects, projectId, activeProject, loading, setProjectId } = useActiveProject();

  if (loading && projects.length === 0) {
    return (
      <div className={cn("px-3 py-2.5 text-xs text-muted-foreground", className)}>
        Loading projects…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={cn("px-3 py-2.5", className)}>
        <p className="text-xs font-medium text-foreground">No projects yet</p>
        <Link
          to="/projects"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add a website
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("px-2", className)}>
      <label className="sr-only" htmlFor="project-switcher">
        Active project
      </label>
      <div className="relative">
        <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <select
          id="project-switcher"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-border bg-secondary/60 pl-9 pr-8 text-xs font-medium text-foreground outline-none focus:border-primary"
        >
          {projects.map((project) => (
            <option key={project.id} value={String(project.id)}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {activeProject?.url ? (
        <p className="mt-1 truncate px-1 text-[10px] text-muted-foreground">
          {hostname(activeProject.url)}
        </p>
      ) : null}
    </div>
  );
}
