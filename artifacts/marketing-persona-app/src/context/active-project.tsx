"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { fetchWebsiteProjects } from "@/lib/queries/fetchers";
import {
  clearActiveProjectCookie,
  setActiveProjectCookie,
} from "@/lib/active-project/cookie";
import { removeProjectScopedQueries } from "@/lib/queries/invalidate-project-queries";
import { ActiveProjectContext } from "./active-project-context";

const STORAGE_KEY = "activeProjectId";

function subscribeNoop() {
  return () => {};
}

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectIdState] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const { data: projects = [], isLoading: queryLoading } = useQuery({
    queryKey: queryKeys.websiteProjects,
    queryFn: fetchWebsiteProjects,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (initialized || queryLoading) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const storedId = stored ? Number.parseInt(stored, 10) : NaN;
    const validStored = projects.find((p) => p.id === storedId);

    const nextId = validStored
      ? validStored.id
      : activeProjectId && projects.some((p) => p.id === activeProjectId)
        ? activeProjectId
        : projects[0]?.id ?? null;

    setActiveProjectIdState(nextId);

    if (nextId != null) {
      setActiveProjectCookie(nextId);
    }
    setInitialized(true);
  }, [initialized, queryLoading, projects, activeProjectId]);

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
