"use client";

import { useMemo } from "react";
import { BarChart3, MousePointerClick } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useArticlePerformance } from "@/lib/queries";

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 27);
  return { startDate: formatYmd(start), endDate: formatYmd(end) };
}

export function ArticlePerformanceBadge({
  projectId,
  contentPieceId,
  publishedUrl,
}: {
  projectId: string;
  contentPieceId: number;
  publishedUrl?: string | null;
}) {
  const { startDate, endDate } = defaultDateRange();
  const { data, isLoading: loading } = useArticlePerformance(
    projectId,
    startDate,
    endDate,
    Boolean(publishedUrl && projectId),
  );

  const metrics = useMemo(() => {
    if (!data) return null;
    const article = data.articles.find((row) => row.contentPieceId === contentPieceId);
    if (!article) return null;
    return {
      sessions: article.ga4.sessions,
      clicks: article.gsc.clicks,
    };
  }, [data, contentPieceId]);

  if (!publishedUrl) return null;

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Spinner size="sm" />
      </span>
    );
  }

  if (!metrics || (metrics.sessions === 0 && metrics.clicks === 0)) return null;

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {metrics.sessions > 0 ? (
        <span className="inline-flex items-center gap-1" title="GA4 sessions (last 28 days)">
          <BarChart3 className="h-3 w-3" />
          {metrics.sessions.toLocaleString()}
        </span>
      ) : null}
      {metrics.clicks > 0 ? (
        <span className="inline-flex items-center gap-1" title="GSC clicks (last 28 days)">
          <MousePointerClick className="h-3 w-3" />
          {metrics.clicks.toLocaleString()}
        </span>
      ) : null}
    </span>
  );
}
