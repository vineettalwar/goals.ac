"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  PublishHistoryPanel,
  type PublishHistoryRecord,
} from "@workspace/app-shell/integrations";
import { contentPiecePath } from "@workspace/app-shell/project-paths";
import {
  type GscUrlInspection,
  buildInspectionUrlMap,
  fetchGscInspections,
  triggerGscInspection,
} from "@/lib/gsc/gsc-inspection-client";

function toSummary(insp: GscUrlInspection): PublishHistoryRecord["gscInspection"] {
  return {
    verdict: insp.verdict,
    coverageState: insp.coverageState,
    indexingState: insp.indexingState,
    inspectedAt: insp.inspectedAt,
  };
}

export function ProjectPublishHistoryPanel({ projectId }: { projectId: string }) {
  const [records, setRecords] = useState<PublishHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspections, setInspections] = useState<GscUrlInspection[]>([]);
  const [inspecting, setInspecting] = useState<Set<number>>(new Set());

  const loadInspections = useCallback(async () => {
    const rows = await fetchGscInspections(projectId);
    setInspections(rows);
  }, [projectId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/publish-records`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load publish history");
      }
      const data = (await res.json()) as { records?: PublishHistoryRecord[] };
      setRecords(data.records ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load publish history");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    void loadInspections();
  }, [load, loadInspections]);

  // Join inspection data onto records by remoteUrl
  const urlMap = buildInspectionUrlMap(inspections);
  const enrichedRecords: PublishHistoryRecord[] = records.map((r) => {
    if (!r.remoteUrl) return r;
    const insp = urlMap.get(r.remoteUrl);
    return insp ? { ...r, gscInspection: toSummary(insp) } : r;
  });

  const handleInspect = useCallback(
    async (record: PublishHistoryRecord) => {
      if (!record.remoteUrl || inspecting.has(record.id)) return;
      setInspecting((prev) => new Set(prev).add(record.id));
      try {
        await triggerGscInspection(projectId, {
          url: record.remoteUrl,
          contentPieceId: record.contentPieceId,
          publishRecordId: record.id,
        });
        await new Promise((r) => setTimeout(r, 800));
        await loadInspections();
      } finally {
        setInspecting((prev) => {
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });
      }
    },
    [projectId, inspecting, loadInspections],
  );

  return (
    <PublishHistoryPanel
      records={enrichedRecords}
      loading={loading}
      error={error}
      pieceHref={(record) => contentPiecePath(record.websiteProjectId, record.contentPieceId)}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
      onRefresh={() => {
        void load();
        void loadInspections();
      }}
      onInspect={(record) => void handleInspect(record)}
      inspecting={inspecting}
    />
  );
}
