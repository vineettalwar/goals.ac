"use client";

import { ActionQueueWorkspace } from "@workspace/app-shell/agent-loop";
import { useActiveProject } from "@/context/use-active-project";

export function ActionQueuePanel() {
  const { activeProjectId } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";

  return (
    <ActionQueueWorkspace
      projectId={projectId}
      request={(path, init) => fetch(path, { credentials: "include", ...init })}
    />
  );
}
