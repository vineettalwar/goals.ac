import { createContext } from "react";

export interface ProjectSummary {
  id: number;
  name: string;
  url: string;
  crawlStatus: string;
}

export interface ActiveProjectContextValue {
  projects: ProjectSummary[];
  activeProjectId: number | null;
  setActiveProjectId: (id: number | null) => void;
  isLoading: boolean;
}

export const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);
