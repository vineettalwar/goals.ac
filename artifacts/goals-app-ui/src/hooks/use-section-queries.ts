import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { fetchProjectContentPieces } from "@/lib/queries/fetchers";
import { queryKeys } from "@/lib/queries/keys";
import type { GrowthRoadmap } from "@workspace/app-shell";
import type { CmsIntegrationRow } from "@workspace/app-shell";

export function useGoalsData(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.goals(projectId),
    queryFn: async () => {
      const data = await apiFetch<{
        goals: Array<{ id: number; objective: string; status: string; targetMetric: string }>;
      }>(`/api/goals?projectId=${projectId}`);
      return data.goals ?? [];
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    goals: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load goals"
          : null,
  };
}

export function useCalendarPieces(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.contentPieces(projectId),
    queryFn: () => fetchProjectContentPieces(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    pieces: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load calendar"
          : null,
  };
}

export function useRoadmapsCatalog(limit = 20) {
  const query = useQuery({
    queryKey: queryKeys.roadmaps(limit),
    queryFn: async () => {
      const data = await apiFetch<{
        roadmaps: Array<{ id: number; slug: string; industry: string; location: string; stage: string }>;
      }>(`/api/roadmaps?limit=${limit}`);
      return data.roadmaps ?? [];
    },
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    roadmaps: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load roadmaps"
          : null,
  };
}

export function useBrandKeywords(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.brandKeywords(projectId),
    queryFn: async () => {
      const profile = await apiFetch<{ primaryKeywords?: string[] } | null>(
        `/api/website-projects/${projectId}/brand-profile`,
      );
      return profile?.primaryKeywords ?? [];
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    keywords: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load brand profile"
          : null,
  };
}

export function useTrackedKeywords(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.trackedKeywords(projectId),
    queryFn: async () => {
      const data = await apiFetch<{
        trackedKeywords?: Array<{
          id: number;
          keyword: string;
          isActive: boolean;
          latestSnapshot?: { position?: number | null } | null;
        }>;
        keywords?: Array<{
          id: number;
          keyword: string;
          isActive: boolean;
          latestSnapshot?: { position?: number | null } | null;
        }>;
      }>(`/api/tracked-keywords?projectId=${projectId}`);
      return data.trackedKeywords ?? data.keywords ?? [];
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    keywords: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load keywords"
          : null,
    refetch: query.refetch,
  };
}

export function useKeywordIntelligence(projectId: string | null) {
  const opportunitiesQuery = useKeywordOpportunities(projectId);
  const alertsQuery = useQuery({
    queryKey: queryKeys.keywordAlerts(projectId),
    queryFn: async () => {
      const data = await apiFetch<{
        alerts: Array<{ id: number; keyword: string; message: string }>;
      }>(`/api/website-projects/${projectId}/keyword-alerts`);
      return data.alerts ?? [];
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  return {
    opportunities: opportunitiesQuery.opportunities,
    alerts: alertsQuery.data ?? [],
    isLoading: opportunitiesQuery.loading || alertsQuery.isPending,
    refetch: async () => {
      await Promise.all([opportunitiesQuery.refetch(), alertsQuery.refetch()]);
    },
  };
}

export function useKeywordSnapshots(trackedId: number | null) {
  const query = useQuery({
    queryKey: queryKeys.keywordSnapshots(trackedId),
    queryFn: async () => {
      const data = await apiFetch<{
        snapshots: Array<{ checkedAt: string; position: number | null }>;
      }>(`/api/tracked-keywords/${trackedId}/snapshots`);
      return data.snapshots ?? [];
    },
    enabled: trackedId != null,
    staleTime: 30_000,
  });

  return {
    snapshots: query.data ?? [],
    loading: query.isPending && !query.data,
  };
}

export function useGscQueries(projectId: string | null, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.gscQueries(projectId),
    queryFn: async () => {
      const data = await apiFetch<{
        queries: Array<{
          query: string;
          impressions: number;
          clicks: number;
          ctr: number;
          position: number;
        }>;
      }>(`/api/website-projects/${projectId}/gsc-queries?limit=200`);
      return data.queries ?? [];
    },
    enabled: Boolean(projectId) && enabled,
    staleTime: 60_000,
  });

  return {
    queries: query.data ?? [],
    loading: query.isPending && !query.data,
  };
}

export function useSemrushStatus(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.semrushStatus(projectId),
    queryFn: async () => {
      try {
        return await apiFetch<{
          configured?: boolean;
          database?: string | null;
          primaryLanguage?: string;
          primaryLanguageLabel?: string;
          databaseMismatch?: boolean;
        }>(`/api/website-projects/${projectId}/semrush/status`);
      } catch {
        return { configured: false };
      }
    },
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  return {
    status: query.data ?? null,
    loading: query.isPending && !query.data,
    isFetching: query.isFetching,
  };
}

export function useArticleIdeasImports(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.articleIdeas(projectId),
    queryFn: async () => {
      const data = await apiFetch<{
        imports: Array<{
          id: number;
          source?: string;
          sourceType?: string;
          rowCount: number;
          createdAt: string;
        }>;
      }>(`/api/website-projects/${projectId}/article-ideas`);
      return (data.imports ?? []).map((row) => ({
        id: row.id,
        source: row.source ?? row.sourceType ?? "import",
        rowCount: row.rowCount,
        createdAt: row.createdAt,
      }));
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  return {
    imports: query.data ?? [],
    loading: query.isPending && !query.data,
    refetch: query.refetch,
  };
}

export function useArticleIdeaSources(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.articleIdeaSources(projectId),
    queryFn: async () => {
      const data = await apiFetch<{
        sources: Array<{
          id: number;
          label: string;
          spreadsheetId: string;
          sheetName: string | null;
          connected: boolean;
          syncStatus: string;
          rowCount: number;
          lastSyncedAt: string | null;
          syncError: string | null;
        }>;
      }>(`/api/website-projects/${projectId}/article-idea-sources`);
      return data.sources ?? [];
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  return {
    sources: query.data ?? [],
    loading: query.isPending && !query.data,
    refetch: query.refetch,
  };
}

export function useVisibilitySettings(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.visibilitySettings(projectId),
    queryFn: () =>
      apiFetch<Record<string, unknown>>(`/api/website-projects/${projectId}/visibility-settings`),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    settings: query.data ?? null,
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load visibility"
          : null,
  };
}

export function useKeywordOpportunities(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.keywordOpportunities(projectId),
    queryFn: async () => {
      const data = await apiFetch<{
        opportunities: Array<{
          id: number;
          keyword: string;
          source: string;
          opportunityScore: number;
          difficulty?: string | null;
          suggestedTitle: string;
          suggestedAngle: string;
          estimatedVolume?: string | null;
          linkedContentPieceId?: number | null;
        }>;
      }>(`/api/website-projects/${projectId}/keyword-opportunities?status=open`);
      return data.opportunities ?? [];
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    opportunities: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load opportunities"
          : null,
    refetch: query.refetch,
  };
}

export function useCompetitorAnalyses(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.competitorAnalyses(projectId),
    queryFn: async () => {
      const { flattenCompetitorAnalysisList } = await import("@workspace/app-shell");
      const data = await apiFetch(`/api/competitor-analysis?projectId=${projectId}`);
      return flattenCompetitorAnalysisList(data);
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    analyses: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load analyses"
          : null,
    reload: () => query.refetch(),
  };
}

export function useHelpChecklist(projectId: string | null) {
  const query = useQuery({
    queryKey: ["help-checklist", projectId],
    queryFn: async () => {
      const [integrationsResult, piecesResult] = await Promise.allSettled([
        apiFetch<Record<string, CmsIntegrationRow>>(
          `/api/website-projects/${projectId}/cms-integrations`,
        ),
        fetchProjectContentPieces(projectId!),
      ]);

      const hasCmsIntegration =
        integrationsResult.status === "fulfilled" &&
        Object.values(integrationsResult.value).some((row) => row?.connected);

      const hasContentPiece =
        piecesResult.status === "fulfilled" && piecesResult.value.length > 0;

      return { hasCmsIntegration, hasContentPiece };
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    hasCmsIntegration: query.data?.hasCmsIntegration ?? false,
    hasContentPiece: query.data?.hasContentPiece ?? false,
    loading: query.isPending && !query.data,
  };
}

export function useGrowthRoadmap(slug: string) {
  const query = useQuery({
    queryKey: queryKeys.growthRoadmap(slug),
    queryFn: async () => {
      const data = await apiFetch<{ roadmaps: GrowthRoadmap[] }>("/api/roadmaps?limit=50");
      return (data.roadmaps ?? []).find((row) => row.slug === slug) ?? null;
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    roadmap: query.data ?? null,
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load roadmap"
          : null,
  };
}

export function useBriefsData(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.briefs(projectId),
    queryFn: async () => {
      const data = await apiFetch<{
        briefs: Array<{
          id: number;
          workingTitle: string;
          targetKeywordCluster?: string | null;
          status: string;
        }>;
      }>(`/api/briefs?projectId=${projectId}`);
      return data.briefs ?? [];
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    briefs: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load briefs"
          : null,
    refetch: query.refetch,
  };
}

export function useVisibilitySummary(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.visibilitySummary(projectId),
    queryFn: () =>
      apiFetch<Record<string, unknown>>(`/api/website-projects/${projectId}/visibility`),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    summary: query.data ?? null,
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load visibility summary"
          : null,
    refetch: query.refetch,
  };
}

export function useGscSyncStatus(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.gscSyncStatus(projectId),
    queryFn: async () => {
      try {
        return await apiFetch<{
          connected: boolean;
          propertyVerified?: boolean;
          queryCount?: number;
          lastSyncedAt?: string | null;
        }>(`/api/website-projects/${projectId}/search-properties/gsc/sync-status`);
      } catch {
        return { connected: false };
      }
    },
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  return { gscStatus: query.data ?? null, isFetching: query.isFetching };
}

export function useArticlePerformance(
  projectId: string | null,
  startDate: string,
  endDate: string,
) {
  const query = useQuery({
    queryKey: queryKeys.articlePerformance(projectId, startDate, endDate),
    queryFn: async () => {
      const qs = new URLSearchParams({ startDate, endDate });
      return apiFetch<{
        articles: Array<{
          id: number;
          title: string;
          status: string;
          publishedUrl?: string | null;
          sessions?: number;
          clicks?: number;
          ctr?: number;
          avgSessionDuration?: number;
        }>;
        ga4Connected?: boolean;
        gscConnected?: boolean;
      }>(`/api/website-projects/${projectId}/article-performance?${qs.toString()}`);
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load performance"
          : null,
    refetch: query.refetch,
  };
}

export function usePartnerProjects() {
  const query = useQuery({
    queryKey: queryKeys.partnerProjects,
    queryFn: async () => {
      const data = await apiFetch<{
        projects: Array<{
          id: number;
          name: string;
          url: string | null;
          visibilityScore: number;
          visibilityDelta: number | null;
          geoScore: number | null;
          linkCoverage: number;
          publishedCount: number;
          draftCount: number;
        }>;
      }>("/api/partner/projects");
      return data.projects ?? [];
    },
    staleTime: 60_000,
  });

  return {
    projects: query.data ?? [],
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load partner projects"
          : null,
  };
}
