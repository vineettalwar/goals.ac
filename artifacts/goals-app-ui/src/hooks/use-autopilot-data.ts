import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
import type { AutopilotSettings, AutopilotSettingsSavePayload } from "@workspace/app-shell";

export function useAutopilotData(projectId: string | null) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.autopilot(projectId),
    queryFn: () =>
      apiFetch<AutopilotSettings>(`/api/website-projects/${projectId}/autopilot-settings`),
    enabled: Boolean(projectId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const saveSettings = useCallback(
    async (payload: AutopilotSettingsSavePayload) => {
      if (!projectId) return;

      setSaving(true);
      setSaveError(null);
      try {
        const settings = await apiFetch<AutopilotSettings>(
          `/api/website-projects/${projectId}/autopilot-settings`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        queryClient.setQueryData(queryKeys.autopilot(projectId), settings);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save autopilot settings";
        setSaveError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [projectId, queryClient],
  );

  return {
    loading: query.isPending && !query.data,
    error:
      saveError ??
      (query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load autopilot settings"
          : null),
    settings: query.data ?? null,
    saving,
    saveSettings,
  };
}
