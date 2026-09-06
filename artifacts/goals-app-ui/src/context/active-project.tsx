import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectIdFromPathname } from "@workspace/app-shell";
import { navigationTargetForActiveProject, queryStringForProjectSwitch } from "@/lib/active-project/routing";
import { fetchWebsiteProjects } from "@/lib/queries/fetchers";
import { removeProjectScopedQueries } from "@/lib/queries/invalidate-project-queries";
import { queryKeys } from "@/lib/queries/keys";
import type { WebsiteProject } from "@/types/api";

const STORAGE_KEY = "goals.activeProjectId";

type ActiveProjectContextValue = {
  projects: WebsiteProject[];
  projectId: string;
  activeProject: WebsiteProject | null;
  loading: boolean;
  error: string | null;
  setProjectId: (id: string) => void;
};

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const pathProjectId = projectIdFromPathname(pathname);
  const rawParamId = searchParams.get("project");

  const {
    data: projects = [],
    isPending,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.websiteProjects,
    queryFn: fetchWebsiteProjects,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  const projectId = useMemo(() => {
    const fromPath = pathProjectId != null ? String(pathProjectId) : "";
    const candidate = fromPath || localStorage.getItem(STORAGE_KEY) || "";
    if (candidate && projects.some((row) => String(row.id) === candidate)) {
      return candidate;
    }
    return projects[0] ? String(projects[0].id) : candidate;
  }, [pathProjectId, projects]);

  useEffect(() => {
    if (projects.length === 0) return;

    const fromPath = pathProjectId != null ? String(pathProjectId) : "";
    const stored = localStorage.getItem(STORAGE_KEY);
    const candidate = fromPath || stored || "";
    const valid =
      candidate && projects.some((row) => String(row.id) === candidate)
        ? candidate
        : projects[0]
          ? String(projects[0].id)
          : "";

    if (!valid) return;

    localStorage.setItem(STORAGE_KEY, valid);

    // Strip legacy ?project= everywhere (path / storage own scope).
    if (rawParamId != null) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("project");
          return next;
        },
        { replace: true },
      );
    }
  }, [projects, pathProjectId, rawParamId, setSearchParams]);

  const setProjectId = useCallback(
    (id: string) => {
      const previous = localStorage.getItem(STORAGE_KEY);
      // Path-scoped pages call this on mount to sync storage. Re-navigating to the
      // current pathname fights in-page redirects (e.g. /integrations → /integrations/cms)
      // and can loop into a blank Loading screen.
      if (previous === id) return;

      removeProjectScopedQueries(queryClient);
      localStorage.setItem(STORAGE_KEY, id);

      const numericId = Number.parseInt(id, 10);
      const navigationTarget = Number.isFinite(numericId)
        ? navigationTargetForActiveProject(pathname, numericId)
        : null;

      if (navigationTarget && navigationTarget !== pathname) {
        const queryString = queryStringForProjectSwitch(searchParams.toString());
        navigate(queryString ? `${navigationTarget}?${queryString}` : navigationTarget);
      }
    },
    [queryClient, pathname, searchParams, navigate],
  );

  const activeProject = useMemo(
    () => projects.find((project) => String(project.id) === projectId) ?? null,
    [projects, projectId],
  );

  const loading = isPending && projects.length === 0;
  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Failed to load projects"
        : null;

  const value = useMemo(
    () => ({
      projects,
      projectId,
      activeProject,
      loading,
      error,
      setProjectId,
    }),
    [projects, projectId, activeProject, loading, error, setProjectId],
  );

  return (
    <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const context = useContext(ActiveProjectContext);
  if (!context) {
    throw new Error("useActiveProject must be used within ActiveProjectProvider");
  }
  return context;
}
