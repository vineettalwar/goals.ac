import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
import {
  countEspConnections,
  countSocialConnections,
  type CmsIntegrationRow,
  type SearchPropertyConnectionsResponse,
} from "@workspace/app-shell";

type IntegrationsData = {
  integrations: Record<string, CmsIntegrationRow>;
  searchProperties: SearchPropertyConnectionsResponse | null;
  searchError: string | null;
};

async function fetchIntegrationsData(projectId: string): Promise<IntegrationsData> {
  const [cmsResult, searchResult] = await Promise.allSettled([
    apiFetch<Record<string, CmsIntegrationRow>>(
      `/api/website-projects/${projectId}/cms-integrations`,
    ),
    apiFetch<SearchPropertyConnectionsResponse>(
      `/api/website-projects/${projectId}/search-properties`,
    ),
  ]);

  if (cmsResult.status === "rejected") {
    throw cmsResult.reason instanceof Error
      ? cmsResult.reason
      : new Error("Failed to load integrations");
  }

  return {
    integrations: cmsResult.value,
    searchProperties: searchResult.status === "fulfilled" ? searchResult.value : null,
    searchError:
      searchResult.status === "rejected"
        ? searchResult.reason instanceof Error
          ? searchResult.reason.message
          : "Failed to load search connections"
        : null,
  };
}

export function useIntegrationsData(projectId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.integrations(projectId),
    queryFn: () => fetchIntegrationsData(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const reload = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.integrations(projectId) });
  }, [projectId, queryClient]);

  const setIntegrations = useCallback(
    (value: Record<string, CmsIntegrationRow>) => {
      if (!projectId) return;
      queryClient.setQueryData<IntegrationsData>(queryKeys.integrations(projectId), (current) =>
        current ? { ...current, integrations: value } : { integrations: value, searchProperties: null, searchError: null },
      );
    },
    [projectId, queryClient],
  );

  const data = query.data;

  return {
    loading: query.isPending && !data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load integrations"
          : null,
    integrations: data?.integrations ?? {},
    searchProperties: data?.searchProperties ?? null,
    searchLoading: query.isPending && !data,
    searchError: data?.searchError ?? null,
    reload,
    setIntegrations,
    espCount: countEspConnections(data?.integrations ?? {}),
    socialCount: countSocialConnections(data?.integrations ?? {}),
  };
}
