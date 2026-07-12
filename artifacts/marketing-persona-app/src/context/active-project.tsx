"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/website-projects");
      if (!res.ok) {
        setProjects([]);
        return;
      }
      const data = await res.json();
      const list: ProjectSummary[] = Array.isArray(data) ? data : data.projects ?? [];
      setProjects(list);

      const stored = localStorage.getItem(STORAGE_KEY);
      const storedId = stored ? Number.parseInt(stored, 10) : NaN;
      const validStored = list.find((p) => p.id === storedId);

      setActiveProjectIdState((current) => {
        if (validStored) return validStored.id;
        if (current && list.some((p) => p.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const setActiveProjectId = useCallback((id: number | null) => {
    setActiveProjectIdState(id);
    if (id != null) {
      localStorage.setItem(STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  return (
    <ActiveProjectContext.Provider
      value={{
        projects,
        activeProjectId,
        activeProject,
        setActiveProjectId,
        isLoading,
        refreshProjects,
      }}
    >
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) {
    throw new Error("useActiveProject must be used within ActiveProjectProvider");
  }
  return ctx;
}
