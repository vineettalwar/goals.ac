"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProjectIntegrationsTab } from "@workspace/app-shell/integrations";
import {
  orgIntegrationsPath,
  projectIntegrationsPath,
} from "@workspace/app-shell/project-detail";
import { useActiveProject } from "@/context/use-active-project";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { ProjectPublishingTab } from "@/components/projects/project-publishing-tab";
import { SearchPropertyConnectionsPanel } from "@/components/integrations/search-property-connections-panel";
import { AnalyticsPropertyConnectionsPanel } from "@/components/integrations/analytics-property-connections-panel";
import { IntegrationTabBadge } from "@/components/integrations/integration-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIntegrationCounts } from "@/hooks/use-integration-counts";

const VALID_TABS: ProjectIntegrationsTab[] = ["cms", "social", "esp", "search"];
const SOCIAL_STATUS_KEYS = ["linkedin", "twitter", "meta", "bluesky", "mastodon"] as const;
const SEARCH_STATUS_KEYS = ["gsc", "bing", "ga4"] as const;

function parseTab(value: string | undefined): ProjectIntegrationsTab {
  if (value && VALID_TABS.includes(value as ProjectIntegrationsTab)) {
    return value as ProjectIntegrationsTab;
  }
  return "cms";
}

function hasAnyParam(searchParams: URLSearchParams, keys: readonly string[]): boolean {
  return keys.some((key) => searchParams.has(key));
}

export function ProjectIntegrationsPageClient({
  projectId,
  tab,
}: {
  projectId: string;
  tab: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject, setActiveProjectId, isLoading } = useActiveProject();
  const counts = useIntegrationCounts(projectId);
  const strippedRef = useRef(false);
  const activeTab = parseTab(tab);

  useEffect(() => {
    const id = Number.parseInt(projectId, 10);
    if (Number.isFinite(id)) setActiveProjectId(id);
  }, [projectId, setActiveProjectId]);

  useEffect(() => {
    if (strippedRef.current) return;

    const hasSocialStatus = hasAnyParam(searchParams, SOCIAL_STATUS_KEYS);
    const hasSearchStatus = hasAnyParam(searchParams, SEARCH_STATUS_KEYS);
    if (!hasSocialStatus && !hasSearchStatus && !searchParams.has("token")) return;

    const preferTab: ProjectIntegrationsTab = hasSocialStatus
      ? "social"
      : hasSearchStatus
        ? "search"
        : activeTab;

    const keepMetaSelect =
      searchParams.get("meta") === "select_page" && Boolean(searchParams.get("token"));

    const next = new URLSearchParams();
    if (keepMetaSelect) {
      next.set("meta", "select_page");
      const token = searchParams.get("token");
      if (token) next.set("token", token);
    }

    strippedRef.current = true;
    const qs = next.toString();
    const path = projectIntegrationsPath(projectId, preferTab);
    router.replace(qs ? `${path}?${qs}` : path);
  }, [activeTab, projectId, router, searchParams]);

  const projectName =
    activeProject && String(activeProject.id) === projectId ? activeProject.name : null;

  if (isLoading && !projectName) {
    return <PageSkeleton />;
  }

  return (
    <div className="px-8 py-8 max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Project integrations</h1>
        <p className="text-sm text-muted-foreground">
          {projectName ? (
            <>
              Manage connections for{" "}
              <span className="font-medium text-foreground">{projectName}</span>
            </>
          ) : (
            "Manage CMS, social, email, and search connections for this project"
          )}
          . Credentials are encrypted at rest.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          router.push(projectIntegrationsPath(projectId, value as ProjectIntegrationsTab));
        }}
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
          <SearchPropertyConnectionsPanel projectId={projectId} embedded layout="grid" />
          <AnalyticsPropertyConnectionsPanel projectId={projectId} embedded layout="grid" />
        </TabsContent>
      </Tabs>

      <p className="text-sm text-muted-foreground">
        Organization AI and research tools live under{" "}
        <Link href={orgIntegrationsPath("ai")} className="text-primary hover:underline">
          Org integrations
        </Link>
        .
      </p>
    </div>
  );
}
