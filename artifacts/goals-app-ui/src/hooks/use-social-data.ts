import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { SocialMetricsResponse, SocialQueueItem, SocialQueueResponse } from "@workspace/app-shell";

type SocialDataState = {
  queue: SocialQueueItem[];
  queueLoading: boolean;
  queueError: string | null;
  metrics: SocialMetricsResponse | null;
  metricsLoading: boolean;
  metricsError: string | null;
  platformFilter: string;
  setPlatformFilter: (value: string) => void;
  reload: () => Promise<void>;
};

export function useSocialData(projectId: string | null): SocialDataState {
  const [queue, setQueue] = useState<SocialQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SocialMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState("all");

  const reload = useCallback(async () => {
    if (!projectId) {
      setQueue([]);
      setMetrics(null);
      setQueueError(null);
      setMetricsError(null);
      setQueueLoading(false);
      setMetricsLoading(false);
      return;
    }

    setQueueLoading(true);
    setMetricsLoading(true);
    setQueueError(null);
    setMetricsError(null);

    const platformQuery =
      platformFilter !== "all" ? `?platform=${encodeURIComponent(platformFilter)}` : "";

    const [queueResult, metricsResult] = await Promise.allSettled([
      apiFetch<SocialQueueResponse>(`/api/website-projects/${projectId}/social/queue${platformQuery}`),
      apiFetch<SocialMetricsResponse>(`/api/website-projects/${projectId}/social/metrics`),
    ]);

    if (queueResult.status === "fulfilled") {
      setQueue(queueResult.value.items);
    } else {
      setQueue([]);
      setQueueError(
        queueResult.reason instanceof Error
          ? queueResult.reason.message
          : "Failed to load social queue",
      );
    }

    if (metricsResult.status === "fulfilled") {
      setMetrics(metricsResult.value);
    } else {
      setMetrics(null);
      setMetricsError(
        metricsResult.reason instanceof Error
          ? metricsResult.reason.message
          : "Failed to load social metrics",
      );
    }

    setQueueLoading(false);
    setMetricsLoading(false);
  }, [projectId, platformFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    queue,
    queueLoading,
    queueError: queueError ?? metricsError,
    metrics,
    metricsLoading,
    metricsError,
    platformFilter,
    setPlatformFilter,
    reload,
  };
}
