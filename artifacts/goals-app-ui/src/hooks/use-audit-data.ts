import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { GeoAuditDetail, GeoAuditListItem } from "@workspace/app-shell";

type AuditListState = {
  loading: boolean;
  error: string | null;
  audits: GeoAuditListItem[];
};

type AuditDetailState = {
  loading: boolean;
  error: string | null;
  audit: GeoAuditDetail | null;
};

export function useAuditListData(projectId?: string | null) {
  const [state, setState] = useState<AuditListState>({
    loading: true,
    error: null,
    audits: [],
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const query = projectId ? `?projectId=${projectId}` : "";
        const data = await apiFetch<{ audits: GeoAuditListItem[] }>(`/api/geo-audits${query}`);
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            audits: data.audits ?? [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load audits",
            audits: [],
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return state;
}

export function useAuditDetailData(auditId: string) {
  const [state, setState] = useState<AuditDetailState>({
    loading: true,
    error: null,
    audit: null,
  });

  useEffect(() => {
    if (!auditId) {
      setState({ loading: false, error: "Invalid audit id", audit: null });
      return;
    }

    let cancelled = false;

    void (async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const audit = await apiFetch<GeoAuditDetail>(`/api/geo-audits/${auditId}`);
        if (!cancelled) {
          setState({ loading: false, error: null, audit });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load audit",
            audit: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auditId]);

  return state;
}
