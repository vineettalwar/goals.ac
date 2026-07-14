"use client";

import { createContext } from "react";
import type { ProjectSummary } from "@/lib/queries/types";

export type { ProjectSummary };

export interface ActiveProjectContextValue {
  projects: ProjectSummary[];
  activeProjectId: number | null;
  activeProject: ProjectSummary | null;
  setActiveProjectId: (id: number | null) => void;
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

export const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);
