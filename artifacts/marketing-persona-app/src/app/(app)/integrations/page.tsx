"use client";

import Link from "next/link";
import { useActiveProject } from "@/context/active-project";
import { PageSkeleton } from "@/components/page-skeleton";
import { ProjectPublishingTab } from "@/components/project-publishing-tab";
import { SearchPropertyConnectionsPanel } from "@/components/search-property-connections-panel";

export default function IntegrationsPage() {
  const { activeProjectId, activeProject, isLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";

  return (
    <div className="px-8 py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect CMS platforms, social accounts, and search properties for{" "}
          {activeProject ? (
            <span className="font-medium text-foreground">{activeProject.name}</span>
          ) : (
            "your project"
          )}
          . Credentials and tokens are encrypted at rest.
        </p>
      </div>

      {!projectId && isLoading && <PageSkeleton />}

      {!projectId && !isLoading && (
        <div className="paper-card p-8 text-center text-sm text-muted-foreground">
          Choose a project in the sidebar to manage integrations.
        </div>
      )}

      {projectId ? (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">AI citation sources</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Connect Google Search Console and Bing Webmaster for native AI citation reports on
                this project.
              </p>
            </div>
            <SearchPropertyConnectionsPanel projectId={projectId} embedded />
          </section>

          <ProjectPublishingTab projectId={projectId} showAutomation={false} />
        </>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Need setup instructions? Browse the{" "}
        <Link href="/help" className="text-primary hover:underline">
          Help center
        </Link>
        .
      </p>
    </div>
  );
}
