"use client";

import { useEffect } from "react";
import { useActiveProject } from "@/context/active-project";

export function SyncActiveProjectFromUrl({ projectId }: { projectId: string }) {
  const { setActiveProjectId } = useActiveProject();

  useEffect(() => {
    const id = Number.parseInt(projectId, 10);
    if (!Number.isNaN(id)) {
      setActiveProjectId(id);
    }
  }, [projectId, setActiveProjectId]);

  return null;
}
