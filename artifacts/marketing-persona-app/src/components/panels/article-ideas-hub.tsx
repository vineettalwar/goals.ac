"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Lightbulb,
  ListPlus,
  RefreshCw,
  Target,
  TrendingUp,
  X,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/active-project";
import { useKeywordIntelligence } from "@/lib/queries";
import { queueOpportunityErrorMessage } from "@/lib/seo/keyword-opportunity-ui";
import {
  contentLanguageLabel,
  semrushDatabaseLabel,
} from "@workspace/content-engine/support/content-language";
import type { KeywordOpportunity } from "@/lib/queries/types";

export type SourceFilter =
  | "all"
  | "semrush"
  | "gsc_query"
  | "csv_import"
  | "google_sheets"
  | "manual"
  | "imports"
  | "ai_analysis"
  | "competitor_gap"
  | "rank_drop";

const SOURCE_LABELS: Record<string, string> = {
  semrush: "Semrush",
  gsc_query: "Search Console",
  csv_import: "CSV import",
  google_sheets: "Google Sheets",
  manual: "Manual",
  ai_analysis: "AI analysis",
  competitor_gap: "Competitor gap",
  rank_drop: "Rank drop",
};

const FILTER_CHIPS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "semrush", label: "Semrush" },
  { id: "gsc_query", label: "Search Console" },
  { id: "imports", label: "Imports" },
  { id: "csv_import", label: "CSV" },
  { id: "google_sheets", label: "Sheets" },
  { id: "manual", label: "Manual" },
  { id: "ai_analysis", label: "AI" },
  { id: "competitor_gap", label: "Competitor" },
  { id: "rank_drop", label: "Rank drop" },
];

const IMPORT_SOURCES = new Set(["csv_import", "google_sheets", "manual"]);

const DIFFICULTY_COLORS = {
  low: "success" as const,
  medium: "warning" as const,
  high: "destructive" as const,
};

type GscSyncStatus = {
  connected: boolean;
  propertyVerified: boolean;
  lastSyncedAt: string | null;
  queryCount: number;
};

type SemrushStatus = {
  configured: boolean;
  database: string | null;
  primaryLanguage?: string;
  primaryLanguageLabel?: string;
  suggestedDatabase?: string | null;
  databaseMismatch?: boolean;
  lastDiscoveryAt: string | null;
};

type GscQueryMetrics = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

function contentStudioHref(projectId: number, opp: KeywordOpportunity): string {
  const params = new URLSearchParams({
    create: "1",
    format: "blog_article",
    keyword: opp.keyword,
    title: opp.suggestedTitle,
    angle: opp.suggestedAngle,
  });
  return `/projects/${projectId}/content-studio?${params.toString()}`;
}

function isSourceFilter(value: string | null): value is SourceFilter {
  return FILTER_CHIPS.some((chip) => chip.id === value);
}

export function ArticleIdeasHub({
  projectId,
  initialSourceFilter = "all",
  onRefetch,
}: {
  projectId: string;
  initialSourceFilter?: SourceFilter;
  onRefetch?: () => void;
}) {
  const { activeProjectId } = useActiveProject();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(initialSourceFilter);
  const [gscStatus, setGscStatus] = useState<GscSyncStatus | null>(null);
  const [semrushStatus, setSemrushStatus] = useState<SemrushStatus | null>(null);
  const [queryMetrics, setQueryMetrics] = useState<Map<string, GscQueryMetrics>>(new Map());
  const [statusLoading, setStatusLoading] = useState(false);
  const [discovering, setDiscovering] = useState<string | null>(null);
  const [syncingGsc, setSyncingGsc] = useState(false);

  const {
    opportunities,
    isLoading: oppsLoading,
    refetch: refetchOpportunities,
  } = useKeywordIntelligence(projectId);

  const loadQueryMetrics = useCallback(async () => {
    const res = await fetch(`/api/website-projects/${projectId}/gsc-queries?limit=200`);
    if (!res.ok) return;
    const data = await res.json();
    const map = new Map<string, GscQueryMetrics>();
    for (const row of (data.queries ?? []) as GscQueryMetrics[]) {
      map.set(row.query.toLowerCase(), row);
    }
    setQueryMetrics(map);
  }, [projectId]);

  async function loadStatuses() {
    if (!projectId) return;
    setStatusLoading(true);
    const [gscRes, semrushRes] = await Promise.all([
      fetch(`/api/website-projects/${projectId}/search-properties/gsc/sync`),
      fetch(`/api/website-projects/${projectId}/semrush/status`),
    ]);
    setStatusLoading(false);
    if (gscRes.ok) {
      setGscStatus(await gscRes.json());
      await loadQueryMetrics();
    }
    if (semrushRes.ok) setSemrushStatus(await semrushRes.json());
  }

  useEffect(() => {
    if (projectId) void loadStatuses();
  }, [projectId]);

  useEffect(() => {
    if (isSourceFilter(initialSourceFilter)) {
      setSourceFilter(initialSourceFilter);
    }
  }, [initialSourceFilter]);

  const filtered = useMemo(() => {
    const sorted = [...opportunities].sort((a, b) => b.opportunityScore - a.opportunityScore);
    if (sourceFilter === "all") return sorted;
    if (sourceFilter === "imports") {
      return sorted.filter((o) => IMPORT_SOURCES.has(o.source));
    }
    return sorted.filter((o) => o.source === sourceFilter);
  }, [opportunities, sourceFilter]);

  async function handleGscSync() {
    setSyncingGsc(true);
    const res = await fetch(`/api/website-projects/${projectId}/search-properties/gsc/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setSyncingGsc(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error((data as { error?: string }).error ?? "GSC sync failed");
      return;
    }
    const data = await res.json();
    toast.success(
      `Synced ${data.rowsUpserted ?? 0} rows · ${data.opportunitiesInserted ?? 0} new ideas`,
    );
    await loadStatuses();
    await refetchOpportunities();
    onRefetch?.();
  }

  async function runDiscovery(source: "semrush" | "gsc" | "ai", refresh = false) {
    setDiscovering(source);
    const res = await fetch(`/api/website-projects/${projectId}/keyword-opportunities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, refresh }),
    });
    setDiscovering(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error((data as { error?: string }).error ?? "Discovery failed");
      return;
    }
    const data = await res.json();
    toast.success(`Added ${data.inserted ?? 0} suggestions`);
    await loadStatuses();
    await refetchOpportunities();
    onRefetch?.();
  }

  async function handleQueue(id: number) {
    const res = await fetch(`/api/keyword-opportunities/${id}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(queueOpportunityErrorMessage((data as { error?: string }).error));
      return;
    }
    toast.success("Queued to content strategy");
    await refetchOpportunities();
    onRefetch?.();
  }

  async function handleDismiss(id: number) {
    const res = await fetch(`/api/keyword-opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    if (!res.ok) {
      toast.error("Failed to dismiss");
      return;
    }
    await refetchOpportunities();
    onRefetch?.();
  }

  return (
    <div className="space-y-6">
      {semrushStatus?.databaseMismatch && semrushStatus.configured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p>
            Project language is {semrushStatus.primaryLanguageLabel ?? contentLanguageLabel(semrushStatus.primaryLanguage)} but
            Semrush is set to {semrushDatabaseLabel(semrushStatus.database ?? "us")}.
            {" "}
            <Link href="/settings" className="font-medium text-primary hover:underline">
              Update in Settings
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="paper-card p-4 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm font-medium">Semrush</p>
              <p className="text-xs text-muted-foreground">
                {semrushStatus?.configured
                  ? `Connected · ${semrushDatabaseLabel(semrushStatus.database ?? "us")}`
                  : "Not configured"}
              </p>
            </div>
          </div>
          {!semrushStatus?.configured && (
            <Button asChild variant="outline" size="sm">
              <Link href="/settings">Connect</Link>
            </Button>
          )}
        </div>
        <div className="paper-card p-4 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Search Console</p>
              <p className="text-xs text-muted-foreground">
                {gscStatus?.connected && gscStatus.propertyVerified
                  ? `${gscStatus.queryCount.toLocaleString()} queries${
                      gscStatus.lastSyncedAt
                        ? ` · synced ${new Date(gscStatus.lastSyncedAt).toLocaleDateString()}`
                        : ""
                    }`
                  : "Not connected"}
              </p>
            </div>
          </div>
          {gscStatus?.connected && gscStatus.propertyVerified ? (
            <Button variant="outline" size="sm" onClick={handleGscSync} disabled={syncingGsc}>
              {syncingGsc ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              Sync
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/search/visibility">Connect</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!semrushStatus?.configured || discovering !== null}
          title="Uses cached Semrush data when available (24h). Shift+click to force a fresh API scan."
          onClick={(e) => runDiscovery("semrush", e.shiftKey)}
        >
          {discovering === "semrush" ? <Spinner size="sm" /> : <ListPlus className="h-4 w-4" />}
          Semrush gaps
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runDiscovery("gsc")}
          disabled={discovering !== null}
        >
          {discovering === "gsc" ? <Spinner size="sm" /> : <ListPlus className="h-4 w-4" />}
          From GSC
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runDiscovery("ai")}
          disabled={discovering !== null}
        >
          {discovering === "ai" ? <Spinner size="sm" /> : <Target className="h-4 w-4" />}
          AI gaps
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => (
          <Button
            key={chip.id}
            variant={sourceFilter === chip.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter(chip.id)}
          >
            {chip.label}
          </Button>
        ))}
      </div>

      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Article ideas
          <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
        </h2>

        {statusLoading || oppsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No ideas yet. Sync Search Console, run discovery above, or import keywords in the
            Import tab.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((opp) => {
              const metrics = queryMetrics.get(opp.keyword.toLowerCase());
              return (
                <div
                  key={opp.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{opp.keyword}</p>
                      <Badge variant="secondary" className="text-xs">
                        {SOURCE_LABELS[opp.source] ?? opp.source}
                      </Badge>
                      {opp.difficulty && (
                        <Badge
                          variant={
                            DIFFICULTY_COLORS[opp.difficulty as keyof typeof DIFFICULTY_COLORS] ??
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {opp.difficulty}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {opp.opportunityScore}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{opp.suggestedTitle}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {opp.suggestedAngle}
                    </p>
                    {(metrics || opp.estimatedVolume) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {metrics
                          ? `${metrics.impressions.toLocaleString()} imp · pos ${metrics.position.toFixed(1)} · CTR ${(metrics.ctr * 100).toFixed(1)}%`
                          : opp.estimatedVolume}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleQueue(opp.id)}>
                      Queue
                    </Button>
                    {activeProjectId != null ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={contentStudioHref(activeProjectId, opp)}>
                          <PenLine className="h-3.5 w-3.5 mr-1" />
                          Studio
                        </Link>
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => handleDismiss(opp.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
