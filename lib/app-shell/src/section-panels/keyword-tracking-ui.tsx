import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Lightbulb,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { SectionLinkProps } from "../section/types";
import { cn } from "../cn";
import { KeywordRankChart, SerpFeaturesPanel, parseSerpFeatures, type KeywordRankSnapshot } from "./keyword-rank-chart";
import { btnOutline, btnPrimary, inputClass, PanelLoading, StatusPill } from "./shared";

export type KeywordSourceFilter =
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

export type KeywordOpportunityRow = {
  id: number;
  keyword: string;
  source: string;
  opportunityScore: number;
  difficulty?: string | null;
  suggestedTitle: string;
  suggestedAngle: string;
  estimatedVolume?: string | null;
  linkedContentPieceId?: number | null;
};

export type KeywordAlertRow = {
  id: number;
  keyword: string;
  message: string;
};

export type TrackedKeywordRow = {
  id: number;
  keyword: string;
  latestSnapshot?: {
    position?: number | null;
    serpFeatures?: Record<string, unknown>;
  } | null;
};

export type KeywordAnalysisResult = {
  keywords: Array<{
    keyword: string;
    estimatedVolume: string;
    difficulty: "low" | "medium" | "high";
    aiVisibility: number;
    opportunities: string[];
    suggestedContent: string;
  }>;
  topOpportunity: string;
  summary: string;
};

export type GscQueryMetric = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type ArticleIdeaImportHistory = {
  id: number;
  source: string;
  rowCount: number;
  createdAt: string;
};

export type ArticleIdeaSourceRow = {
  id: number;
  label: string;
  spreadsheetId: string;
  sheetName: string | null;
  connected: boolean;
  syncStatus: string;
  rowCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
};

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
};

const FILTER_CHIPS: Array<{ id: KeywordSourceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "semrush", label: "Semrush" },
  { id: "gsc_query", label: "Search Console" },
  { id: "imports", label: "Imports" },
  { id: "csv_import", label: "CSV" },
  { id: "manual", label: "Manual" },
  { id: "ai_analysis", label: "AI" },
  { id: "competitor_gap", label: "Competitor" },
  { id: "rank_drop", label: "Rank drop" },
  { id: "content_refresh", label: "Needs refresh" },
];

const IMPORT_SOURCES = new Set(["csv_import", "google_sheets", "manual"]);

const DIFFICULTY_TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

type TabId = "ideas" | "import" | "tracking" | "analyzer";

function SectionLink({
  renderLink,
  ...props
}: SectionLinkProps & { renderLink: (props: SectionLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
          : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}

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

export function KeywordTrackingView({
  projectId,
  projectName,
  loading,
  activeTab,
  onTabChange,
  opportunities,
  opportunitiesLoading,
  alerts,
  sourceFilter,
  onSourceFilterChange,
  gscStatus,
  semrushStatus,
  gscQueries,
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
  tracked,
  trackInput,
  onTrackInputChange,
  onTrackKeyword,
  tracking,
  selectedTrackedId,
  onSelectTracked,
  onDeleteTracked,
  snapshots,
  keywordInput,
  websiteUrl,
  onKeywordInputChange,
  onWebsiteUrlChange,
  onAnalyze,
  analyzing,
  analysis,
  importHistory,
  importLoading,
  manualKeyword,
  manualTitle,
  manualAngle,
  onManualKeywordChange,
  onManualTitleChange,
  onManualAngleChange,
  onManualImport,
  manualImporting,
  onCsvImport,
  csvImporting,
  canImport = true,
  sheetsStatusMessage,
  sheetSources = [],
  sheetSourcesLoading,
  sheetLabel,
  sheetUrl,
  sheetName,
  onSheetLabelChange,
  onSheetUrlChange,
  onSheetNameChange,
  onCreateSheetSource,
  creatingSheetSource,
  onSyncSheetSource,
  onDeleteSheetSource,
  onConnectSheetSource,
  syncingSheetId,
  settingsHref,
  visibilityHref,
  studioHref,
  contentPieceHref,
  renderLink,
  error,
}: {
  projectId: string | null;
  projectName?: string | null;
  loading?: boolean;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  opportunities: KeywordOpportunityRow[];
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
  gscQueries?: GscQueryMetric[];
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
  tracked: TrackedKeywordRow[];
  trackInput: string;
  onTrackInputChange: (value: string) => void;
  onTrackKeyword?: () => void;
  tracking?: boolean;
  selectedTrackedId: number | null;
  onSelectTracked: (id: number) => void;
  onDeleteTracked?: (id: number) => void;
  snapshots: KeywordRankSnapshot[];
  keywordInput: string;
  websiteUrl: string;
  onKeywordInputChange: (value: string) => void;
  onWebsiteUrlChange: (value: string) => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
  analysis: KeywordAnalysisResult | null;
  importHistory: ArticleIdeaImportHistory[];
  importLoading?: boolean;
  manualKeyword: string;
  manualTitle: string;
  manualAngle: string;
  onManualKeywordChange: (value: string) => void;
  onManualTitleChange: (value: string) => void;
  onManualAngleChange: (value: string) => void;
  onManualImport?: () => void;
  manualImporting?: boolean;
  onCsvImport?: (file: File) => void;
  csvImporting?: boolean;
  canImport?: boolean;
  sheetsStatusMessage?: string | null;
  sheetSources?: ArticleIdeaSourceRow[];
  sheetSourcesLoading?: boolean;
  sheetLabel?: string;
  sheetUrl?: string;
  sheetName?: string;
  onSheetLabelChange?: (value: string) => void;
  onSheetUrlChange?: (value: string) => void;
  onSheetNameChange?: (value: string) => void;
  onCreateSheetSource?: () => void;
  creatingSheetSource?: boolean;
  onSyncSheetSource?: (id: number) => void;
  onDeleteSheetSource?: (id: number) => void;
  onConnectSheetSource?: (id: number) => void;
  syncingSheetId?: number | null;
  settingsHref?: string;
  visibilityHref?: string;
  studioHref?: (opp: KeywordOpportunityRow) => string;
  contentPieceHref?: (pieceId: number) => string;
  renderLink: (props: SectionLinkProps) => ReactNode;
  error?: string | null;
}) {
  const queryMetrics = useMemo(() => {
    const map = new Map<string, GscQueryMetric>();
    for (const row of gscQueries ?? []) {
      map.set(row.query.toLowerCase(), row);
    }
    return map;
  }, [gscQueries]);

  const filteredOpportunities = useMemo(() => {
    const sorted = [...opportunities].sort((a, b) => b.opportunityScore - a.opportunityScore);
    if (sourceFilter === "all") return sorted;
    if (sourceFilter === "imports") {
      return sorted.filter((row) => IMPORT_SOURCES.has(row.source));
    }
    return sorted.filter((row) => row.source === sourceFilter);
  }, [opportunities, sourceFilter]);

  if (!projectId) {
    return (
      <div className="paper-card rounded-xl p-6 text-sm text-muted-foreground">
        Choose a project in the sidebar to research keywords.
      </div>
    );
  }

  if (loading) {
    return <PanelLoading label="Loading keyword research…" />;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {projectName ? (
        <p className="text-sm text-muted-foreground">
          Project: <span className="font-medium text-foreground">{projectName}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <TabButton active={activeTab === "ideas"} onClick={() => onTabChange("ideas")}>
          <Lightbulb className="h-4 w-4" /> Article ideas
        </TabButton>
        <TabButton active={activeTab === "import"} onClick={() => onTabChange("import")}>
          <Upload className="h-4 w-4" /> Import
        </TabButton>
        <TabButton active={activeTab === "tracking"} onClick={() => onTabChange("tracking")}>
          <TrendingUp className="h-4 w-4" /> Rank tracking
        </TabButton>
        <TabButton active={activeTab === "analyzer"} onClick={() => onTabChange("analyzer")}>
          <Search className="h-4 w-4" /> AI analyzer
        </TabButton>
      </div>

      {activeTab === "ideas" ? (
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
                ({filteredOpportunities.length})
              </span>
            </h2>
            {statusLoading || opportunitiesLoading ? (
              <PanelLoading label="Loading ideas…" />
            ) : filteredOpportunities.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No ideas yet. Sync Search Console, run discovery above, or import keywords in the
                Import tab.
              </p>
            ) : (
              <ArticleIdeasList
                opportunities={filteredOpportunities}
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
      ) : null}

      {activeTab === "import" ? (
        <div className="space-y-6">
          {!canImport ? (
            <div className="paper-card rounded-xl p-6 text-sm text-muted-foreground">
              Article idea imports are available to site admins. Ask your org admin to upload a CSV,
              connect Google Sheets, or add ideas manually.
            </div>
          ) : (
            <>
              {sheetsStatusMessage ? (
                <p className="text-sm text-muted-foreground">{sheetsStatusMessage}</p>
              ) : null}

              <div className="paper-card space-y-4 rounded-xl p-6">
                <h2 className="font-semibold">Manual import</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Keyword</span>
                <input
                  type="text"
                  value={manualKeyword}
                  onChange={(event) => onManualKeywordChange(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Suggested title</span>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(event) => onManualTitleChange(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Angle (optional)</span>
              <input
                type="text"
                value={manualAngle}
                onChange={(event) => onManualAngleChange(event.target.value)}
                className={inputClass}
              />
            </label>
            {onManualImport ? (
              <button
                type="button"
                disabled={manualImporting || !manualKeyword.trim() || !manualTitle.trim()}
                className={btnPrimary}
                onClick={onManualImport}
              >
                {manualImporting ? "Importing…" : "Add idea"}
              </button>
            ) : null}
          </div>

          <div className="paper-card space-y-4 rounded-xl p-6">
            <h2 className="font-semibold">CSV import</h2>
            <p className="text-sm text-muted-foreground">
              Upload a CSV with keyword, title, and optional angle columns.
            </p>
            {onCsvImport ? (
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={csvImporting}
                className="text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onCsvImport(file);
                  event.target.value = "";
                }}
              />
            ) : null}
            {csvImporting ? <p className="text-xs text-muted-foreground">Importing CSV…</p> : null}
          </div>

          <div className="paper-card space-y-4 rounded-xl p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="h-4 w-4" /> Google Sheets
            </h2>
            <p className="text-sm text-muted-foreground">
              Connect a sheet with keyword, title, and optional angle columns — same as the CSV
              template.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Label</span>
                <input
                  type="text"
                  placeholder="Q3 content backlog"
                  value={sheetLabel ?? ""}
                  onChange={(event) => onSheetLabelChange?.(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Sheet URL</span>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl ?? ""}
                  onChange={(event) => onSheetUrlChange?.(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block max-w-xs space-y-1 text-sm">
              <span className="text-muted-foreground">Tab name (optional)</span>
              <input
                type="text"
                value={sheetName ?? ""}
                onChange={(event) => onSheetNameChange?.(event.target.value)}
                className={inputClass}
              />
            </label>
            {onCreateSheetSource ? (
              <button
                type="button"
                disabled={creatingSheetSource || !sheetLabel?.trim() || !sheetUrl?.trim()}
                className={btnPrimary}
                onClick={onCreateSheetSource}
              >
                {creatingSheetSource ? "Connecting…" : "Connect Google Sheets"}
              </button>
            ) : null}

            {sheetSourcesLoading ? (
              <PanelLoading label="Loading sheet sources…" />
            ) : sheetSources.length > 0 ? (
              <div className="space-y-2 pt-2">
                {sheetSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{source.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.connected ? "Google connected" : "Needs Google auth"} ·{" "}
                        {source.syncStatus}
                        {source.lastSyncedAt
                          ? ` · ${new Date(source.lastSyncedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                      {source.syncError ? (
                        <p className="mt-1 text-xs text-red-700">{source.syncError}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      {onSyncSheetSource ? (
                        <button
                          type="button"
                          className={btnOutline}
                          disabled={syncingSheetId === source.id}
                          onClick={() => onSyncSheetSource(source.id)}
                        >
                          {syncingSheetId === source.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                      {!source.connected && onConnectSheetSource ? (
                        <button
                          type="button"
                          className={btnOutline}
                          onClick={() => onConnectSheetSource(source.id)}
                          aria-label="Connect Google Sheets"
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                      ) : null}
                      {onDeleteSheetSource ? (
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
                          onClick={() => onDeleteSheetSource(source.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="paper-card rounded-xl p-6">
            <h2 className="mb-3 font-semibold">Import history</h2>
            {importLoading ? (
              <PanelLoading label="Loading history…" />
            ) : importHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imports yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {importHistory.map((row) => (
                  <li key={row.id} className="flex items-center justify-between py-2">
                    <span className="capitalize">{row.source.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">
                      {row.rowCount} rows · {new Date(row.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
            </>
          )}
        </div>
      ) : null}

      {activeTab === "tracking" ? (
        <div className="paper-card space-y-4 rounded-xl p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4" /> Rank tracking
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Keyword to track"
              value={trackInput}
              onChange={(event) => onTrackInputChange(event.target.value)}
              className={cn(inputClass, "flex-1")}
            />
            {onTrackKeyword ? (
              <button
                type="button"
                disabled={tracking || !trackInput.trim()}
                onClick={onTrackKeyword}
                className={btnPrimary}
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            {tracked.map((kw) => (
              <div
                key={kw.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => onSelectTracked(kw.id)}
                >
                  <span className="font-medium">{kw.keyword}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {kw.latestSnapshot?.position != null
                      ? `#${kw.latestSnapshot.position}`
                      : "—"}
                  </span>
                </button>
                {onDeleteTracked ? (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-red-600"
                    onClick={() => onDeleteTracked(kw.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {selectedTrackedId != null ? (
            <>
              <KeywordRankChart snapshots={snapshots} />
              <SerpFeaturesPanel
                features={parseSerpFeatures(
                  snapshots[0]?.serpFeatures ??
                    tracked.find((kw) => kw.id === selectedTrackedId)?.latestSnapshot?.serpFeatures,
                )}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === "analyzer" ? (
        <div className="space-y-6">
          <div className="paper-card space-y-4 rounded-xl p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Search className="h-4 w-4" /> Keyword analysis
            </h2>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Keywords (comma-separated)</span>
              <input
                type="text"
                placeholder="B2B lead generation, SaaS marketing"
                value={keywordInput}
                onChange={(event) => onKeywordInputChange(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Website URL (optional)</span>
              <input
                type="text"
                placeholder="https://yoursite.com"
                value={websiteUrl}
                onChange={(event) => onWebsiteUrlChange(event.target.value)}
                className={inputClass}
              />
            </label>
            {onAnalyze ? (
              <button
                type="button"
                disabled={analyzing}
                onClick={onAnalyze}
                className={btnPrimary}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  "Analyze keywords"
                )}
              </button>
            ) : null}
          </div>

          {analysis ? (
            <div className="space-y-4">
              <div className="paper-card rounded-xl p-5">
                <h2 className="mb-2 flex items-center gap-2 font-semibold">
                  <Lightbulb className="h-4 w-4 text-primary" /> Top opportunity
                </h2>
                <p className="text-sm text-muted-foreground">{analysis.topOpportunity}</p>
                <p className="mt-2 text-sm">{analysis.summary}</p>
              </div>
              {analysis.keywords.map((kw, index) => (
                <div key={index} className="paper-card space-y-3 rounded-xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{kw.keyword}</h3>
                    <StatusPill
                      label={kw.difficulty}
                      tone={DIFFICULTY_TONE[kw.difficulty] ?? "muted"}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${kw.aiVisibility}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">AI: {kw.aiVisibility}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {visibilityHref ? (
        <p className="text-sm text-muted-foreground">
          Also see{" "}
          <SectionLink renderLink={renderLink} href={visibilityHref} className="text-primary hover:underline">
            Visibility
          </SectionLink>{" "}
          for LLM citation tracking and Search Console connection.
        </p>
      ) : null}
    </div>
  );
}