"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveProject } from "@/context/active-project";
import { PageSkeleton } from "@/components/page-skeleton";
import { ProjectPublishingTab } from "@/components/project-publishing-tab";
import { SearchPropertyConnectionsPanel } from "@/components/search-property-connections-panel";
import { IntegrationTabBadge } from "@/components/integration-tile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IntegrationCategoryFilter } from "@/components/publishing-settings-panel";
import {
  useIntegrationCounts,
} from "@/hooks/use-integration-counts";
import { SEARCH_INTEGRATIONS_COUNT } from "@/components/search-property-connections-panel";
import { getCmsDestinations, getEspDestinations, SOCIAL_SETTINGS_COUNT } from "@/lib/publishing-destinations";

type IntegrationsTab = "all" | IntegrationCategoryFilter | "search";

const CMS_TOTAL = getCmsDestinations().length;
const ESP_TOTAL = getEspDestinations().length;

export default function IntegrationsPage() {
  const { activeProjectId, activeProject, isLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const [activeTab, setActiveTab] = useState<IntegrationsTab>("all");
  const counts = useIntegrationCounts(projectId);

  const publishingFilter: IntegrationCategoryFilter =
    activeTab === "cms" || activeTab === "social" || activeTab === "esp" ? activeTab : "all";

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
            <TabsTrigger value="all" className="gap-0">
              All
              <IntegrationTabBadge count={counts.total} />
            </TabsTrigger>
            <TabsTrigger value="cms" className="gap-0">
              CMS
              <IntegrationTabBadge count={counts.cms} />
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-0">
              Social
              <IntegrationTabBadge count={counts.social} />
            </TabsTrigger>
            <TabsTrigger value="esp" className="gap-0">
              Email
              <IntegrationTabBadge count={counts.esp} />
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-0">
              Search & AI
              <IntegrationTabBadge count={counts.search} />
            </TabsTrigger>
          </TabsList>

          {activeTab === "all" || activeTab === "search" ? (
            <SearchPropertyConnectionsPanel
              projectId={projectId}
              embedded
              layout="grid"
            />
          ) : null}

          {activeTab !== "search" ? (
            <ProjectPublishingTab
              projectId={projectId}
              showAutomation={false}
              layout="grid"
              categoryFilter={publishingFilter}
            />
          ) : null}

          {!counts.loading && activeTab === "all" ? (
            <p className="text-xs text-muted-foreground">
              {counts.total} of {CMS_TOTAL + ESP_TOTAL + SOCIAL_SETTINGS_COUNT + SEARCH_INTEGRATIONS_COUNT}{" "}
              integrations connected.
            </p>
          ) : null}
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
