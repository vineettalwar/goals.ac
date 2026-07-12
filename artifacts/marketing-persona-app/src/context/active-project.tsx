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

const STORAGE_KEY = "activeProjectId";

export interface ProjectSummary {
  id: number;
  name: string;
  url: string;
  crawlStatus: string;
}

interface ActiveProjectContextValue {
  projects: ProjectSummary[];
  activeProjectId: number | null;
  activeProject: ProjectSummary | null;
  setActiveProjectId: (id: number | null) => void;
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);

async function fetchWebsiteProjects(): Promise<ProjectSummary[]> {
  const res = await fetch("/api/website-projects");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data.projects ?? [];
}

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectIdState] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: queryKeys.websiteProjects,
    queryFn: fetchWebsiteProjects,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (initialized || isLoading) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const storedId = stored ? Number.parseInt(stored, 10) : NaN;
    const validStored = projects.find((p) => p.id === storedId);

    setActiveProjectIdState((current) => {
      if (validStored) return validStored.id;
      if (current && projects.some((p) => p.id === current)) return current;
      return projects[0]?.id ?? null;
    });
    setInitialized(true);
  }, [initialized, isLoading, projects]);

  const setActiveProjectId = useCallback((id: number | null) => {
    setActiveProjectIdState(id);
    if (id != null) {
      localStorage.setItem(STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

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
