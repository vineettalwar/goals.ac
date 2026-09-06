import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Lightbulb,
  Loader2,
  RefreshCw,
  TrendingUp,
  X,
} from "lucide-react";
import type { SectionLinkProps } from "../section/types";
import { btnOutline, btnPrimary, PanelLoading, SectionLink, StatusPill } from "./shared";
import type { GscQueryMetric, KeywordAlertRow, KeywordOpportunityRow, KeywordSourceFilter } from "./keyword-tracking-types";

const SOURCE_LABELS: Record<string, string> = {
  semrush: "Semrush",
  gsc_query: "Search Console",
  csv_import: "CSV import",
  google_sheets: "Google Sheets",
  manual: "Manual",
  ai_analysis: "AI analysis",
  competitor_gap: "Competitor gap",
  rank_drop: "Rank drop",
  content_refresh: "Needs refresh",
  reddit: "Reddit",
};

export const FILTER_CHIPS: Array<{ id: KeywordSourceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "semrush", label: "Semrush" },
  { id: "gsc_query", label: "Search Console" },
  { id: "imports", label: "Imports" },
  { id: "csv_import", label: "CSV" },
  { id: "manual", label: "Manual" },
  { id: "ai_analysis", label: "AI" },
  { id: "competitor_gap", label: "Competitor" },
  { id: "reddit", label: "Reddit" },
  { id: "rank_drop", label: "Rank drop" },
  { id: "content_refresh", label: "Needs refresh" },
];

const DIFFICULTY_TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

function ArticleIdeasList({
  opportunities,
  queryMetrics,
  studioHref,
  contentPieceHref,
  renderLink,
  onQueue,
  onQueueAndGenerate,
  onDismiss,
  queueingId,
  generatingId,
  dismissingId,
}: {
  opportunities: KeywordOpportunityRow[];
  queryMetrics: Map<string, GscQueryMetric>;
  studioHref?: (opp: KeywordOpportunityRow) => string;
  contentPieceHref?: (pieceId: number) => string;
  renderLink: (props: SectionLinkProps) => ReactNode;
  onQueue?: (id: number) => void;
  onQueueAndGenerate?: (id: number) => void;
  onDismiss?: (id: number) => void;
  queueingId?: number | null;
  generatingId?: number | null;
  dismissingId?: number | null;
}) {
  return (
    <div className="space-y-2">
      {opportunities.map((opp) => {
        const metrics = queryMetrics.get(opp.keyword.toLowerCase());
        return (
          <div
            key={opp.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{opp.keyword}</p>
                <StatusPill label={SOURCE_LABELS[opp.source] ?? opp.source} tone="muted" />
                {opp.difficulty ? (
                  <StatusPill
                    label={opp.difficulty}
                    tone={DIFFICULTY_TONE[opp.difficulty] ?? "muted"}
                  />
                ) : null}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {opp.opportunityScore}
                </span>
              </div>
              <p className="mt-1 text-sm">{opp.suggestedTitle}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{opp.suggestedAngle}</p>
              {metrics || opp.estimatedVolume ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {metrics
                    ? `${metrics.impressions.toLocaleString()} imp · pos ${metrics.position.toFixed(1)} · CTR ${(metrics.ctr * 100).toFixed(1)}%`
                    : opp.estimatedVolume}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {opp.linkedContentPieceId && contentPieceHref ? (
                <SectionLink
                  renderLink={renderLink}
                  href={contentPieceHref(opp.linkedContentPieceId)}
                  className={btnPrimary}
                >
                  <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
                  Refresh article
                </SectionLink>
              ) : null}
              {onQueueAndGenerate && !opp.linkedContentPieceId ? (
                <button
                  type="button"
                  disabled={generatingId === opp.id}
                  className={btnPrimary}
                  onClick={() => onQueueAndGenerate(opp.id)}
                >
                  {generatingId === opp.id ? "Generating…" : "Add & generate"}
                </button>
              ) : null}
              {onQueue ? (
                <button
                  type="button"
                  disabled={queueingId === opp.id}
                  className={btnOutline}
                  onClick={() => onQueue(opp.id)}
                >
                  {queueingId === opp.id ? "Queueing…" : "Queue"}
                </button>
              ) : null}
              {studioHref ? (
                <SectionLink
                  renderLink={renderLink}
                  href={studioHref(opp)}
                  className={btnOutline}
                >
                  Draft
                </SectionLink>
              ) : null}
              {onDismiss ? (
                <button
                  type="button"
                  disabled={dismissingId === opp.id}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onDismiss(opp.id)}
                >
                  <X className="inline h-3 w-3" /> Dismiss
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function KeywordIdeasTab({
  opportunities,
  queryMetrics,
  opportunitiesLoading,
  alerts,
  sourceFilter,
  onSourceFilterChange,
  gscStatus,
  semrushStatus,
  statusLoading,
  discovering,
  syncingGsc,
  onDiscover,
  onGscSync,
  onQueueOpportunity,
  onQueueAndGenerate,
  onDismissOpportunity,
  queueingId,
  generatingId,
  dismissingId,
  settingsHref,
  visibilityHref,
  studioHref,
  contentPieceHref,
  renderLink,
}: {
  opportunities: KeywordOpportunityRow[];
  queryMetrics: Map<string, GscQueryMetric>;
  opportunitiesLoading?: boolean;
  alerts: KeywordAlertRow[];
  sourceFilter: KeywordSourceFilter;
  onSourceFilterChange: (filter: KeywordSourceFilter) => void;
  gscStatus?: {
    connected?: boolean;
    propertyVerified?: boolean;
    queryCount?: number;
    lastSyncedAt?: string | null;
  } | null;
  semrushStatus?: {
    configured?: boolean;
    database?: string | null;
    primaryLanguage?: string;
    primaryLanguageLabel?: string;
    databaseMismatch?: boolean;
  } | null;
  statusLoading?: boolean;
  discovering?: string | null;
  syncingGsc?: boolean;
  onDiscover?: (source: "semrush" | "gsc" | "ai", refresh?: boolean) => void;
  onGscSync?: () => void;
  onQueueOpportunity?: (id: number) => void;
  onQueueAndGenerate?: (id: number) => void;
  onDismissOpportunity?: (id: number) => void;
  queueingId?: number | null;
  generatingId?: number | null;
  dismissingId?: number | null;
  settingsHref?: string;
  visibilityHref?: string;
  studioHref?: (opp: KeywordOpportunityRow) => string;
  contentPieceHref?: (pieceId: number) => string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  return (
    <div className="space-y-6">
      {semrushStatus?.databaseMismatch && semrushStatus.configured ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Project language is{" "}
          {semrushStatus.primaryLanguageLabel ?? semrushStatus.primaryLanguage ?? "unknown"} but
          Semrush is set to {semrushStatus.database ?? "us"}.
          {settingsHref ? (
            <>
              {" "}
              <SectionLink renderLink={renderLink} href={settingsHref} className="font-medium text-primary hover:underline">
                Open settings
              </SectionLink>{" "}
              to align the database.
            </>
          ) : null}
        </div>
      ) : null}

      {!semrushStatus?.configured ? (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">Working without Semrush</p>
          <p className="mt-1 text-muted-foreground">
            Use From GSC for real query opportunities, or AI gaps for estimated clusters. Volume
            stays blank until you connect Semrush
            {settingsHref ? (
              <>
                {" "}
                in{" "}
                <SectionLink
                  renderLink={renderLink}
                  href={settingsHref}
                  className="font-medium text-primary hover:underline"
                >
                  Integrations → Tools
                </SectionLink>
              </>
            ) : null}
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="paper-card flex items-center justify-between gap-3 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm font-medium">Semrush</p>
              <p className="text-xs text-muted-foreground">
                {semrushStatus?.configured ? "Connected" : "Not configured"}
              </p>
            </div>
          </div>
          {!semrushStatus?.configured && settingsHref ? (
            <SectionLink renderLink={renderLink} href={settingsHref} className={btnOutline}>
              Connect
            </SectionLink>
          ) : null}
        </div>
        <div className="paper-card flex items-center justify-between gap-3 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Search Console</p>
              <p className="text-xs text-muted-foreground">
                {gscStatus?.connected && gscStatus.propertyVerified
                  ? `${(gscStatus.queryCount ?? 0).toLocaleString()} queries`
                  : "Not connected"}
              </p>
            </div>
          </div>
          {gscStatus?.connected && gscStatus.propertyVerified && onGscSync ? (
            <button type="button" disabled={syncingGsc} onClick={onGscSync} className={btnOutline}>
              {syncingGsc ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          ) : visibilityHref ? (
            <SectionLink renderLink={renderLink} href={visibilityHref} className={btnOutline}>
              Connect
            </SectionLink>
          ) : null}
        </div>
      </div>

      {onDiscover ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!semrushStatus?.configured || discovering != null}
            className={btnOutline}
            onClick={(event) => onDiscover("semrush", event.shiftKey)}
          >
            {discovering === "semrush" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Semrush gaps
          </button>
          <button
            type="button"
            disabled={discovering != null}
            className={btnOutline}
            onClick={() => onDiscover("gsc")}
          >
            {discovering === "gsc" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            From GSC
          </button>
          <button
            type="button"
            disabled={discovering != null}
            className={btnOutline}
            onClick={() => onDiscover("ai")}
          >
            {discovering === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            AI gaps
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={
              sourceFilter === chip.id
                ? "rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-lg border border-input px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary"
            }
            onClick={() => onSourceFilterChange(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="paper-card space-y-4 rounded-xl p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Lightbulb className="h-4 w-4 text-primary" />
          Article ideas
          <span className="text-sm font-normal text-muted-foreground">
            ({opportunities.length})
          </span>
        </h2>
        {statusLoading || opportunitiesLoading ? (
          <PanelLoading label="Loading ideas…" />
        ) : opportunities.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No ideas yet. Sync Search Console, run discovery above, or import keywords in the
            Import tab.
          </p>
        ) : (
          <ArticleIdeasList
            opportunities={opportunities}
            queryMetrics={queryMetrics}
            studioHref={studioHref}
            contentPieceHref={contentPieceHref}
            renderLink={renderLink}
            onQueue={onQueueOpportunity}
            onQueueAndGenerate={onQueueAndGenerate}
            onDismiss={onDismissOpportunity}
            queueingId={queueingId}
            generatingId={generatingId}
            dismissingId={dismissingId}
          />
        )}
      </div>

      {alerts.length > 0 ? (
        <div className="paper-card space-y-3 rounded-xl p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Rank alerts
          </h2>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm"
            >
              <span className="font-medium">{alert.keyword}</span>: {alert.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
