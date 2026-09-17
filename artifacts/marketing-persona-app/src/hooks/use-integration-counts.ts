"use client";

import { useQuery } from "@tanstack/react-query";
import {
  countCmsConnections,
  countEspConnections,
  countSocialConnections,
  type CmsConnectionSnapshot,
} from "@/lib/projects/publishing-destinations";
import type { SearchPropertyConnectionsResponse } from "@/lib/integrations/search/search-property-types";
import type { AnalyticsPropertyConnectionsResponse } from "@/lib/integrations/analytics/analytics-property-types";

export type IntegrationCounts = {
  cms: number;
  esp: number;
  social: number;
  search: number;
  total: number;
  loading: boolean;
};

function countSearchConnections(data: SearchPropertyConnectionsResponse | null): number {
  if (!data) return 0;
  return data.connections.filter((c) => c.connected && c.propertyVerified).length;
}

function countAnalyticsConnections(data: AnalyticsPropertyConnectionsResponse | null): number {
  if (!data) return 0;
  return data.connections.filter((c) => c.connected && c.propertyVerified).length;
}

async function fetchIntegrationCounts(projectId: string): Promise<Omit<IntegrationCounts, "loading">> {
  const [cmsRes, searchRes, analyticsRes] = await Promise.all([
    fetch(`/api/website-projects/${projectId}/cms-integrations`),
    fetch(`/api/website-projects/${projectId}/search-properties`),
    fetch(`/api/website-projects/${projectId}/analytics-properties`),
  ]);

  const cms = cmsRes.ok ? ((await cmsRes.json()) as CmsConnectionSnapshot) : {};
  const search = searchRes.ok
    ? ((await searchRes.json()) as SearchPropertyConnectionsResponse)
    : null;
  const analytics = analyticsRes.ok
    ? ((await analyticsRes.json()) as AnalyticsPropertyConnectionsResponse)
    : null;

  const cmsCount = countCmsConnections(cms);
  const espCount = countEspConnections(cms);
  const socialCount = countSocialConnections(cms);
  const searchCount = countSearchConnections(search) + countAnalyticsConnections(analytics);

  return {
    cms: cmsCount,
    esp: espCount,
    social: socialCount,
    search: searchCount,
    total: cmsCount + espCount + socialCount + searchCount,
  };
}

/** Cached across tab soft-nav remounts (staleTime matches app QueryClient default). */
export function useIntegrationCounts(projectId: string): IntegrationCounts {
  const query = useQuery({
    queryKey: ["integration-counts", projectId],
    queryFn: () => fetchIntegrationCounts(projectId),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  if (!projectId) {
    return { cms: 0, esp: 0, social: 0, search: 0, total: 0, loading: false };
  }

  return {
    cms: query.data?.cms ?? 0,
    esp: query.data?.esp ?? 0,
    social: query.data?.social ?? 0,
    search: query.data?.search ?? 0,
    total: query.data?.total ?? 0,
    loading: query.isLoading,
  };
}
