import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useActiveProject } from "@/hooks/use-active-project";
import { formatProjectUrl } from "@/types/api";

type Tab = { label: string; to: string };

type SectionShellProps = {
  title: string;
  description: string;
  tabs?: Tab[];
  children: ReactNode;
  requireProject?: boolean;
};

export function SectionShell({
  title,
  description,
  tabs,
  children,
  requireProject = true,
}: SectionShellProps) {
  const { projects, projectId, activeProject, loading, error, setProjectId } = useActiveProject();

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-(--muted) mb-6">{description}</p>

      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}

      {projects.length > 0 && requireProject ? (
        <label className="block text-sm mb-4 max-w-md">
          <span className="mb-1 block font-medium">Active project</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-10 w-full rounded-lg border border-(--border) px-3 bg-white"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} — {formatProjectUrl(project)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {tabs && tabs.length > 0 ? (
        <nav className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={`${tab.to}${projectId ? `?project=${projectId}` : ""}`}
              className="rounded-full border border-(--border) px-3 py-1 text-xs font-medium hover:border-(--forest)"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {loading ? <p className="text-sm text-(--muted)">Loading…</p> : null}

      {!loading && requireProject && projects.length === 0 ? (
        <p className="text-sm text-(--muted)">Create a project from the dashboard first.</p>
      ) : null}

      {!loading && (!requireProject || projects.length > 0) ? (
        <>
          {activeProject && requireProject ? (
            <p className="text-xs text-(--muted) mb-4">
              Project: <span className="font-medium text-(--ink)">{activeProject.name}</span>
              {" · "}
              <Link to={`/projects/${activeProject.id}`} className="text-(--forest)">
                Open overview
              </Link>
            </p>
          ) : null}
          {children}
        </>
      ) : null}
    </div>
  );
}
