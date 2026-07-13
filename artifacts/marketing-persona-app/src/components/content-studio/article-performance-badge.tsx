"use client";

import { useEffect, useState } from "react";
import { BarChart3, MousePointerClick } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { ArticlePerformanceResponse } from "@/lib/analytics-property-types";

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

const cache = new Map<string, Promise<ArticlePerformanceResponse>>();

function fetchProjectPerformance(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<ArticlePerformanceResponse> {
  const key = `${projectId}:${startDate}:${endDate}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const qs = new URLSearchParams({ startDate, endDate });
  const promise = fetch(`/api/website-projects/${projectId}/article-performance?${qs}`)
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to load performance");
      return res.json() as Promise<ArticlePerformanceResponse>;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, promise);
  return promise;
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
  const [metrics, setMetrics] = useState<{ sessions: number; clicks: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publishedUrl || !projectId) {
      setMetrics(null);
      return;
    }

    const { startDate, endDate } = defaultDateRange();
    let cancelled = false;
    setLoading(true);

    void fetchProjectPerformance(projectId, startDate, endDate)
      .then((data) => {
        if (cancelled) return;
        const article = data.articles.find((row) => row.contentPieceId === contentPieceId);
        if (!article) {
          setMetrics(null);
          return;
        }
        setMetrics({
          sessions: article.ga4.sessions,
          clicks: article.gsc.clicks,
        });
      })
      .catch(() => {
        if (!cancelled) setMetrics(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, contentPieceId, publishedUrl]);

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
