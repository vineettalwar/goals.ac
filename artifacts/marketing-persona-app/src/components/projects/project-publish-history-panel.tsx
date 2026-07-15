"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  PublishHistoryPanel,
  contentPiecePath,
  type PublishHistoryRecord,
} from "@workspace/app-shell";

export function ProjectPublishHistoryPanel({ projectId }: { projectId: string }) {
  const [records, setRecords] = useState<PublishHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [load]);

  return (
    <PublishHistoryPanel
      records={records}
      loading={loading}
      error={error}
      pieceHref={(record) => contentPiecePath(record.websiteProjectId, record.contentPieceId)}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
      onRefresh={() => void load()}
    />
  );
}
