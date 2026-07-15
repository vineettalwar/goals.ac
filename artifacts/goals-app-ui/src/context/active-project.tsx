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
import { navigationTargetForActiveProject } from "@/lib/active-project/routing";
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
  const paramId = searchParams.get("project");

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
    const candidate = paramId ?? localStorage.getItem(STORAGE_KEY) ?? "";
    if (candidate && projects.some((row) => String(row.id) === candidate)) {
      return candidate;
    }
    return projects[0] ? String(projects[0].id) : candidate;
  }, [paramId, projects]);

  useEffect(() => {
    if (projects.length === 0) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const candidate = paramId ?? stored ?? "";
    const valid =
      candidate && projects.some((row) => String(row.id) === candidate)
        ? candidate
        : projects[0]
          ? String(projects[0].id)
          : "";

    if (!valid) return;

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
  }, [projects, paramId, setSearchParams]);

  const setProjectId = useCallback(
    (id: string) => {
      const previous = localStorage.getItem(STORAGE_KEY);
      if (previous !== id) {
        removeProjectScopedQueries(queryClient);
      }

      localStorage.setItem(STORAGE_KEY, id);

      const numericId = Number.parseInt(id, 10);
      const navigationTarget = Number.isFinite(numericId)
        ? navigationTargetForActiveProject(pathname, numericId)
        : null;

      if (navigationTarget) {
        const query = searchParams.toString();
        const nextQuery = new URLSearchParams(query);
        nextQuery.set("project", id);
        const queryString = nextQuery.toString();
        navigate(queryString ? `${navigationTarget}?${queryString}` : navigationTarget);
        return;
      }

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("project", id);
          return next;
        },
        { replace: true },
      );
    },
    [queryClient, pathname, searchParams, navigate, setSearchParams],
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
