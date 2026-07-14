"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  ExternalLink,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/page-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveProject } from "@/context/active-project";
import type { ArticlePerformanceResponse } from "@/lib/integrations/analytics-property-types";

type SortKey = "sessions" | "clicks";

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

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function isPublished(article: ArticlePerformanceResponse["articles"][number]): boolean {
  return article.status === "published" || Boolean(article.publishedUrl);
}

export function ArticlePerformancePanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { activeProjectId, activeProject, isLoading: projectLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";

  const initialRange = useMemo(() => defaultDateRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [data, setData] = useState<ArticlePerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ startDate, endDate });
      const res = await fetch(
        `/api/website-projects/${projectId}/article-performance?${qs.toString()}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to load article performance");
        setData(null);
        return;
      }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [projectId, startDate, endDate]);

  useEffect(() => {
    if (!projectLoading && !projectId) {
      router.replace("/projects");
    }
  }, [projectLoading, projectId, router]);

  useEffect(() => {
    if (projectId) void load();
  }, [projectId, load]);

  const publishedArticles = useMemo(
    () => (data?.articles ?? []).filter(isPublished),
    [data?.articles],
  );

  const sortedArticles = useMemo(() => {
    return [...publishedArticles].sort((a, b) => {
      if (sortKey === "sessions") return b.ga4.sessions - a.ga4.sessions;
      return b.gsc.clicks - a.gsc.clicks;
    });
  }, [publishedArticles, sortKey]);

  const totals = useMemo(() => {
    return publishedArticles.reduce(
      (acc, row) => ({
        sessions: acc.sessions + row.ga4.sessions,
        pageviews: acc.pageviews + row.ga4.pageviews,
        clicks: acc.clicks + row.gsc.clicks,
        impressions: acc.impressions + row.gsc.impressions,
        engagementWeighted: acc.engagementWeighted.concat(
          row.ga4.sessions > 0 ? [{ weight: row.ga4.sessions, value: row.ga4.engagementRate }] : [],
        ),
      }),
      {
        sessions: 0,
        pageviews: 0,
        clicks: 0,
        impressions: 0,
        engagementWeighted: [] as Array<{ weight: number; value: number }>,
      },
    );
  }, [publishedArticles]);

  const avgEngagement = useMemo(() => {
    const totalWeight = totals.engagementWeighted.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) return 0;
    return (
      totals.engagementWeighted.reduce((sum, item) => sum + item.weight * item.value, 0) /
      totalWeight
    );
  }, [totals.engagementWeighted]);

  const ga4Connected =
    data?.connectionStatus.ga4.connected && data.connectionStatus.ga4.propertyVerified;
  const gscConnected =
    data?.connectionStatus.gsc.connected && data.connectionStatus.gsc.propertyVerified;

  const containerClass = embedded ? "space-y-6" : "px-8 py-8 max-w-6xl space-y-6";

  if (!projectId) {
    return projectLoading ? <PageSkeleton /> : null;
  }

  return (
    <div className={containerClass}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold">Article performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            GA4 sessions and Search Console clicks for published content
          </p>
        </div>
      ) : null}

      {activeProject ? (
        <p className="text-sm text-muted-foreground">
          Project: <span className="font-medium text-foreground">{activeProject.name}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="perf-start" className="text-xs text-muted-foreground">
            Start date
          </label>
          <input
            id="perf-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="perf-end" className="text-xs text-muted-foreground">
            End date
          </label>
          <input
            id="perf-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
          />
        </div>
        <Button size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Spinner size="sm" /> : "Apply"}
        </Button>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            size="sm"
            variant={sortKey === "sessions" ? "secondary" : "outline"}
            onClick={() => setSortKey("sessions")}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Sort by sessions
          </Button>
          <Button
            size="sm"
            variant={sortKey === "clicks" ? "secondary" : "outline"}
            onClick={() => setSortKey("clicks")}
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            Sort by clicks
          </Button>
        </div>
      </div>

      {data && !ga4Connected ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-muted-foreground">
            Google Analytics 4 is not connected.{" "}
            <Link href="/integrations" className="text-primary hover:underline">
              Connect GA4
            </Link>{" "}
            to see session and engagement metrics.
          </p>
        </div>
      ) : null}

      {data && !gscConnected ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <Search className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-muted-foreground">
            Google Search Console is not connected.{" "}
            <Link href="/integrations" className="text-primary hover:underline">
              Connect Search Console
            </Link>{" "}
            to see clicks and impressions.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <PageSkeleton />
      ) : publishedArticles.length === 0 ? (
        <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No published articles yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Publish content from Content Studio to see GA4 sessions and Search Console performance
            here.
          </p>
          <Button size="sm" className="mt-4" asChild>
            <Link href={`/projects/${projectId}/content-studio`}>Open Content Studio</Link>
          </Button>
        </div>
      ) : (
        <div className="paper-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">Totals</TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {formatNumber(totals.clicks)} clicks
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {formatNumber(totals.impressions)} impr.
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {formatNumber(totals.sessions)} sessions
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {formatNumber(totals.pageviews)} views
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {formatPercent(avgEngagement)} eng.
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead className="text-right">GSC clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Pageviews</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedArticles.map((article) => (
                <TableRow key={article.contentPieceId}>
                  <TableCell>
                    <div className="space-y-0.5 min-w-[200px] max-w-[360px]">
                      <Link
                        href={`/content-piece/${article.contentPieceId}`}
                        className="font-medium hover:text-primary line-clamp-2"
                      >
                        {article.title}
                      </Link>
                      {article.publishedUrl ? (
                        <a
                          href={article.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate max-w-full"
                        >
                          <span className="truncate">{article.publishedUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No published URL</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(article.gsc.clicks)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(article.gsc.impressions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(article.ga4.sessions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(article.ga4.pageviews)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {article.ga4.sessions > 0 ? (
                      <>
                        {formatPercent(article.ga4.engagementRate)}
                        <span className="block text-[11px]">
                          {formatDuration(article.ga4.avgSessionDuration)} avg
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
