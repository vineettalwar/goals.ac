import { useMemo, type ReactNode } from "react";
import { Lightbulb, Search, TrendingUp, Upload } from "lucide-react";
import type { SectionLinkProps } from "../section/types";
import { PanelLoading, SectionLink } from "./shared";
import { KeywordIdeasTab } from "./keyword-ideas-tab";
import { KeywordImportTab } from "./keyword-import-tab";
import { KeywordTrackingTab } from "./keyword-tracking-tab";
import { KeywordAnalyzerTab } from "./keyword-analyzer-tab";
import type { KeywordRankSnapshot } from "./keyword-rank-chart";

// Re-export types from the shared types file so existing importers stay unchanged.
export type {
  ArticleIdeaImportHistory,
  ArticleIdeaSourceRow,
  GscQueryMetric,
  KeywordAlertRow,
  KeywordAnalysisResult,
  KeywordOpportunityRow,
  KeywordSourceFilter,
  TrackedKeywordRow,
} from "./keyword-tracking-types";
import type {
  ArticleIdeaImportHistory,
  ArticleIdeaSourceRow,
  GscQueryMetric,
  KeywordAlertRow,
  KeywordAnalysisResult,
  KeywordOpportunityRow,
  KeywordSourceFilter,
  TrackedKeywordRow,
} from "./keyword-tracking-types";

// ─── Private helpers ──────────────────────────────────────────────────────────

const IMPORT_SOURCES = new Set(["csv_import", "google_sheets", "manual"]);

type TabId = "ideas" | "import" | "tracking" | "analyzer";

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

// ─── Main component ───────────────────────────────────────────────────────────

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
        <KeywordIdeasTab
          opportunities={filteredOpportunities}
          queryMetrics={queryMetrics}
          opportunitiesLoading={opportunitiesLoading}
          alerts={alerts}
          sourceFilter={sourceFilter}
          onSourceFilterChange={onSourceFilterChange}
          gscStatus={gscStatus}
          semrushStatus={semrushStatus}
          statusLoading={statusLoading}
          discovering={discovering}
          syncingGsc={syncingGsc}
          onDiscover={onDiscover}
          onGscSync={onGscSync}
          onQueueOpportunity={onQueueOpportunity}
          onQueueAndGenerate={onQueueAndGenerate}
          onDismissOpportunity={onDismissOpportunity}
          queueingId={queueingId}
          generatingId={generatingId}
          dismissingId={dismissingId}
          settingsHref={settingsHref}
          visibilityHref={visibilityHref}
          studioHref={studioHref}
          contentPieceHref={contentPieceHref}
          renderLink={renderLink}
        />
      ) : null}

      {activeTab === "import" ? (
        <KeywordImportTab
          canImport={canImport}
          sheetsStatusMessage={sheetsStatusMessage}
          manualKeyword={manualKeyword}
          manualTitle={manualTitle}
          manualAngle={manualAngle}
          onManualKeywordChange={onManualKeywordChange}
          onManualTitleChange={onManualTitleChange}
          onManualAngleChange={onManualAngleChange}
          onManualImport={onManualImport}
          manualImporting={manualImporting}
          onCsvImport={onCsvImport}
          csvImporting={csvImporting}
          sheetSources={sheetSources}
          sheetSourcesLoading={sheetSourcesLoading}
          sheetLabel={sheetLabel}
          sheetUrl={sheetUrl}
          sheetName={sheetName}
          onSheetLabelChange={onSheetLabelChange}
          onSheetUrlChange={onSheetUrlChange}
          onSheetNameChange={onSheetNameChange}
          onCreateSheetSource={onCreateSheetSource}
          creatingSheetSource={creatingSheetSource}
          onSyncSheetSource={onSyncSheetSource}
          onDeleteSheetSource={onDeleteSheetSource}
          onConnectSheetSource={onConnectSheetSource}
          syncingSheetId={syncingSheetId}
          importHistory={importHistory}
          importLoading={importLoading}
        />
      ) : null}

      {activeTab === "tracking" ? (
        <KeywordTrackingTab
          tracked={tracked}
          trackInput={trackInput}
          onTrackInputChange={onTrackInputChange}
          onTrackKeyword={onTrackKeyword}
          tracking={tracking}
          selectedTrackedId={selectedTrackedId}
          onSelectTracked={onSelectTracked}
          onDeleteTracked={onDeleteTracked}
          snapshots={snapshots}
        />
      ) : null}

      {activeTab === "analyzer" ? (
        <KeywordAnalyzerTab
          keywordInput={keywordInput}
          websiteUrl={websiteUrl}
          onKeywordInputChange={onKeywordInputChange}
          onWebsiteUrlChange={onWebsiteUrlChange}
          onAnalyze={onAnalyze}
          analyzing={analyzing}
          analysis={analysis}
        />
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
