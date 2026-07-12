"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import {
  fetchBriefs,
  fetchCompanyId,
  fetchGoals,
  fetchKeywordAlerts,
  fetchKeywordOpportunities,
  fetchKeywordSnapshots,
  fetchProjectContent,
  fetchRoadmapsCatalog,
  fetchTrackedKeywords,
  fetchVisibilitySettings,
  fetchVisibilitySummary,
  fetchWebsiteProject,
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
    placeholderData: keepPreviousData,
  });
}

export function useBriefs(projectId: string) {
  return useQuery({
    queryKey: queryKeys.briefs(projectId),
    queryFn: () => fetchBriefs(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useTrackedKeywords(projectId: string) {
  return useQuery({
    queryKey: queryKeys.trackedKeywords(projectId),
    queryFn: () => fetchTrackedKeywords(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useKeywordIntelligence(projectId: string) {
  const opportunities = useQuery({
    queryKey: queryKeys.keywordOpportunities(projectId),
    queryFn: () => fetchKeywordOpportunities(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });

  const alerts = useQuery({
    queryKey: queryKeys.keywordAlerts(projectId),
    queryFn: () => fetchKeywordAlerts(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });

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
    placeholderData: keepPreviousData,
  });
}

export function useProjectContent(projectId: string | number | null) {
  const id = projectId != null ? String(projectId) : "";
  return useQuery({
    queryKey: queryKeys.projectContent(id),
    queryFn: () => fetchProjectContent(id),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export function useVisibilityData(projectId: string) {
  const settings = useQuery({
    queryKey: queryKeys.visibilitySettings(projectId),
    queryFn: () => fetchVisibilitySettings(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });

  const summary = useQuery({
    queryKey: queryKeys.visibilitySummary(projectId),
    queryFn: () => fetchVisibilitySummary(projectId),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
  });
}
