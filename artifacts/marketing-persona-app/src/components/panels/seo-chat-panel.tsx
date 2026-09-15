"use client";

import { SeoChatWorkspace } from "@workspace/app-shell/seo-chat";
import { useActiveProject } from "@/context/use-active-project";

export function SeoChatPanel() {
  const { projects, activeProjectId, setActiveProjectId } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";

  return (
    <SeoChatWorkspace
      projectId={projectId}
      projects={projects}
      onProjectChange={(id) => setActiveProjectId(id ? Number(id) : null)}
      request={(path, init) => fetch(path, { credentials: "include", ...init })}
      studioHref={(pieceId) =>
        activeProjectId
          ? pieceId
            ? `/projects/${activeProjectId}/content-piece/${pieceId}`
            : `/projects/${activeProjectId}/content-studio`
          : "/projects"
      }
      actionsHref="/search/actions"
    />
  );
}
