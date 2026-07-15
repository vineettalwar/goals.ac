import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import type { WebsiteProject } from "@/types/api";

const STORAGE_KEY = "goals.activeProjectId";

export function useActiveProject() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramId = searchParams.get("project");

  useEffect(() => {
    void apiFetch<WebsiteProject[]>("/api/website-projects")
      .then((rows) => {
        setProjects(rows);
        const stored = localStorage.getItem(STORAGE_KEY);
        const candidate = paramId ?? stored ?? "";
        const valid =
          candidate && rows.some((row) => String(row.id) === candidate)
            ? candidate
            : rows[0]
              ? String(rows[0].id)
              : "";
        if (valid) {
          localStorage.setItem(STORAGE_KEY, valid);
          if (paramId !== valid) {
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.set("project", valid);
                return next;
              },
              { replace: true },
            );
          }
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"))
      .finally(() => setLoading(false));
  }, [paramId, setSearchParams]);

  const projectId = useMemo(() => {
    const candidate = paramId ?? localStorage.getItem(STORAGE_KEY) ?? "";
    if (candidate && projects.some((row) => String(row.id) === candidate)) {
      return candidate;
    }
    return projects[0] ? String(projects[0].id) : candidate;
  }, [paramId, projects]);

  const setProjectId = useCallback(
    (id: string) => {
      localStorage.setItem(STORAGE_KEY, id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("project", id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const activeProject = useMemo(
    () => projects.find((p) => String(p.id) === projectId) ?? null,
    [projects, projectId],
  );

  return {
    projects,
    projectId,
    activeProject,
    loading,
    error,
    setProjectId,
  };
}
