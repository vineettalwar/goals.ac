import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AutopilotSettings, AutopilotSettingsSavePayload } from "@workspace/app-shell";

type AutopilotLoadState = {
  loading: boolean;
  error: string | null;
  settings: AutopilotSettings | null;
  saving: boolean;
};

export function useAutopilotData(projectId: string | null) {
  const [state, setState] = useState<AutopilotLoadState>({
    loading: true,
    error: null,
    settings: null,
    saving: false,
  });

  const loadSettings = useCallback(async (id: string, cancelled?: () => boolean) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const settings = await apiFetch<AutopilotSettings>(
        `/api/website-projects/${id}/autopilot-settings`,
      );
      if (!cancelled?.()) {
        setState((prev) => ({ ...prev, loading: false, error: null, settings }));
      }
    } catch (err) {
      if (!cancelled?.()) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load autopilot settings",
          settings: null,
        }));
      }
    }
  }, []);

  useEffect(() => {
    if (!projectId) {
      setState({ loading: false, error: null, settings: null, saving: false });
      return;
    }

    let cancelled = false;
    void loadSettings(projectId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [projectId, loadSettings]);

  const saveSettings = useCallback(
    async (payload: AutopilotSettingsSavePayload) => {
      if (!projectId) return;

      setState((prev) => ({ ...prev, saving: true, error: null }));
      try {
        const settings = await apiFetch<AutopilotSettings>(
          `/api/website-projects/${projectId}/autopilot-settings`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        setState((prev) => ({ ...prev, saving: false, error: null, settings }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: err instanceof Error ? err.message : "Failed to save autopilot settings",
        }));
        throw err;
      }
    },
    [projectId],
  );

  return { ...state, saveSettings };
}
