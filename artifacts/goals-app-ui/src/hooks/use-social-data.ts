import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
import type { SocialMetricsResponse, SocialQueueItem, SocialQueueResponse } from "@workspace/app-shell";

type SocialData = {
  queue: SocialQueueItem[];
  metrics: SocialMetricsResponse | null;
  queueError: string | null;
  metricsError: string | null;
};

async function fetchSocialData(
  projectId: string,
  platformFilter: string,
): Promise<SocialData> {
  const platformQuery =
    platformFilter !== "all" ? `?platform=${encodeURIComponent(platformFilter)}` : "";

  const [queueResult, metricsResult] = await Promise.allSettled([
    apiFetch<SocialQueueResponse>(`/api/website-projects/${projectId}/social/queue${platformQuery}`),
    apiFetch<SocialMetricsResponse>(`/api/website-projects/${projectId}/social/metrics`),
  ]);

  return {
    queue: queueResult.status === "fulfilled" ? queueResult.value.items : [],
    metrics: metricsResult.status === "fulfilled" ? metricsResult.value : null,
    queueError:
      queueResult.status === "rejected"
        ? queueResult.reason instanceof Error
          ? queueResult.reason.message
          : "Failed to load social queue"
        : null,
    metricsError:
      metricsResult.status === "rejected"
        ? metricsResult.reason instanceof Error
          ? metricsResult.reason.message
          : "Failed to load social metrics"
        : null,
  };
}

export function useSocialData(projectId: string | null) {
  const queryClient = useQueryClient();
  const [platformFilter, setPlatformFilter] = useState("all");

  const query = useQuery({
    queryKey: queryKeys.social(projectId, platformFilter),
    queryFn: () => fetchSocialData(projectId!, platformFilter),
    enabled: Boolean(projectId),
    staleTime: 15_000,
    placeholderData: (previousData) => previousData,
  });

  const reload = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.social(projectId, platformFilter) });
  }, [projectId, platformFilter, queryClient]);

  const data = query.data;

  return {
    queue: data?.queue ?? [],
    queueLoading: query.isPending && !data,
    queueError: data?.queueError ?? data?.metricsError ?? null,
    metrics: data?.metrics ?? null,
    metricsLoading: query.isPending && !data,
    metricsError: data?.metricsError ?? null,
    platformFilter,
    setPlatformFilter,
    reload,
  };
}
