import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AutopilotView,
  GeoAuditDetailView,
  GeoAuditListView,
  GeoAuditRunPanel,
  GrowthRoadmapView,
  HelpView,
  KeywordTrackingView,
  isSiteAdmin,
  isSuperAdmin,
  type KeywordAnalysisResult,
  type KeywordSourceFilter,
  PartnerWorkspaceView,
  ResearchCompetitorsView,
  ResearchOverviewView,
  ResearchSignalsView,
  buildResearchActionPaths,
  flattenCompetitorAnalysis,
  SearchHubGrid,
  SearchPerformanceView,
  SearchSiteHealthView,
  SearchSuggestionsView,
  SearchVisibilityView,
  SocialHubView,
  StrategyCalendarView,
  StrategyGoalsView,
  StrategyHubGrid,
  StrategyRoadmapsView,
  StrategyTopicalMapView,
  type CompetitorAnalysisResult,
  type RedditThread,
  type VisibilitySettings,
  type VisibilitySummary,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { NewProjectButton } from "@/components/NewProjectButton";
import { SectionShell } from "@/components/SectionShell";
import { useActiveProject } from "@/hooks/use-active-project";
import { useAuditDetailData, useAuditListData } from "@/hooks/use-audit-data";
import { useAutopilotData } from "@/hooks/use-autopilot-data";
import { useProjectsData } from "@/hooks/use-projects-data";
import {
  useArticleIdeasImports,
  useArticleIdeaSources,
  useArticlePerformance,
  useBrandKeywords,
  useBriefsData,
  useCalendarPieces,
  useCompetitorAnalyses,
  useGoalsData,
  useGrowthRoadmap,
  useGscQueries,
  useGscSyncStatus,
  useHelpChecklist,
  useKeywordIntelligence,
  useKeywordOpportunities,
  useKeywordSnapshots,
  usePartnerProjects,
  useRoadmapsCatalog,
  useSemrushStatus,
  useTrackedKeywords,
  useVisibilitySettings,
  useVisibilitySummary,
} from "@/hooks/use-section-queries";
import { useSocialData } from "@/hooks/use-social-data";
import { apiFetch, getApiBase, getAppOrigin } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";
import { projectDetailPath } from "@workspace/app-shell";

const strategyTabs = [
  { label: "Overview", to: "/strategy" },
  { label: "Goals", to: "/strategy/goals" },
  { label: "Calendar", to: "/strategy/calendar" },
  { label: "Roadmaps", to: "/strategy/roadmaps" },
  { label: "Topical map", to: "/strategy/topical-map" },
];

const searchTabs = [
  { label: "Overview", to: "/search" },
  { label: "Keywords", to: "/search/keywords" },
  { label: "Visibility", to: "/search/visibility" },
  { label: "Performance", to: "/search/performance" },
  { label: "Site", to: "/search/site" },
  { label: "Suggestions", to: "/search/suggestions" },
];

const researchTabs = [
  { label: "Overview", to: "/research" },
  { label: "Competitors", to: "/research/competitors" },
  { label: "Signals", to: "/research/reddit" },
];

const renderLink = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <Link to={href} className={className}>
    {children}
  </Link>
);

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 27);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export function StrategyHubPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell title="Strategy" description="Plan goals, editorial calendar, and roadmap alignment." tabs={strategyTabs}>
      <StrategyHubGrid projectId={projectId} renderLink={renderLink} />
    </SectionShell>
  );
}

export function StrategyGoalsPage() {
  const { projectId, activeProject } = useActiveProject();
  const { goals, error } = useGoalsData(projectId);
  const { briefs } = useBriefsData(projectId);
  const { gscStatus } = useGscSyncStatus(projectId);
  const [goalForm, setGoalForm] = useState({ objective: "traffic", targetMetric: "" });
  const [saving, setSaving] = useState(false);
  const [compilingGoalId, setCompilingGoalId] = useState<number | null>(null);

  async function createGoal() {
    if (!projectId || !goalForm.targetMetric.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectId),
          objective: goalForm.objective,
          targetMetric: goalForm.targetMetric,
        }),
      });
      setGoalForm({ objective: "traffic", targetMetric: "" });
    } finally {
      setSaving(false);
    }
  }

  async function compileBriefs(goalId: number) {
    setCompilingGoalId(goalId);
    try {
      await apiFetch(`/api/goals/${goalId}/compile-briefs`, { method: "POST" });
    } finally {
      setCompilingGoalId(null);
    }
  }

  return (
    <SectionShell title="Strategy goals" description="Active growth goals for this project." tabs={strategyTabs}>
      <StrategyGoalsView
        goals={goals}
        briefs={briefs}
        error={error}
        saving={saving}
        goalForm={goalForm}
        onGoalFormChange={setGoalForm}
        onCreateGoal={() => void createGoal()}
        onCompileBriefs={(id) => void compileBriefs(id)}
        compilingGoalId={compilingGoalId}
        gscStatus={gscStatus}
        renderLink={renderLink}
        projectDetailHref={activeProject ? `/projects/${activeProject.id}` : undefined}
      />
    </SectionShell>
  );
}

export function StrategyCalendarPage() {
  const { projectId } = useActiveProject();
  const { pieces, error } = useCalendarPieces(projectId);

  return (
    <SectionShell title="Editorial calendar" description="Content scheduled by planned date." tabs={strategyTabs}>
      <StrategyCalendarView pieces={pieces} projectId={projectId} error={error} renderLink={renderLink} />
    </SectionShell>
  );
}

export function StrategyRoadmapsPage() {
  const { roadmaps, error } = useRoadmapsCatalog();

  return (
    <SectionShell title="Roadmaps" description="Programmatic growth roadmaps catalog." tabs={strategyTabs} requireProject={false}>
      <StrategyRoadmapsView roadmaps={roadmaps} error={error} renderLink={renderLink} />
    </SectionShell>
  );
}

export function StrategyTopicalMapPage() {
  const { projectId, activeProject } = useActiveProject();
  const { keywords, error } = useBrandKeywords(projectId);
  const { briefs } = useBriefsData(projectId);
  const briefClusters = useMemo(() => {
    const map = new Map<string, number>();
    for (const brief of briefs) {
      const cluster = brief.targetKeywordCluster?.trim() || "Unclustered";
      map.set(cluster, (map.get(cluster) ?? 0) + 1);
    }
    return [...map.entries()].map(([cluster, count]) => ({ cluster, count }));
  }, [briefs]);

  return (
    <SectionShell title="Topical map" description="Primary keyword clusters from your brand profile." tabs={strategyTabs}>
      <StrategyTopicalMapView
        keywords={keywords}
        briefClusters={briefClusters}
        error={error}
        renderLink={renderLink}
        projectDetailHref={activeProject ? `/projects/${activeProject.id}` : undefined}
      />
    </SectionShell>
  );
}

export function SearchHubPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell title="Search" description="Keywords, visibility, and site health." tabs={searchTabs}>
      <SearchHubGrid projectId={projectId} renderLink={renderLink} />
    </SectionShell>
  );
}

export function SearchKeywordsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, orgRole } = useAuth();
  const { projectId, activeProject } = useActiveProject();
  const canImport = isSuperAdmin(user?.role) || isSiteAdmin(orgRole);
  const { keywords, loading: trackedLoading, refetch: refetchTracked } = useTrackedKeywords(projectId);
  const {
    opportunities,
    alerts,
    isLoading: intelligenceLoading,
    refetch: refetchIntelligence,
  } = useKeywordIntelligence(projectId);
  const { gscStatus, isFetching: gscFetching } = useGscSyncStatus(projectId);
  const { status: semrushStatus, isFetching: semrushFetching } = useSemrushStatus(projectId);
  const { queries: gscQueries } = useGscQueries(projectId, Boolean(gscStatus?.connected));

  const [activeTab, setActiveTab] = useState<"ideas" | "import" | "tracking" | "analyzer">("ideas");
  const [sourceFilter, setSourceFilter] = useState<KeywordSourceFilter>("all");
  const [trackInput, setTrackInput] = useState("");
  const [selectedTrackedId, setSelectedTrackedId] = useState<number | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState(activeProject?.url ?? "");
  const [analysis, setAnalysis] = useState<KeywordAnalysisResult | null>(null);
  const [manualKeyword, setManualKeyword] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualAngle, setManualAngle] = useState("");
  const [discovering, setDiscovering] = useState<string | null>(null);
  const [syncingGsc, setSyncingGsc] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [queueingId, setQueueingId] = useState<number | null>(null);
  const [dismissingId, setDismissingId] = useState<number | null>(null);
  const [manualImporting, setManualImporting] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sheetLabel, setSheetLabel] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [creatingSheetSource, setCreatingSheetSource] = useState(false);
  const [syncingSheetId, setSyncingSheetId] = useState<number | null>(null);
  const [sheetsStatusMessage, setSheetsStatusMessage] = useState<string | null>(null);

  const { snapshots: trackedSnapshots } = useKeywordSnapshots(selectedTrackedId);
  const { imports: importHistory, loading: importLoading, refetch: refetchImports } =
    useArticleIdeasImports(projectId);
  const {
    sources: sheetSources,
    loading: sheetSourcesLoading,
    refetch: refetchSheetSources,
  } = useArticleIdeaSources(projectId);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "import" || tab === "tracking" || tab === "analyzer" || tab === "ideas") {
      setActiveTab(tab);
    }
    const source = searchParams.get("source");
    if (
      source === "all" ||
      source === "semrush" ||
      source === "gsc_query" ||
      source === "csv_import" ||
      source === "google_sheets" ||
      source === "manual" ||
      source === "imports" ||
      source === "ai_analysis" ||
      source === "competitor_gap" ||
      source === "rank_drop"
    ) {
      setSourceFilter(source);
    }
    const keyword = searchParams.get("keyword")?.trim();
    if (keyword) {
      setKeywordInput(keyword);
      setTrackInput(keyword);
      if (!tab) setActiveTab("analyzer");
    }
    const sheets = searchParams.get("sheets");
    if (sheets === "connected") {
      setSheetsStatusMessage("Google Sheets connected.");
      void refetchSheetSources();
      void refetchImports();
      void refetchIntelligence();
    } else if (sheets === "error") {
      setSheetsStatusMessage("Google Sheets connection failed.");
    } else if (sheets === "forbidden") {
      setSheetsStatusMessage("Only site admins can connect Google Sheets for this project.");
    }
  }, [searchParams, refetchSheetSources, refetchImports, refetchIntelligence]);

  useEffect(() => {
    if (activeProject?.url) setWebsiteUrl(activeProject.url);
    setAnalysis(null);
    setSelectedTrackedId(null);
    setKeywordInput("");
    setTrackInput("");
  }, [projectId, activeProject?.url]);

  const showInitialLoad =
    Boolean(projectId) && trackedLoading && intelligenceLoading && keywords.length === 0;

  async function invalidateKeywordQueries() {
    if (!projectId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.keywordOpportunities(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.keywordAlerts(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gscSyncStatus(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.semrushStatus(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.gscQueries(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.articleIdeas(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.articleIdeaSources(projectId) }),
    ]);
  }

  function sheetsReturnUrl() {
    return `${getAppOrigin()}/search/keywords?tab=import`;
  }

  function sheetsConnectUrl(sourceId: number) {
    const params = new URLSearchParams({
      projectId: String(projectId),
      sourceId: String(sourceId),
      returnUrl: sheetsReturnUrl(),
    });
    return `${getApiBase()}/api/auth/google-sheets?${params}`;
  }

  async function handleGscSync() {
    if (!projectId) return;
    setSyncingGsc(true);
    setActionError(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/search-properties/gsc/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await invalidateKeywordQueries();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "GSC sync failed");
    } finally {
      setSyncingGsc(false);
    }
  }

  async function handleDiscover(source: "semrush" | "gsc" | "ai", refresh = false) {
    if (!projectId) return;
    setDiscovering(source);
    setActionError(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/keyword-opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, refresh }),
      });
      await invalidateKeywordQueries();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(null);
    }
  }

  async function handleQueueOpportunity(id: number) {
    setQueueingId(id);
    setActionError(null);
    try {
      await apiFetch(`/api/keyword-opportunities/${id}`, { method: "POST" });
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to queue opportunity");
    } finally {
      setQueueingId(null);
    }
  }

  async function handleDismissOpportunity(id: number) {
    setDismissingId(id);
    setActionError(null);
    try {
      await apiFetch(`/api/keyword-opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to dismiss");
    } finally {
      setDismissingId(null);
    }
  }

  async function handleTrackKeyword() {
    if (!projectId || !trackInput.trim()) return;
    setTracking(true);
    setActionError(null);
    try {
      await apiFetch("/api/tracked-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteProjectId: Number(projectId),
          keyword: trackInput.trim(),
          targetUrl: websiteUrl || undefined,
        }),
      });
      setTrackInput("");
      await refetchTracked();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to track keyword");
    } finally {
      setTracking(false);
    }
  }

  async function handleDeleteTracked(id: number) {
    setActionError(null);
    try {
      await apiFetch(`/api/tracked-keywords/${id}`, { method: "DELETE" });
      if (selectedTrackedId === id) setSelectedTrackedId(null);
      await refetchTracked();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove keyword");
    }
  }

  async function handleAnalyze() {
    const keywordsToAnalyze = keywordInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (keywordsToAnalyze.length === 0) {
      setActionError("Enter at least one keyword");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    setActionError(null);
    try {
      const result = await apiFetch<KeywordAnalysisResult>("/api/keyword-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywordsToAnalyze,
          websiteUrl: websiteUrl || undefined,
          websiteProjectId: projectId ? Number(projectId) : undefined,
        }),
      });
      setAnalysis(result);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleManualImport() {
    if (!projectId || !manualKeyword.trim() || !manualTitle.trim()) return;
    setManualImporting(true);
    setActionError(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/article-ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: manualKeyword.trim(),
          suggestedTitle: manualTitle.trim(),
          suggestedAngle: manualAngle.trim(),
        }),
      });
      setManualKeyword("");
      setManualTitle("");
      setManualAngle("");
      await refetchImports();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to add idea");
    } finally {
      setManualImporting(false);
    }
  }

  async function handleCsvImport(file: File) {
    if (!projectId) return;
    setCsvImporting(true);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `${getApiBase()}/api/website-projects/${projectId}/article-ideas/import`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          (body && typeof body === "object" && "error" in body && String(body.error)) ||
            "CSV import failed",
        );
      }
      await refetchImports();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setCsvImporting(false);
    }
  }

  async function handleCreateSheetSource() {
    if (!projectId || !sheetLabel.trim() || !sheetUrl.trim()) return;
    setCreatingSheetSource(true);
    setActionError(null);
    try {
      const data = await apiFetch<{ source?: { id: number } }>(
        `/api/website-projects/${projectId}/article-idea-sources`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: sheetLabel.trim(),
            spreadsheetUrl: sheetUrl.trim(),
            sheetName: sheetName.trim() || undefined,
          }),
        },
      );
      setSheetLabel("");
      setSheetUrl("");
      setSheetName("");
      await refetchSheetSources();
      if (data.source?.id) {
        window.location.href = sheetsConnectUrl(data.source.id);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create sheet source");
    } finally {
      setCreatingSheetSource(false);
    }
  }

  async function handleSyncSheetSource(sourceId: number) {
    if (!projectId) return;
    setSyncingSheetId(sourceId);
    setActionError(null);
    try {
      const response = await fetch(
        `${getApiBase()}/api/website-projects/${projectId}/article-idea-sources/sync`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sourceId }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (
          body &&
          typeof body === "object" &&
          "connectUrl" in body &&
          typeof body.connectUrl === "string"
        ) {
          window.location.href = sheetsConnectUrl(sourceId);
          return;
        }
        throw new Error(
          (body && typeof body === "object" && "error" in body && String(body.error)) ||
            "Sheet sync failed",
        );
      }
      await refetchSheetSources();
      await refetchImports();
      await refetchIntelligence();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Sheet sync failed");
    } finally {
      setSyncingSheetId(null);
    }
  }

  async function handleDeleteSheetSource(sourceId: number) {
    if (!projectId) return;
    setActionError(null);
    try {
      await apiFetch(
        `/api/website-projects/${projectId}/article-idea-sources?sourceId=${sourceId}`,
        { method: "DELETE" },
      );
      await refetchSheetSources();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove sheet source");
    }
  }

  function handleConnectSheetSource(sourceId: number) {
    window.location.href = sheetsConnectUrl(sourceId);
  }

  function handleTabChange(tab: "ideas" | "import" | "tracking" | "analyzer") {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }

  function handleSourceFilterChange(filter: KeywordSourceFilter) {
    setSourceFilter(filter);
    const next = new URLSearchParams(searchParams);
    if (filter === "all") {
      next.delete("source");
    } else {
      next.set("source", filter);
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <SectionShell
      title="Keyword research"
      description="Article ideas from Search Console, imports, rank tracking, and AI analysis."
      tabs={searchTabs}
    >
      <KeywordTrackingView
        projectId={projectId}
        projectName={activeProject?.name ?? null}
        loading={showInitialLoad}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        opportunities={opportunities}
        opportunitiesLoading={intelligenceLoading}
        alerts={alerts}
        sourceFilter={sourceFilter}
        onSourceFilterChange={handleSourceFilterChange}
        gscStatus={gscStatus}
        semrushStatus={semrushStatus}
        gscQueries={gscQueries}
        statusLoading={gscFetching || semrushFetching}
        discovering={discovering}
        syncingGsc={syncingGsc}
        onDiscover={handleDiscover}
        onGscSync={() => void handleGscSync()}
        onQueueOpportunity={(id) => void handleQueueOpportunity(id)}
        onDismissOpportunity={(id) => void handleDismissOpportunity(id)}
        queueingId={queueingId}
        dismissingId={dismissingId}
        tracked={keywords}
        trackInput={trackInput}
        onTrackInputChange={setTrackInput}
        onTrackKeyword={() => void handleTrackKeyword()}
        tracking={tracking}
        selectedTrackedId={selectedTrackedId}
        onSelectTracked={setSelectedTrackedId}
        onDeleteTracked={(id) => void handleDeleteTracked(id)}
        snapshots={trackedSnapshots}
        keywordInput={keywordInput}
        websiteUrl={websiteUrl}
        onKeywordInputChange={setKeywordInput}
        onWebsiteUrlChange={setWebsiteUrl}
        onAnalyze={() => void handleAnalyze()}
        analyzing={analyzing}
        analysis={analysis}
        importHistory={importHistory}
        importLoading={importLoading}
        manualKeyword={manualKeyword}
        manualTitle={manualTitle}
        manualAngle={manualAngle}
        onManualKeywordChange={setManualKeyword}
        onManualTitleChange={setManualTitle}
        onManualAngleChange={setManualAngle}
        onManualImport={() => void handleManualImport()}
        manualImporting={manualImporting}
        onCsvImport={(file) => void handleCsvImport(file)}
        csvImporting={csvImporting}
        canImport={canImport}
        sheetsStatusMessage={sheetsStatusMessage}
        sheetSources={sheetSources}
        sheetSourcesLoading={sheetSourcesLoading}
        sheetLabel={sheetLabel}
        sheetUrl={sheetUrl}
        sheetName={sheetName}
        onSheetLabelChange={setSheetLabel}
        onSheetUrlChange={setSheetUrl}
        onSheetNameChange={setSheetName}
        onCreateSheetSource={() => void handleCreateSheetSource()}
        creatingSheetSource={creatingSheetSource}
        onSyncSheetSource={(id) => void handleSyncSheetSource(id)}
        onDeleteSheetSource={(id) => void handleDeleteSheetSource(id)}
        onConnectSheetSource={handleConnectSheetSource}
        syncingSheetId={syncingSheetId}
        settingsHref="/integrations/tools"
        visibilityHref="/search/visibility"
        studioHref={(opp) =>
          projectId
            ? `/projects/${projectId}/content-studio?create=1&keyword=${encodeURIComponent(opp.keyword)}&title=${encodeURIComponent(opp.suggestedTitle)}`
            : "/projects"
        }
        renderLink={renderLink}
        error={actionError}
      />
    </SectionShell>
  );
}

export function SearchVisibilityPage() {
  const { projectId, activeProject } = useActiveProject();
  const { settings, error: settingsError } = useVisibilitySettings(projectId);
  const { summary, error: summaryError, refetch } = useVisibilitySummary(projectId);
  const [saving, setSaving] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);

  async function saveSettings(next: VisibilitySettings) {
    if (!projectId) return;
    setSaving(true);
    try {
      await apiFetch(`/api/website-projects/${projectId}/visibility-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } finally {
      setSaving(false);
    }
  }

  async function runCheck() {
    if (!projectId) return;
    setRunningCheck(true);
    try {
      await apiFetch(`/api/website-projects/${projectId}/visibility/check`, { method: "POST" });
      await refetch();
    } finally {
      setRunningCheck(false);
    }
  }

  return (
    <SectionShell title="AI visibility" description="LLM tracking and GEO re-audit settings." tabs={searchTabs}>
      <SearchVisibilityView
        settings={(settings as VisibilitySettings | null) ?? null}
        summary={(summary as VisibilitySummary | null) ?? null}
        error={settingsError ?? summaryError}
        saving={saving}
        onSettingsChange={(next) => void saveSettings(next)}
        onRunCheck={() => void runCheck()}
        runningCheck={runningCheck}
        integrationsHref={projectId ? `/projects/${projectId}/integrations` : "/integrations"}
        brandProfileHref={activeProject ? `/projects/${activeProject.id}` : undefined}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function SearchPerformancePage() {
  const { projectId } = useActiveProject();
  const initial = useMemo(() => defaultDateRange(), []);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [sortKey, setSortKey] = useState<"sessions" | "clicks">("sessions");
  const { data, loading, error, refetch } = useArticlePerformance(projectId, startDate, endDate);

  return (
    <SectionShell title="Search performance" description="GSC and GA4 performance for published articles." tabs={searchTabs}>
      <SearchPerformanceView
        data={data}
        loading={loading}
        error={error}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onRefresh={() => void refetch()}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        integrationsHref={projectId ? `/projects/${projectId}/integrations` : "/integrations"}
        renderLink={renderLink}
        contentPieceHref={(id) => `/content-piece/${id}`}
      />
    </SectionShell>
  );
}

export function SearchSitePage() {
  const { activeProject, projectId } = useActiveProject();
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  async function runCrawl() {
    if (!projectId) return;
    setScraping(true);
    setScrapeMessage(null);
    try {
      await apiFetch(`/api/website-projects/${projectId}/scrape`, { method: "POST" });
      setScrapeMessage("Site crawl queued. Refresh in a minute to see updated page count.");
    } catch (err) {
      setScrapeMessage(err instanceof Error ? err.message : "Failed to queue crawl");
    } finally {
      setScraping(false);
    }
  }

  return (
    <SectionShell title="Site health" description="Crawl status and page inventory." tabs={searchTabs}>
      <SearchSiteHealthView
        crawlStatus={activeProject?.crawlStatus}
        pageCount={activeProject?.pageCount}
        url={activeProject?.url}
        scraping={scraping}
        scrapeMessage={scrapeMessage}
        onRunCrawl={() => void runCrawl()}
      />
    </SectionShell>
  );
}

export function SearchSuggestionsPage() {
  const { projectId } = useActiveProject();
  const { opportunities, error } = useKeywordOpportunities(projectId);

  return (
    <SectionShell title="Keyword suggestions" description="Open keyword opportunities scored for your project." tabs={searchTabs}>
      <SearchSuggestionsView opportunities={opportunities} error={error} />
    </SectionShell>
  );
}

export function AuditListPage() {
  const navigate = useNavigate();
  const { activeProject, projectId } = useActiveProject();
  const { audits, loading, error, reload } = useAuditListData();
  const [auditUrl, setAuditUrl] = useState(activeProject?.url ?? "");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  async function runAudit() {
    const url = auditUrl.trim();
    if (!url) return;
    setRunning(true);
    setRunError(null);
    try {
      const data = await apiFetch<{ id?: number; audit?: { id?: number }; error?: string }>(
        "/api/geo-audits/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            websiteProjectId: projectId ? Number(projectId) : undefined,
          }),
        },
      );
      const id = data.id ?? data.audit?.id;
      if (id) {
        await reload();
        navigate(`/audit/${id}`);
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <SectionShell title="GEO audits" description="Generative engine optimization audits for your URLs." requireProject={false}>
      <GeoAuditListView
        audits={audits}
        loading={loading}
        error={error}
        renderLink={renderLink}
        runPanel={
          <GeoAuditRunPanel
            url={auditUrl}
            onUrlChange={setAuditUrl}
            onSubmit={() => void runAudit()}
            running={running}
            error={runError}
          />
        }
      />
    </SectionShell>
  );
}

export function AuditDetailPage({ auditId }: { auditId: string }) {
  const { audit, loading, error } = useAuditDetailData(auditId);

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <GeoAuditDetailView audit={audit} loading={loading} error={error} renderLink={renderLink} />
    </div>
  );
}

export function ResearchHubPage() {
  const { projectId } = useActiveProject();
  const { analyses, loading, error } = useCompetitorAnalyses(projectId);
  const paths = useMemo(
    () =>
      buildResearchActionPaths({
        projectId,
        studioBase: projectId ? `/projects/${projectId}/content-studio` : "/projects",
      }),
    [projectId],
  );

  return (
    <SectionShell
      title="Research"
      description="Competitive landscape and demand signals for this project"
      tabs={researchTabs}
    >
      <ResearchOverviewView
        analyses={analyses}
        loading={loading}
        error={error}
        paths={paths}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function ResearchCompetitorsPage() {
  const { projectId } = useActiveProject();
  const [searchParams] = useSearchParams();
  const industryParam = searchParams.get("industry")?.trim() ?? "";
  const analysisParam = searchParams.get("analysis");
  const initialAnalysisId = analysisParam ? Number(analysisParam) : null;
  const { analyses, loading, error, reload } = useCompetitorAnalyses(projectId);
  const paths = useMemo(
    () =>
      buildResearchActionPaths({
        projectId,
        studioBase: projectId ? `/projects/${projectId}/content-studio` : "/projects",
      }),
    [projectId],
  );
  const [form, setForm] = useState({
    competitorUrl: "",
    industry: industryParam,
    location: "",
    stage: "early",
  });
  const [formOpen, setFormOpen] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<(CompetitorAnalysisResult & { competitorUrl?: string; id?: number }) | null>(
    null,
  );
  const [resultLoading, setResultLoading] = useState(false);

  useEffect(() => {
    if (industryParam) {
      setForm((prev) => ({ ...prev, industry: prev.industry || industryParam }));
    }
  }, [industryParam]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void apiFetch<{ industry?: string } | null>(`/api/website-projects/${projectId}/brand-profile`)
      .then((profile) => {
        if (cancelled || !profile?.industry) return;
        setForm((prev) => ({ ...prev, industry: prev.industry || profile.industry || "" }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    setResult(null);
    setSelectedId(null);
    setFormOpen(true);
  }, [projectId]);

  useEffect(() => {
    if (analyses.length === 0) {
      setFormOpen(true);
      return;
    }
    setFormOpen(false);
    if (selectedId != null) return;
    const preferred =
      initialAnalysisId && analyses.some((row) => row.id === initialAnalysisId)
        ? initialAnalysisId
        : analyses[0]!.id;
    setSelectedId(preferred);
  }, [analyses, initialAnalysisId, selectedId]);

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    setResultLoading(true);
    void apiFetch(`/api/competitor-analyses/${selectedId}`)
      .then((data) => {
        if (cancelled) return;
        setResult(flattenCompetitorAnalysis(data));
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      })
      .finally(() => {
        if (!cancelled) setResultLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function analyze() {
    if (!form.competitorUrl || !form.industry || !form.location) return;
    setAnalyzing(true);
    try {
      const data = await apiFetch("/api/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, websiteProjectId: projectId ? Number(projectId) : undefined }),
      });
      const flat = flattenCompetitorAnalysis(data);
      setResult(flat);
      if (flat?.id != null) setSelectedId(flat.id);
      setFormOpen(false);
      await reload();
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <SectionShell
      title="Competitor research"
      description="AI-powered competitive intelligence."
      tabs={researchTabs}
    >
      <ResearchCompetitorsView
        analyses={analyses}
        loading={loading}
        error={error}
        form={form}
        onFormChange={setForm}
        onAnalyze={() => void analyze()}
        analyzing={analyzing}
        result={result}
        resultLoading={resultLoading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        formOpen={formOpen}
        onFormOpenChange={setFormOpen}
        paths={paths}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function ResearchRedditPage() {
  const { projectId } = useActiveProject();
  const [threads, setThreads] = useState<RedditThread[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paths = useMemo(
    () =>
      buildResearchActionPaths({
        projectId,
        studioBase: projectId ? `/projects/${projectId}/content-studio` : "/projects",
      }),
    [projectId],
  );

  useEffect(() => {
    setThreads([]);
    setError(null);
  }, [projectId]);

  async function discover() {
    if (!projectId) return;
    setDiscovering(true);
    setError(null);
    try {
      const data = await apiFetch<{ threads?: RedditThread[]; error?: string }>(
        "/api/reddit-discovery",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: Number(projectId) }),
        },
      );
      setThreads(data.threads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
      setThreads([]);
    } finally {
      setDiscovering(false);
    }
  }

  return (
    <SectionShell
      title="Signals"
      description="Community demand signals for content angles."
      tabs={researchTabs}
    >
      <ResearchSignalsView
        projectId={projectId}
        threads={threads}
        discovering={discovering}
        error={error}
        onDiscover={() => void discover()}
        paths={paths}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function AutopilotPage() {
  const { projectId } = useActiveProject();
  const { settings, loading, error, saveSettings, saving } = useAutopilotData(projectId);

  return (
    <SectionShell title="Autopilot" description="Automated content cadence for the active project.">
      <AutopilotView settings={settings} loading={loading} error={error} onSave={projectId ? saveSettings : undefined} saving={saving} />
    </SectionShell>
  );
}

export function SocialHubPage() {
  const { projectId } = useActiveProject();
  const hub = useSocialData(projectId);
  const studioHref = projectId ? `/projects/${projectId}/content-studio` : "/projects";
  const integrationsHref = projectId ? `/projects/${projectId}/integrations` : "/integrations";

  return (
    <SectionShell title="Social hub" description="Schedule and publish social variants.">
      {hub.flash ? (
        <div
          className={
            hub.flash.level === "error"
              ? "mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              : "mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground"
          }
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{hub.flash.message}</span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => hub.clearFlash()}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <SocialHubView
        projectId={projectId}
        studioHref={studioHref}
        integrationsHref={integrationsHref}
        pieceHref={(pieceId) => `/content-piece/${pieceId}`}
        renderLink={renderLink}
        tab={hub.tab}
        onTabChange={hub.setTab}
        queue={hub.queue}
        queueLoading={hub.queueLoading}
        queueError={hub.queueError}
        platformFilter={hub.platformFilter}
        onPlatformFilterChange={hub.setPlatformFilter}
        onRefreshQueue={() => void hub.reloadQueue()}
        onSubmitReview={(id) => void hub.submitReview(id)}
        onApprove={(id) => void hub.approvePiece(id)}
        onSchedule={(id, value) => void hub.schedulePiece(id, value)}
        reschedulingId={hub.reschedulingId}
        onReschedule={(pieceId, dateKey) => void hub.reschedulePiece(pieceId, dateKey)}
        composerParents={hub.composerParents}
        composerParentsLoading={hub.composerParentsLoading}
        composerConnected={hub.composerConnected}
        composing={hub.composing}
        composed={hub.composed}
        onCompose={(parentId, platforms) => void hub.compose(parentId, platforms)}
        metrics={hub.metrics}
        metricsLoading={hub.metricsLoading}
        metricsPlatformFilter={hub.metricsPlatformFilter}
        onMetricsPlatformFilterChange={hub.setMetricsPlatformFilter}
        metricsSyncing={hub.metricsSyncing}
        metricsLastSyncedAt={hub.metricsLastSyncedAt}
        onSyncMetrics={() => void hub.syncMetrics()}
        voicePlatform={hub.voicePlatform}
        voiceChannel={hub.voiceChannel}
        importText={hub.importText}
        voiceLoading={hub.voiceLoading}
        historySync={hub.historySync}
        syncingVoice={hub.syncingVoice}
        channelData={hub.channelData}
        onVoicePlatformChange={hub.setVoicePlatform}
        onVoiceChannelChange={hub.setVoiceChannel}
        onImportTextChange={hub.setImportText}
        onSyncVoiceFromOAuth={() => void hub.syncVoiceFromOAuth()}
        onImportVoice={() => void hub.importVoice()}
        onAnalyzeVoice={() => void hub.analyzeVoice()}
        settings={hub.settings}
        settingsLoading={hub.settingsLoading}
        onSettingsChange={hub.setSettings}
        onSaveSettings={() => void hub.saveSettings()}
      />
    </SectionShell>
  );
}

export function PartnerPage() {
  const { organizationName, user, loading: authLoading } = useAuth();
  const { projects, loading, error } = usePartnerProjects();

  return (
    <SectionShell title="Partner portal" description="Agency billing and client workspaces." requireProject={false}>
      {authLoading && !user ? (
        <p className="text-sm text-muted-foreground">Loading organization…</p>
      ) : error ? (
        <PartnerWorkspaceView projects={[]} organizationName={organizationName} renderLink={renderLink} />
      ) : (
        <PartnerWorkspaceView projects={projects} organizationName={organizationName} renderLink={renderLink} />
      )}
      {loading ? <p className="mt-2 text-xs text-muted-foreground">Refreshing metrics…</p> : null}
    </SectionShell>
  );
}

export function HelpPage() {
  const { projects, projectId } = useActiveProject();
  const hasProject = projects.length > 0;
  const { hasCmsIntegration, hasContentPiece, loading: checklistLoading } = useHelpChecklist(projectId);

  return (
    <SectionShell title="Help" description="Product docs and setup guides." requireProject={false}>
      <HelpView
        advancedAppHref={getAppOrigin()}
        resourceLinks={[
          { label: "Help center on goals.ac", href: "https://goals.ac/help", description: "Guides, FAQs, and documentation." },
          { label: "Integrations setup", href: "https://goals.ac/help/integrations", description: "Connect CMS platforms." },
        ]}
        checklist={[
          { id: "project", label: "Create a website project", done: hasProject, href: "/projects" },
          { id: "brand", label: "Complete brand profile", done: false, href: projectId ? `/projects/${projectId}` : "/projects" },
          { id: "integrations", label: "Connect a CMS integration", done: !checklistLoading && hasCmsIntegration, href: projectId ? `/projects/${projectId}/integrations` : "/projects" },
          { id: "content", label: "Generate your first content piece", done: !checklistLoading && hasContentPiece, href: projectId ? `/projects/${projectId}/content-studio` : "/projects" },
        ]}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { loading, projects } = useProjectsData();

  if (loading && projects.length === 0) {
    return (
      <SectionShell title="Onboarding" description="Set up your first project." requireProject={false}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </SectionShell>
    );
  }

  if (projects.length === 0) {
    return (
      <SectionShell title="Onboarding" description="Set up your first project and brand profile." requireProject={false}>
        <div className="paper-card max-w-lg space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Create your first project to analyze your site and build your brand profile.
          </p>
          <NewProjectButton
            onCreated={(project) => {
              navigate(projectDetailPath(project.id));
            }}
          />
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell title="Onboarding" description="Set up your first project." requireProject={false}>
      <p className="text-sm text-muted-foreground">
        You already have projects. Visit{" "}
        <Link to="/projects" className="font-medium text-primary hover:underline">
          Projects
        </Link>{" "}
        to manage them.
      </p>
    </SectionShell>
  );
}

export function GrowthRoadmapPage({ slug }: { slug: string }) {
  const { roadmap, loading, error } = useGrowthRoadmap(slug);

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <GrowthRoadmapView roadmap={roadmap} slug={slug} loading={loading} error={error} renderLink={renderLink} />
    </div>
  );
}
