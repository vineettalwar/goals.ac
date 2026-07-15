import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { fetchWebsiteProjects } from "@/lib/queries/fetchers";
import { queryKeys } from "@/lib/queries/keys";
import type { ProjectListItem } from "@workspace/app-shell";
import type { BrandProfile, WebsiteProject } from "@/types/api";

function mapProjectRow(project: WebsiteProject, brand: BrandProfile | null): ProjectListItem {
  return {
    id: project.id,
    name: project.name,
    url: project.url,
    scrapeStatus: project.scrapeStatus ?? null,
    industry: brand?.industry ?? null,
  };
}

async function fetchEnrichedProjects(rows: WebsiteProject[]) {
  return Promise.all(
    rows.map(async (project) => {
      const brand = await apiFetch<BrandProfile | null>(
        `/api/website-projects/${project.id}/brand-profile`,
      ).catch(() => null);
      return mapProjectRow(project, brand);
    }),
  );
}

export function useProjectsData() {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: queryKeys.websiteProjects,
    queryFn: fetchWebsiteProjects,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  const enrichedQuery = useQuery({
    queryKey: queryKeys.projectsEnriched,
    queryFn: () => fetchEnrichedProjects(projectsQuery.data ?? []),
    enabled: (projectsQuery.data?.length ?? 0) > 0,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.websiteProjects });
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectsEnriched });
  }, [queryClient]);

  const projectRows = projectsQuery.data ?? [];
  const enrichedRows = enrichedQuery.data ?? [];

  return {
    loading:
      (projectsQuery.isPending && projectRows.length === 0) ||
      (enrichedQuery.isPending && enrichedRows.length === 0),
    error:
      projectsQuery.error instanceof Error
        ? projectsQuery.error.message
        : enrichedQuery.error instanceof Error
          ? enrichedQuery.error.message
          : projectsQuery.error || enrichedQuery.error
            ? "Failed to load projects"
            : null,
    projects: enrichedRows,
    quotaLabel: null,
    reload,
  };
}
