"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./keys";

export { queryKeys };
import {
  fetchAdminOrganizations,
  fetchArticlePerformance,
  fetchBrandProfile,
  fetchBriefs,
  fetchCmsIntegrations,
  fetchCompanyId,
  fetchCompetitorContext,
  fetchGscQueries,
  fetchGscSyncStatus,
  fetchGoals,
  fetchInternalLinks,
  fetchKeywordAlerts,
  fetchKeywordOpportunities,
  fetchKeywordSnapshots,
  fetchMetaPages,
  fetchOrgSecuritySettings,
  fetchPlatformSettings,
  fetchProjectContent,
  fetchRoadmapsCatalog,
  fetchRoadmapFormOptions,
  fetchSemrushStatus,
  fetchStockImageStatus,
  fetchTrackedKeywords,
  fetchVisibilitySettings,
  fetchVisibilitySummary,
  fetchWebsiteProject,
  generateOnboardingPersonas,
} from "./fetchers";

export function useCompany() {
  return useQuery({
    queryKey: queryKeys.company,
    queryFn: fetchCompanyId,
    staleTime: 60_000,
  });
}

export function useGoals(projectId: string) {
  return useQuery({
    queryKey: queryKeys.goals(projectId),
    queryFn: () => fetchGoals(projectId),
    enabled: Boolean(projectId),
  });
}

export function useBriefs(projectId: string) {
  return useQuery({
    queryKey: queryKeys.briefs(projectId),
    queryFn: () => fetchBriefs(projectId),
    enabled: Boolean(projectId),
  });
}

export function useTrackedKeywords(projectId: string) {
  return useQuery({
    queryKey: queryKeys.trackedKeywords(projectId),
    queryFn: () => fetchTrackedKeywords(projectId),
    enabled: Boolean(projectId),
  });
}

export function useKeywordAlerts(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.keywordAlerts(projectId),
    queryFn: () => fetchKeywordAlerts(projectId),
    enabled: enabled && Boolean(projectId),
  });
}

export function useKeywordIntelligence(projectId: string) {
  const opportunities = useQuery({
    queryKey: queryKeys.keywordOpportunities(projectId),
    queryFn: () => fetchKeywordOpportunities(projectId),
    enabled: Boolean(projectId),
  });

  const alerts = useKeywordAlerts(projectId);

  return {
    opportunities: opportunities.data ?? [],
    alerts: alerts.data ?? [],
    isLoading: opportunities.isLoading || alerts.isLoading,
    isFetching: opportunities.isFetching || alerts.isFetching,
    refetch: () => Promise.all([opportunities.refetch(), alerts.refetch()]),
  };
}

export function useKeywordSnapshots(trackedId: number | null) {
  return useQuery({
    queryKey: queryKeys.keywordSnapshots(trackedId ?? 0),
    queryFn: () => fetchKeywordSnapshots(trackedId!),
    enabled: trackedId != null,
  });
}

export function useProjectContent(projectId: string | number | null) {
  const id = projectId != null ? String(projectId) : "";
  return useQuery({
    queryKey: queryKeys.projectContent(id),
    queryFn: () => fetchProjectContent(id),
    enabled: Boolean(id),
  });
}

export function useVisibilityData(projectId: string) {
  const settings = useQuery({
    queryKey: queryKeys.visibilitySettings(projectId),
    queryFn: () => fetchVisibilitySettings(projectId),
    enabled: Boolean(projectId),
  });

  const summary = useQuery({
    queryKey: queryKeys.visibilitySummary(projectId),
    queryFn: () => fetchVisibilitySummary(projectId),
    enabled: Boolean(projectId),
  });

  return { settings, summary };
}

export function useRoadmapsCatalog(enabled = true) {
  return useQuery({
    queryKey: queryKeys.roadmapsCatalog,
    queryFn: fetchRoadmapsCatalog,
    staleTime: 60_000,
    enabled,
  });
}

export function useWebsiteProject(projectId: string | number | null) {
  const id = projectId != null ? String(projectId) : "";
  return useQuery({
    queryKey: queryKeys.websiteProject(id),
    queryFn: () => fetchWebsiteProject(id),
    enabled: Boolean(id),
  });
}

export function useInternalLinks(projectId: string | number | null) {
  const id = projectId != null ? String(projectId) : "";
  return useQuery({
    queryKey: queryKeys.internalLinks(id),
    queryFn: () => fetchInternalLinks(id),
    enabled: Boolean(id),
  });
}

export function useOrgSecuritySettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orgSecurity,
    queryFn: fetchOrgSecuritySettings,
    enabled,
    staleTime: 60_000,
  });
}

export function useAdminOrganizations() {
  return useQuery({
    queryKey: queryKeys.adminOrganizations,
    queryFn: fetchAdminOrganizations,
    staleTime: 60_000,
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: fetchPlatformSettings,
  });
}

export function useBrandProfile(projectId: string) {
  return useQuery({
    queryKey: queryKeys.brandProfile(projectId),
    queryFn: () => fetchBrandProfile(projectId),
    enabled: Boolean(projectId),
  });
}

export function useArticlePerformance(
  projectId: string,
  startDate: string,
  endDate: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.articlePerformance(projectId, startDate, endDate),
    queryFn: () => fetchArticlePerformance(projectId, startDate, endDate),
    enabled: enabled && Boolean(projectId),
    staleTime: 60_000,
  });
}

export function useGscSyncStatus(projectId: string) {
  return useQuery({
    queryKey: queryKeys.gscSyncStatus(projectId),
    queryFn: () => fetchGscSyncStatus(projectId),
    enabled: Boolean(projectId),
  });
}

export function useSemrushStatus(projectId: string) {
  return useQuery({
    queryKey: queryKeys.semrushStatus(projectId),
    queryFn: () => fetchSemrushStatus(projectId),
    enabled: Boolean(projectId),
  });
}

export function useGscQueries(
  projectId: string,
  enabled = true,
  range?: { startDate: string; endDate: string },
) {
  return useQuery({
    queryKey: queryKeys.gscQueries(projectId, range),
    queryFn: () => fetchGscQueries(projectId, 200, range),
    enabled: enabled && Boolean(projectId),
  });
}

export function useCmsIntegrations(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cmsIntegrations(projectId),
    queryFn: () => fetchCmsIntegrations(projectId),
    enabled: enabled && Boolean(projectId),
  });
}

export function useCompetitorContext(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.competitorContext(projectId),
    queryFn: () => fetchCompetitorContext(projectId),
    enabled: enabled && Boolean(projectId),
  });
}

export function useRoadmapFormOptions() {
  return useQuery({
    queryKey: queryKeys.roadmapFormOptions,
    queryFn: fetchRoadmapFormOptions,
    staleTime: 60_000,
  });
}

export function useStockImageStatus() {
  return useQuery({
    queryKey: queryKeys.stockImageStatus,
    queryFn: fetchStockImageStatus,
    staleTime: 60_000,
  });
}

export function useMetaPages(token: string | null) {
  return useQuery({
    queryKey: queryKeys.metaPages(token ?? ""),
    queryFn: () => fetchMetaPages(token!),
    enabled: Boolean(token),
  });
}

export function useOnboardingPersonas(companyId: string | null) {
  return useQuery({
    queryKey: queryKeys.onboardingPersonas(companyId ?? ""),
    queryFn: () => generateOnboardingPersonas(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  });
}
