import { Link } from "react-router-dom";
import { KeywordTrackingView } from "@workspace/app-shell";
import { SectionShell } from "@/components/SectionShell";
import { useSearchKeywordsPage } from "@/hooks/use-search-keywords-page";

const searchTabs = [
  { label: "Overview", to: "/search" },
  { label: "Keywords", to: "/search/keywords" },
  { label: "Visibility", to: "/search/visibility" },
  { label: "Performance", to: "/search/performance" },
  { label: "Site", to: "/search/site" },
  { label: "Suggestions", to: "/search/suggestions" },
];

const renderLink = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <Link to={href} className={className}>
    {children}
  </Link>
);

export function SearchKeywordsPage() {
  const state = useSearchKeywordsPage();
  const { projectId, activeProject } = state;

  return (
    <SectionShell
      title="Keyword research"
      description="Article ideas from Search Console, imports, rank tracking, and AI analysis."
      tabs={searchTabs}
    >
      <KeywordTrackingView
        projectId={projectId}
        projectName={activeProject?.name ?? null}
        loading={state.showInitialLoad}
        activeTab={state.activeTab}
        onTabChange={state.handleTabChange}
        opportunities={state.opportunities}
        opportunitiesLoading={state.intelligenceLoading}
        alerts={state.alerts}
        sourceFilter={state.sourceFilter}
        onSourceFilterChange={state.handleSourceFilterChange}
        gscStatus={state.gscStatus}
        semrushStatus={state.semrushStatus}
        gscQueries={state.gscQueries}
        statusLoading={state.gscFetching || state.semrushFetching}
        discovering={state.discovering}
        syncingGsc={state.syncingGsc}
        onDiscover={state.handleDiscover}
        onGscSync={() => void state.handleGscSync()}
        onQueueOpportunity={(id) => void state.handleQueueOpportunity(id)}
        onQueueAndGenerate={(id) => void state.handleQueueAndGenerate(id)}
        onDismissOpportunity={(id) => void state.handleDismissOpportunity(id)}
        queueingId={state.queueingId}
        generatingId={state.generatingId}
        dismissingId={state.dismissingId}
        tracked={state.keywords}
        trackInput={state.trackInput}
        onTrackInputChange={state.setTrackInput}
        onTrackKeyword={() => void state.handleTrackKeyword()}
        tracking={state.tracking}
        selectedTrackedId={state.selectedTrackedId}
        onSelectTracked={state.setSelectedTrackedId}
        onDeleteTracked={(id) => void state.handleDeleteTracked(id)}
        snapshots={state.trackedSnapshots}
        keywordInput={state.keywordInput}
        websiteUrl={state.websiteUrl}
        onKeywordInputChange={state.setKeywordInput}
        onWebsiteUrlChange={state.setWebsiteUrl}
        onAnalyze={() => void state.handleAnalyze()}
        analyzing={state.analyzing}
        analysis={state.analysis}
        importHistory={state.importHistory}
        importLoading={state.importLoading}
        manualKeyword={state.manualKeyword}
        manualTitle={state.manualTitle}
        manualAngle={state.manualAngle}
        onManualKeywordChange={state.setManualKeyword}
        onManualTitleChange={state.setManualTitle}
        onManualAngleChange={state.setManualAngle}
        onManualImport={() => void state.handleManualImport()}
        manualImporting={state.manualImporting}
        onCsvImport={(file) => void state.handleCsvImport(file)}
        csvImporting={state.csvImporting}
        canImport={state.canImport}
        sheetsStatusMessage={state.sheetsStatusMessage}
        sheetSources={state.sheetSources}
        sheetSourcesLoading={state.sheetSourcesLoading}
        sheetLabel={state.sheetLabel}
        sheetUrl={state.sheetUrl}
        sheetName={state.sheetName}
        onSheetLabelChange={state.setSheetLabel}
        onSheetUrlChange={state.setSheetUrl}
        onSheetNameChange={state.setSheetName}
        onCreateSheetSource={() => void state.handleCreateSheetSource()}
        creatingSheetSource={state.creatingSheetSource}
        onSyncSheetSource={(id) => void state.handleSyncSheetSource(id)}
        onDeleteSheetSource={(id) => void state.handleDeleteSheetSource(id)}
        onConnectSheetSource={state.handleConnectSheetSource}
        syncingSheetId={state.syncingSheetId}
        settingsHref="/integrations/tools"
        visibilityHref="/search/visibility"
        studioHref={(opp) =>
          projectId
            ? `/projects/${projectId}/content-studio?create=1&keyword=${encodeURIComponent(opp.keyword)}&title=${encodeURIComponent(opp.suggestedTitle)}`
            : "/projects"
        }
        contentPieceHref={(pieceId) => `/content-piece/${pieceId}`}
        renderLink={renderLink}
        error={state.actionError}
      />
    </SectionShell>
  );
}
