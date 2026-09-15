import { SeoChatWorkspace } from "@workspace/app-shell/seo-chat";
import { useActiveProject } from "@/hooks/use-active-project";
import { getApiBase } from "@/lib/api";

export function ChatPage() {
  const { projects, projectId, setProjectId } = useActiveProject();
  const pid = projectId ? Number.parseInt(projectId, 10) : NaN;

  return (
    <SeoChatWorkspace
      projectId={projectId}
      projects={projects}
      onProjectChange={setProjectId}
      request={(path, init) => {
        const base = getApiBase();
        const url = path.startsWith("http") ? path : `${base}${path}`;
        return fetch(url, { credentials: "include", ...init });
      }}
      studioHref={(pieceId) =>
        Number.isFinite(pid)
          ? pieceId
            ? `/projects/${pid}/content-piece/${pieceId}`
            : `/projects/${pid}/content-studio`
          : "/projects"
      }
      actionsHref="/search/actions"
    />
  );
}
