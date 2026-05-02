import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "./auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface ProjectSummary {
  id: number;
  name: string;
  url: string;
  crawlStatus: string;
}

interface ActiveProjectContextValue {
  projects: ProjectSummary[];
  activeProjectId: number | null;
  setActiveProjectId: (id: number | null) => void;
  isLoading: boolean;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      setProjects([]);
      setActiveProjectIdState(null);
      return;
    }

    setIsLoading(true);
    fetch(`${API_BASE}/api/website-projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: ProjectSummary[]) => {
        setProjects(data);
        if (data.length > 0 && !activeProjectId) {
          setActiveProjectIdState(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const setActiveProjectId = (id: number | null) => setActiveProjectIdState(id);

  return (
    <ActiveProjectContext.Provider value={{ projects, activeProjectId, setActiveProjectId, isLoading }}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) throw new Error("useActiveProject must be used within ActiveProjectProvider");
  return ctx;
}
