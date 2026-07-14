"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveProject } from "@/context/active-project";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { ProjectPublishingTab } from "@/components/projects/project-publishing-tab";
import { SearchPropertyConnectionsPanel } from "@/components/integrations/search-property-connections-panel";
import { AnalyticsPropertyConnectionsPanel } from "@/components/integrations/analytics-property-connections-panel";
import { IntegrationTabBadge } from "@/components/integrations/integration-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IntegrationCategoryFilter } from "@/components/projects/publishing-settings-panel";
import {
  useIntegrationCounts,
} from "@/hooks/use-integration-counts";

type IntegrationsTab = IntegrationCategoryFilter | "search";

export default function IntegrationsPage() {
  const { activeProjectId, activeProject, isLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const [activeTab, setActiveTab] = useState<IntegrationsTab>("cms");
  const counts = useIntegrationCounts(projectId);

  return (
    <div className="px-8 py-8 max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          {activeProject ? (
            <>
              Manage connections for{" "}
              <span className="font-medium text-foreground">{activeProject.name}</span>
            </>
          ) : (
            "Choose a project to manage connections"
          )}
          . Credentials are encrypted at rest.
        </p>
      </div>

      {!projectId && isLoading && <PageSkeleton />}

      {!projectId && !isLoading && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Choose a project in the sidebar to manage integrations.
        </div>
      )}

      {projectId ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as IntegrationsTab)}
          className="space-y-5"
        >
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="cms" className="gap-0">
              CMS
              <IntegrationTabBadge count={counts.cms} loading={counts.loading} />
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-0">
              Social
              <IntegrationTabBadge count={counts.social} loading={counts.loading} />
            </TabsTrigger>
            <TabsTrigger value="esp" className="gap-0">
              Email
              <IntegrationTabBadge count={counts.esp} loading={counts.loading} />
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-0">
              Search & Analytics
              <IntegrationTabBadge count={counts.search} loading={counts.loading} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cms" className="mt-0">
            <ProjectPublishingTab
              projectId={projectId}
              showAutomation={false}
              layout="grid"
              categoryFilter="cms"
            />
          </TabsContent>

          <TabsContent value="social" className="mt-0">
            <ProjectPublishingTab
              projectId={projectId}
              showAutomation={false}
              layout="grid"
              categoryFilter="social"
            />
          </TabsContent>

          <TabsContent value="esp" className="mt-0">
            <ProjectPublishingTab
              projectId={projectId}
              showAutomation={false}
              layout="grid"
              categoryFilter="esp"
            />
          </TabsContent>

          <TabsContent value="search" className="space-y-6 mt-0">
            <SearchPropertyConnectionsPanel
              projectId={projectId}
              embedded
              layout="grid"
            />
            <AnalyticsPropertyConnectionsPanel
              projectId={projectId}
              embedded
              layout="grid"
            />
          </TabsContent>
        </Tabs>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Need setup instructions?{" "}
        <Link href="/help" className="text-primary hover:underline">
          Help center
        </Link>
      </p>
    </div>
  );
}
