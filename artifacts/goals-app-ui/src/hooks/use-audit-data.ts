import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
import type { GeoAuditDetail, GeoAuditListItem } from "@workspace/app-shell";

export function useAuditListData(projectId?: string | null) {
  const query = useQuery({
    queryKey: queryKeys.auditList(projectId),
    queryFn: async () => {
      const queryParam = projectId ? `?projectId=${projectId}` : "";
      const data = await apiFetch<{ audits: GeoAuditListItem[] }>(`/api/geo-audits${queryParam}`);
      return data.audits ?? [];
    },
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load audits"
          : null,
    audits: query.data ?? [],
    reload: query.refetch,
  };
}

export function useAuditDetailData(auditId: string) {
  const query = useQuery({
    queryKey: queryKeys.auditDetail(auditId),
    queryFn: () => apiFetch<GeoAuditDetail>(`/api/geo-audits/${auditId}`),
    enabled: Boolean(auditId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  return {
    loading: query.isPending && !query.data,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Failed to load audit"
          : null,
    audit: query.data ?? null,
  };
}
