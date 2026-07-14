"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { fetchWebsiteProjects } from "@/lib/queries/fetchers";
import type { ProjectSummary } from "@/lib/queries/types";
import {
  clearActiveProjectCookie,
  setActiveProjectCookie,
} from "@/lib/active-project/cookie";
import { removeProjectScopedQueries } from "@/lib/queries/invalidate-project-queries";

const STORAGE_KEY = "activeProjectId";

export type { ProjectSummary };

interface ActiveProjectContextValue {
  projects: ProjectSummary[];
  activeProjectId: number | null;
  activeProject: ProjectSummary | null;
  setActiveProjectId: (id: number | null) => void;
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectIdState] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: projects = [], isLoading: queryLoading } = useQuery({
    queryKey: queryKeys.websiteProjects,
    queryFn: fetchWebsiteProjects,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (initialized || queryLoading) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const storedId = stored ? Number.parseInt(stored, 10) : NaN;
    const validStored = projects.find((p) => p.id === storedId);

    let nextId: number | null = null;
    setActiveProjectIdState((current) => {
      nextId = validStored
        ? validStored.id
        : current && projects.some((p) => p.id === current)
          ? current
          : projects[0]?.id ?? null;
      return nextId;
    });

    if (nextId != null) {
      setActiveProjectCookie(nextId);
    }
    setInitialized(true);
  }, [initialized, queryLoading, projects]);

  const isLoading = !hydrated || queryLoading || !initialized;

  const setActiveProjectId = useCallback(
    (id: number | null) => {
      setActiveProjectIdState((previous) => {
        if (previous !== id) {
          removeProjectScopedQueries(queryClient);
        }
        return id;
      });

      if (id != null) {
        localStorage.setItem(STORAGE_KEY, String(id));
        setActiveProjectCookie(id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        clearActiveProjectCookie();
      }
    },
    [queryClient],
  );

  const refreshProjects = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.websiteProjects });
  }, [queryClient]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const value = useMemo(
    () => ({
      projects,
      activeProjectId,
      activeProject,
      setActiveProjectId,
      isLoading,
      refreshProjects,
    }),
    [projects, activeProjectId, activeProject, setActiveProjectId, isLoading, refreshProjects],
  );

  return (
    <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) {
    throw new Error("useActiveProject must be used within ActiveProjectProvider");
  }
  return ctx;
}
