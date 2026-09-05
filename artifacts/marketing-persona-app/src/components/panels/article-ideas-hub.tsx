"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useActiveProject } from "@/context/use-active-project";
import { queryKeys, useGscQueries, useGscSyncStatus, useKeywordIntelligence, useSemrushStatus } from "@/lib/queries";
import { queueOpportunityErrorMessage } from "@/lib/seo/keyword-opportunity-ui";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import {
  contentLanguageLabel,
  semrushDatabaseLabel,
} from "@workspace/content-engine/support/content/content-language";
import type { KeywordOpportunity } from "@/lib/queries/types";
import { ArticleIdeasOpportunityList } from "./article-ideas-opportunity-list";

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
  { id: "semrush", label: "Semrush" },
  { id: "gsc_query", label: "Search Console" },
  { id: "imports", label: "Imports" },
  { id: "csv_import", label: "CSV" },
  { id: "google_sheets", label: "Sheets" },
  { id: "manual", label: "Manual" },
  { id: "ai_analysis", label: "AI" },
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

  return (
    <div className="space-y-6">
      {semrushStatus?.databaseMismatch && semrushStatus.configured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p>
            Project language is {semrushStatus.primaryLanguageLabel ?? contentLanguageLabel(semrushStatus.primaryLanguage)} but
            Semrush is set to {semrushDatabaseLabel(semrushStatus.database ?? "us")}.
            {" "}
            <Link href="/integrations/tools" className="font-medium text-primary hover:underline">
              Update in Integrations → Tools
            </Link>
          </p>
        </div>
      )}

      {!semrushStatus?.configured && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">Working without Semrush</p>
          <p className="mt-1 text-muted-foreground">
            Use <span className="font-medium text-foreground">From GSC</span> for ideas backed by real
            Search Console impressions, or <span className="font-medium text-foreground">AI gaps</span> for
            AI-estimated clusters — their volume and difficulty are educated guesses, not measured search
            data, until you{" "}
            <Link href="/integrations/tools" className="font-medium text-primary hover:underline">
              connect Semrush
            </Link>
            .
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
              <Link href="/integrations/tools">Connect</Link>
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
                        ? ` · synced ${new Date(gscStatus.lastSyncedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}`
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
          <ArticleIdeasOpportunityList
            opportunities={filtered}
            queryMetrics={queryMetrics}
            activeProjectId={activeProjectId}
            onQueue={handleQueue}
            onQueueAndGenerate={handleQueueAndGenerate}
            onDismiss={handleDismiss}
          />
        )}
      </div>
    </div>
  );
}
