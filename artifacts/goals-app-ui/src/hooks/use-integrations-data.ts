import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CmsIntegrationRow } from "@workspace/app-shell";

type IntegrationsLoadState = {
  loading: boolean;
  error: string | null;
  integrations: Record<string, CmsIntegrationRow>;
  reload: () => Promise<void>;
  setIntegrations: (value: Record<string, CmsIntegrationRow>) => void;
};

export function useIntegrationsData(projectId: string | null): IntegrationsLoadState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, CmsIntegrationRow>>({});

  const reload = useCallback(async () => {
    if (!projectId) {
      setIntegrations({});
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await apiFetch<Record<string, CmsIntegrationRow>>(
        `/api/website-projects/${projectId}/cms-integrations`,
      );
      setIntegrations(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, integrations, reload, setIntegrations };
}
