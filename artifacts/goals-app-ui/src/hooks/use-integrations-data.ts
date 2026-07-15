import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  CmsIntegrationRow,
  SearchPropertyConnectionsResponse,
} from "@workspace/app-shell";

type IntegrationsLoadState = {
  loading: boolean;
  error: string | null;
  integrations: Record<string, CmsIntegrationRow>;
  searchProperties: SearchPropertyConnectionsResponse | null;
  searchLoading: boolean;
  searchError: string | null;
  reload: () => Promise<void>;
  setIntegrations: (value: Record<string, CmsIntegrationRow>) => void;
};

export function useIntegrationsData(projectId: string | null): IntegrationsLoadState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, CmsIntegrationRow>>({});
  const [searchProperties, setSearchProperties] = useState<SearchPropertyConnectionsResponse | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) {
      setIntegrations({});
      setSearchProperties(null);
      setError(null);
      setSearchError(null);
      setLoading(false);
      setSearchLoading(false);
      return;
    }

    setLoading(true);
    setSearchLoading(true);
    setError(null);
    setSearchError(null);

    const [cmsResult, searchResult] = await Promise.allSettled([
      apiFetch<Record<string, CmsIntegrationRow>>(
        `/api/website-projects/${projectId}/cms-integrations`,
      ),
      apiFetch<SearchPropertyConnectionsResponse>(
        `/api/website-projects/${projectId}/search-properties`,
      ),
    ]);

    if (cmsResult.status === "fulfilled") {
      setIntegrations(cmsResult.value);
    } else {
      setError(
        cmsResult.reason instanceof Error
          ? cmsResult.reason.message
          : "Failed to load integrations",
      );
    }

    if (searchResult.status === "fulfilled") {
      setSearchProperties(searchResult.value);
    } else {
      setSearchProperties(null);
      setSearchError(
        searchResult.reason instanceof Error
          ? searchResult.reason.message
          : "Failed to load search connections",
      );
    }

    setLoading(false);
    setSearchLoading(false);
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    error,
    integrations,
    searchProperties,
    searchLoading,
    searchError,
    reload,
    setIntegrations,
  };
};
