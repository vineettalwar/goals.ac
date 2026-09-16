import { SectionShell } from "@/components/SectionShell";
import { ActionQueueWorkspace } from "@workspace/app-shell/agent-loop";
import { useActiveProject } from "@/hooks/use-active-project";
import { getApiBase } from "@/lib/api";
import { searchTabs } from "@/pages/section-page-shared";

export function ActionQueuePage() {
  const { projectId } = useActiveProject();

  return (
    <SectionShell
      title="Action queue"
      description="Scored SEO work with evidence. Run with the employee loop. Approve releases the item to Autopilot, or resumes a gated live publish. Trajectories are stored on agent_runs."
      tabs={searchTabs}
    >
      <ActionQueueWorkspace
        projectId={projectId}
        request={(path, init) => {
          const base = getApiBase();
          const url = path.startsWith("http") ? path : `${base}${path}`;
          return fetch(url, { credentials: "include", ...init });
        }}
      />
    </SectionShell>
  );
}
