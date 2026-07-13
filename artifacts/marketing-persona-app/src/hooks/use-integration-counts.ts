"use client";

import { useCallback, useEffect, useState } from "react";
import {
  countCmsConnections,
  countEspConnections,
  countSocialConnections,
  type CmsConnectionSnapshot,
} from "@/lib/publishing-destinations";
import type { SearchPropertyConnectionsResponse } from "@/lib/search-property-types";

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

export function useIntegrationCounts(projectId: string): IntegrationCounts {
  const [counts, setCounts] = useState<IntegrationCounts>({
    cms: 0,
    esp: 0,
    social: 0,
    search: 0,
    total: 0,
    loading: true,
  });

  const load = useCallback(async () => {
    if (!projectId) {
      setCounts({ cms: 0, esp: 0, social: 0, search: 0, total: 0, loading: false });
      return;
    }

    try {
      const [cmsRes, searchRes] = await Promise.all([
        fetch(`/api/website-projects/${projectId}/cms-integrations`),
        fetch(`/api/website-projects/${projectId}/search-properties`),
      ]);

      const cms = cmsRes.ok
        ? ((await cmsRes.json()) as CmsConnectionSnapshot)
        : {};
      const search = searchRes.ok
        ? ((await searchRes.json()) as SearchPropertyConnectionsResponse)
        : null;

      const cmsCount = countCmsConnections(cms);
      const espCount = countEspConnections(cms);
      const socialCount = countSocialConnections(cms);
      const searchCount = countSearchConnections(search);

      setCounts({
        cms: cmsCount,
        esp: espCount,
        social: socialCount,
        search: searchCount,
        total: cmsCount + espCount + socialCount + searchCount,
        loading: false,
      });
    } catch {
      setCounts((prev) => ({ ...prev, loading: false }));
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return counts;
}
