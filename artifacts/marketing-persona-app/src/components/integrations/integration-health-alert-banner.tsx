"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IntegrationHealthAlertBanner as IntegrationHealthAlertBannerView } from "@workspace/app-shell/integrations";
import { queryKeys } from "@/lib/queries/keys";
import { fetchIntegrationHealthAlerts } from "@/lib/queries/fetchers";
import { useActiveProject } from "@/context/use-active-project";

/**
 * App-wide banner surfacing open integration health alerts for the active
 * project (a connection that just flipped from healthy/unknown to failing).
 * Rendered from the app shell layout so it's visible everywhere, not just
 * on the Integrations settings page.
 */
export function IntegrationHealthAlertBannerContainer() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  const { data: alerts = [] } = useQuery({
    queryKey: activeProjectId
      ? queryKeys.integrationHealthAlerts(activeProjectId)
      : ["integration-health-alerts", "none"],
    queryFn: () => fetchIntegrationHealthAlerts(activeProjectId!),
    enabled: activeProjectId != null,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (!activeProjectId || alerts.length === 0) return null;

  async function handleDismiss(alertId: number) {
    if (!activeProjectId) return;
    setDismissingId(alertId);
    try {
      await fetch(`/api/website-projects/${activeProjectId}/integration-health-alerts/${alertId}`, {
        method: "PATCH",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.integrationHealthAlerts(activeProjectId),
      });
    } finally {
      setDismissingId(null);
    }
  }

  return (
    <IntegrationHealthAlertBannerView
      alerts={alerts}
      reconnectHref="/integrations/ai"
      onDismiss={(id) => void handleDismiss(id)}
      dismissingId={dismissingId}
    />
  );
}
