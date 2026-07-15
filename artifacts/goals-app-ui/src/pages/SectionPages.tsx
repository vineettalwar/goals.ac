import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AutopilotView,
  GeoAuditDetailView,
  GeoAuditListView,
  GeoAuditRunPanel,
  GrowthRoadmapView,
  HelpView,
  isSiteAdmin,
  isSuperAdmin,
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
  parseSocialHubTab,
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
  useArticlePerformance,
  useBrandKeywords,
  useBriefsData,
  useCalendarPieces,
  useCompetitorAnalyses,
  useGoalsData,
  useGrowthRoadmap,
  useGscSyncStatus,
  useHelpChecklist,
  useKeywordOpportunities,
  usePartnerProjects,
  useRoadmapsCatalog,
  useVisibilitySettings,
  useVisibilitySummary,
} from "@/hooks/use-section-queries";
import { useSocialData } from "@/hooks/use-social-data";
import { apiFetch, getAppOrigin } from "@/lib/api";
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

export { SearchKeywordsPage } from "./SearchKeywordsPage";


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
  return (
    <SectionShell
      title="Competitor research"
      description="AI-powered competitive intelligence."
      tabs={researchTabs}
    >
      <ResearchCompetitorsBody key={projectId ?? "none"} projectId={projectId} />
    </SectionShell>
  );
}

function ResearchCompetitorsBody({ projectId }: { projectId: string | null }) {
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

  const { data: brandProfile } = useQuery({
    queryKey: ["brand-profile-industry", projectId],
    queryFn: () =>
      apiFetch<{ industry?: string } | null>(`/api/website-projects/${projectId}/brand-profile`),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({
    competitorUrl: "",
    industry: "",
    location: "",
    stage: "early",
  });
  const [formOpenOverride, setFormOpenOverride] = useState<boolean | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const preferredSelectedId = useMemo(() => {
    if (analyses.length === 0) return null;
    if (initialAnalysisId && analyses.some((row) => row.id === initialAnalysisId)) {
      return initialAnalysisId;
    }
    return analyses[0]?.id ?? null;
  }, [analyses, initialAnalysisId]);

  const activeSelectedId = selectedId ?? preferredSelectedId;
  const formOpen = formOpenOverride ?? analyses.length === 0;
  const formWithDefaults = {
    ...form,
    industry: form.industry || industryParam || brandProfile?.industry || "",
  };

  const detailQuery = useQuery({
    queryKey: ["competitor-analysis-detail", activeSelectedId],
    queryFn: async () => {
      const data = await apiFetch(`/api/competitor-analyses/${activeSelectedId}`);
      return flattenCompetitorAnalysis(data) as CompetitorAnalysisResult & {
        competitorUrl?: string;
        id?: number;
      };
    },
    enabled: activeSelectedId != null,
  });

  async function analyze() {
    if (!formWithDefaults.competitorUrl || !formWithDefaults.industry || !formWithDefaults.location) {
      return;
    }
    setAnalyzing(true);
    try {
      const data = await apiFetch("/api/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formWithDefaults,
          websiteProjectId: projectId ? Number(projectId) : undefined,
        }),
      });
      const flat = flattenCompetitorAnalysis(data) as CompetitorAnalysisResult & {
        competitorUrl?: string;
        id?: number;
      };
      if (flat?.id != null) setSelectedId(flat.id);
      setFormOpenOverride(false);
      await reload();
      await detailQuery.refetch();
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <ResearchCompetitorsView
      analyses={analyses}
      loading={loading}
      error={error}
      form={formWithDefaults}
      onFormChange={setForm}
      onAnalyze={() => void analyze()}
      analyzing={analyzing}
      result={detailQuery.data ?? null}
      resultLoading={detailQuery.isFetching}
      selectedId={activeSelectedId}
      onSelect={setSelectedId}
      formOpen={formOpen}
      onFormOpenChange={(open) => setFormOpenOverride(open)}
      paths={paths}
      renderLink={renderLink}
    />
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
  const [searchParams] = useSearchParams();
  const hub = useSocialData(projectId, parseSocialHubTab(searchParams.get("tab")));
  const studioHref = projectId ? `/projects/${projectId}/content-studio` : "/projects";
  const integrationsHref = projectId
    ? `/projects/${projectId}/integrations/social`
    : "/integrations";

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
        pieceHref={(pieceId) =>
          projectId ? `/projects/${projectId}/content-piece/${pieceId}` : `/content-piece/${pieceId}`
        }
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
        onReject={(id) => void hub.rejectPiece(id)}
        onSchedule={(id, value) => void hub.schedulePiece(id, value)}
        reschedulingId={hub.reschedulingId}
        onReschedule={(pieceId, dateKey) => void hub.reschedulePiece(pieceId, dateKey)}
        composerParents={hub.composerParents}
        composerParentsLoading={hub.composerParentsLoading}
        composerConnected={hub.composerConnected}
        composing={hub.composing}
        composed={hub.composed}
        onCompose={(parentId, platforms) => void hub.compose(parentId, platforms)}
        attachingImage={hub.attachingImage}
        onAttachFeaturedImageUrl={(parentId, url) => void hub.attachFeaturedImageUrl(parentId, url)}
        onUseStockImage={(parentId) => void hub.useStockImage(parentId)}
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
