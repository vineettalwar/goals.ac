import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { ActiveProjectContext, type ProjectSummary } from "./active-project-context";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchWebsiteProjects(token: string): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_BASE}/api/website-projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load projects");
  return res.json() as Promise<ProjectSummary[]>;
}

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [activeProjectId, setActiveProjectIdState] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: projects = [], isLoading: queryLoading } = useQuery({
    queryKey: ["website-projects", token],
    queryFn: () => fetchWebsiteProjects(token!),
    enabled: Boolean(user && token),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user || !token) {
      setActiveProjectIdState(null);
      setInitialized(false);
      return;
    }

    if (queryLoading || initialized) return;

    if (projects.length > 0 && activeProjectId == null) {
      setActiveProjectIdState(projects[0].id);
    }
    setInitialized(true);
  }, [user, token, queryLoading, initialized, projects, activeProjectId]);

  const isLoading = Boolean(user && token) && (queryLoading || !initialized);

  const setActiveProjectId = useCallback((id: number | null) => {
    setActiveProjectIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      projects: user && token ? projects : [],
      activeProjectId: user && token ? activeProjectId : null,
      setActiveProjectId,
      isLoading,
    }),
    [user, token, projects, activeProjectId, setActiveProjectId, isLoading],
  );

  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  );
}
