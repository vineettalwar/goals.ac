"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/context/use-active-project";
import { queryKeys, useGscQueries, useGscSyncStatus, useKeywordIntelligence, useSemrushStatus } from "@/lib/queries";
import { queueOpportunityErrorMessage } from "@/lib/seo/keyword-opportunity-ui";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import {
  contentLanguageLabel,
  semrushDatabaseLabel,
} from "@workspace/content-engine/support/content/content-language";
import { ArticleIdeasOpportunityList } from "./article-ideas-opportunity-list";
import { notifyGscSyncResult } from "@/lib/integrations/search/gsc-sync-result";

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
  | "rank_drop"
  | "content_refresh";

const IMPORT_SOURCES = new Set(["csv_import", "google_sheets", "manual"]);

const FILTER_CHIPS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gsc_query", label: "Search Console" },
  { id: "semrush", label: "Semrush" },
  { id: "imports", label: "Imports" },
  { id: "ai_analysis", label: "Analysis" },
  { id: "competitor_gap", label: "Competitor" },
  { id: "rank_drop", label: "Rank drop" },
  { id: "content_refresh", label: "Needs refresh" },
];

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
  const queryClient = useQueryClient();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(initialSourceFilter);
  const [discovering, setDiscovering] = useState<string | null>(null);
  const [syncingGsc, setSyncingGsc] = useState(false);

  const {
    opportunities,
    isLoading: oppsLoading,
    refetch: refetchOpportunities,
  } = useKeywordIntelligence(projectId);

  const { data: gscStatus, isFetching: gscFetching } = useGscSyncStatus(projectId);
  const { data: semrushStatus, isFetching: semrushFetching } = useSemrushStatus(projectId);
  const { data: gscQueryRows = [] } = useGscQueries(projectId, Boolean(gscStatus?.connected));
  const statusLoading = gscFetching || semrushFetching;

  const queryMetrics = useMemo(() => {
    const map = new Map<string, GscQueryMetrics>();
    for (const row of gscQueryRows) {
      map.set(row.query.toLowerCase(), row);
    }
    return map;
  }, [gscQueryRows]);

  const loadStatuses = useCallback(async () => {
    if (!projectId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.gscSyncStatus(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.semrushStatus(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gscQueries(projectId) }),
    ]);
  }, [projectId, queryClient]);

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
    notifyGscSyncResult(data);
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

  async function handleQueueAndGenerate(id: number) {
    const res = await fetch(`/api/keyword-opportunities/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generate: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(queueOpportunityErrorMessage((data as { error?: string }).error));
      return;
    }
    const data = (await res.json()) as { primaryPieceId?: number };
    toast.success("Queued and generating draft");
    await refetchOpportunities();
    onRefetch?.();
    if (data.primaryPieceId && activeProjectId) {
      window.location.href = contentPiecePath(activeProjectId, data.primaryPieceId);
    }
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

  const gscReady = Boolean(gscStatus?.connected && gscStatus.propertyVerified);
  const semrushReady = Boolean(semrushStatus?.configured);

  return (
    <div className="space-y-8">
      {semrushStatus?.databaseMismatch && semrushStatus.configured ? (
        <p className="text-sm text-muted-foreground">
          Project language is{" "}
          {semrushStatus.primaryLanguageLabel ?? contentLanguageLabel(semrushStatus.primaryLanguage)}{" "}
          but Semrush is set to {semrushDatabaseLabel(semrushStatus.database ?? "us")}.{" "}
          <Link href="/integrations/tools" className="font-medium text-foreground hover:underline">
            Update the database
          </Link>
        </p>
      ) : null}

      <div className="space-y-4 border-b border-border pb-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 sm:gap-x-10">
          <div>
            <dt className="font-medium">Search Console</dt>
            <dd className="mt-0.5 text-muted-foreground">
              {gscReady
                ? `${gscStatus?.queryCount.toLocaleString() ?? 0} queries${
                    gscStatus?.lastSyncedAt
                      ? ` · ${new Date(gscStatus.lastSyncedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}`
                      : ""
                  }`
                : "Not connected"}
            </dd>
            <div className="mt-2">
              {gscReady ? (
                <Button variant="outline" size="sm" onClick={handleGscSync} disabled={syncingGsc}>
                  {syncingGsc ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                  Sync queries
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/projects/${projectId}/integrations/search`}>Connect</Link>
                </Button>
              )}
            </div>
          </div>
          <div>
            <dt className="font-medium">Semrush</dt>
            <dd className="mt-0.5 text-muted-foreground">
              {semrushReady
                ? `Connected · ${semrushDatabaseLabel(semrushStatus?.database ?? "us")}`
                : "Not configured — volumes from analysis are estimates"}
            </dd>
            <div className="mt-2">
              {semrushReady ? null : (
                <Button asChild variant="outline" size="sm">
                  <Link href="/integrations/tools">Connect</Link>
                </Button>
              )}
            </div>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => runDiscovery("gsc")} disabled={discovering !== null}>
            {discovering === "gsc" ? <Spinner size="sm" /> : null}
            From Search Console
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runDiscovery("ai")}
            disabled={discovering !== null}
          >
            {discovering === "ai" ? <Spinner size="sm" /> : null}
            Find gaps
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!semrushReady || discovering !== null}
            title="Uses cached Semrush data when available (24h). Shift+click to force a fresh API scan."
            onClick={(e) => runDiscovery("semrush", e.shiftKey)}
          >
            {discovering === "semrush" ? <Spinner size="sm" /> : null}
            Semrush gaps
          </Button>
        </div>
      </div>

      <div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Ideas
            <span className="ml-2 text-sm font-normal tabular-nums text-muted-foreground">
              {filtered.length}
            </span>
          </h2>
          <div className="flex flex-wrap gap-1" aria-label="Filter ideas by source">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={sourceFilter === chip.id}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  sourceFilter === chip.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
                onClick={() => setSourceFilter(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {statusLoading || oppsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-6 max-w-prose text-sm text-muted-foreground">
            Nothing queued yet. Pull queries from Search Console, find topical gaps, or{" "}
            <Link href="/search/keywords?tab=import" className="font-medium text-foreground hover:underline">
              import a list
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4">
            <ArticleIdeasOpportunityList
              opportunities={filtered}
              queryMetrics={queryMetrics}
              activeProjectId={activeProjectId}
              onQueue={handleQueue}
              onQueueAndGenerate={handleQueueAndGenerate}
              onDismiss={handleDismiss}
            />
          </div>
        )}
      </div>
    </div>
  );
}
