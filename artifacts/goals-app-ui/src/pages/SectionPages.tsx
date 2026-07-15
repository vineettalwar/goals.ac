import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AutopilotView,
  CMS_PLATFORMS,
  GeoAuditDetailView,
  GeoAuditListView,
  GrowthRoadmapView,
  HelpView,
  projectDetailPath,
  SocialHubView,
  type CmsIntegrationRow,
  type GrowthRoadmap,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { NewProjectButton } from "@/components/NewProjectButton";
import { SectionShell } from "@/components/SectionShell";
import { useActiveProject } from "@/hooks/use-active-project";
import { useAuditDetailData, useAuditListData } from "@/hooks/use-audit-data";
import { useAutopilotData } from "@/hooks/use-autopilot-data";
import { useIntegrationsData } from "@/hooks/use-integrations-data";
import { useProjectsData } from "@/hooks/use-projects-data";
import { useSocialData } from "@/hooks/use-social-data";
import { apiFetch, getAppOrigin } from "@/lib/api";
import type { ContentPiece } from "@/types/api";

const integrationsAppUrl = `${getAppOrigin()}/integrations`;

function cmsConnectedCount(integrations: Record<string, CmsIntegrationRow>): number {
  return CMS_PLATFORMS.filter(({ key }) => Boolean(integrations[key]?.connected)).length;
}

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
  { label: "Reddit", to: "/research/reddit" },
];

const renderLink = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <Link to={href} className={className}>
    {children}
  </Link>
);

export function StrategyHubPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell
      title="Strategy"
      description="Plan goals, editorial calendar, and roadmap alignment for your active project."
      tabs={strategyTabs}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <HubCard to={`/strategy/goals?project=${projectId}`} title="Goals" hint="Traffic, leads, authority objectives" />
        <HubCard to={`/strategy/calendar?project=${projectId}`} title="Calendar" hint="Planned content dates" />
        <HubCard to={`/strategy/roadmaps?project=${projectId}`} title="Roadmaps" hint="Growth roadmap catalog" />
        <HubCard to={`/strategy/topical-map?project=${projectId}`} title="Topical map" hint="Brand keywords & clusters" />
      </div>
    </SectionShell>
  );
}

export function StrategyGoalsPage() {
  const { projectId } = useActiveProject();
  const [goals, setGoals] = useState<Array<{ id: number; objective: string; status: string; targetMetric: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void apiFetch<{ goals: typeof goals }>(`/api/goals?projectId=${projectId}`)
      .then((data) => setGoals(data.goals ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load goals"));
  }, [projectId]);

  return (
    <SectionShell title="Strategy goals" description="Active growth goals for this project." tabs={strategyTabs}>
      <DataPanel title="Goals" empty={goals.length === 0 ? "No goals yet." : undefined} error={error}>
        {goals.map((goal) => (
          <div key={goal.id} className="px-4 py-3 flex justify-between text-sm">
            <span className="font-medium capitalize">{goal.objective}</span>
            <span className="text-muted-foreground">{goal.status} · {goal.targetMetric}</span>
          </div>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function StrategyCalendarPage() {
  const { projectId } = useActiveProject();
  const [pieces, setPieces] = useState<Array<{ id: number; title: string; plannedDate: string | null; status: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void apiFetch<typeof pieces>(`/api/website-projects/${projectId}/content-pieces`)
      .then(setPieces)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load calendar"));
  }, [projectId]);

  const scheduled = pieces.filter((p) => p.plannedDate);

  return (
    <SectionShell title="Editorial calendar" description="Content scheduled by planned date." tabs={strategyTabs}>
      <DataPanel title="Scheduled pieces" empty={scheduled.length === 0 ? "No planned dates on content pieces yet." : undefined} error={error}>
        {scheduled.map((piece) => (
          <Link key={piece.id} to={`/content-piece/${piece.id}`} className="block px-4 py-3 hover:bg-[#f5f3ef] text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-medium truncate">{piece.title}</span>
              <span className="text-muted-foreground shrink-0">{piece.plannedDate}</span>
            </div>
          </Link>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function StrategyRoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<Array<{ id: number; slug: string; industry: string; location: string; stage: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ roadmaps: typeof roadmaps }>("/api/roadmaps?limit=20")
      .then((data) => setRoadmaps(data.roadmaps ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roadmaps"));
  }, []);

  return (
    <SectionShell title="Roadmaps" description="Programmatic growth roadmaps catalog." tabs={strategyTabs} requireProject={false}>
      <DataPanel title="Roadmaps" empty={roadmaps.length === 0 ? "No roadmaps in database." : undefined} error={error}>
        {roadmaps.map((roadmap) => (
          <Link
            key={roadmap.id}
            to={`/growth-roadmaps/${roadmap.slug}`}
            className="block px-4 py-3 hover:bg-[#f5f3ef] text-sm font-medium"
          >
            {roadmap.industry} · {roadmap.location} ({roadmap.stage})
          </Link>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function StrategyTopicalMapPage() {
  const { projectId } = useActiveProject();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void apiFetch<{ primaryKeywords?: string[] } | null>(`/api/website-projects/${projectId}/brand-profile`)
      .then((profile) => setKeywords(profile?.primaryKeywords ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load brand profile"));
  }, [projectId]);

  return (
    <SectionShell title="Topical map" description="Primary keyword clusters from your brand profile." tabs={strategyTabs}>
      <DataPanel
        title="Primary keywords"
        empty={
          keywords.length === 0
            ? "Add keywords in your brand profile on app.goals.ac (Integrations → brand profile)."
            : undefined
        }
        error={error}
      >
        {keywords.map((kw) => (
          <div key={kw} className="px-4 py-3 text-sm font-medium">{kw}</div>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function SearchHubPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell title="Search" description="Keywords, visibility, and site health for your project." tabs={searchTabs}>
      <div className="grid gap-3 sm:grid-cols-2">
        <HubCard to={`/search/keywords?project=${projectId}`} title="Keywords" hint="Tracked rank terms" />
        <HubCard to={`/search/visibility?project=${projectId}`} title="AI visibility" hint="LLM tracking settings" />
        <HubCard to={`/search/suggestions?project=${projectId}`} title="Suggestions" hint="Keyword opportunities" />
        <HubCard to={`/search/site?project=${projectId}`} title="Site" hint="Crawl & index status" />
      </div>
    </SectionShell>
  );
}

export function SearchKeywordsPage() {
  const { projectId } = useActiveProject();
  const [keywords, setKeywords] = useState<Array<{ id: number; keyword: string; isActive: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void apiFetch<{ trackedKeywords: typeof keywords }>(`/api/tracked-keywords?projectId=${projectId}`)
      .then((data) => setKeywords(data.trackedKeywords ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load keywords"));
  }, [projectId]);

  return (
    <SectionShell title="Tracked keywords" description="Keywords you monitor for rank changes." tabs={searchTabs}>
      <DataPanel title="Keywords" empty={keywords.length === 0 ? "No tracked keywords yet." : undefined} error={error}>
        {keywords.map((kw) => (
          <div key={kw.id} className="px-4 py-3 flex justify-between text-sm">
            <span className="font-medium">{kw.keyword}</span>
            <span className="text-muted-foreground">{kw.isActive ? "Active" : "Paused"}</span>
          </div>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function SearchVisibilityPage() {
  const { projectId } = useActiveProject();
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void apiFetch<Record<string, unknown>>(`/api/website-projects/${projectId}/visibility-settings`)
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load visibility"));
  }, [projectId]);

  return (
    <SectionShell title="AI visibility" description="LLM tracking and GEO re-audit settings." tabs={searchTabs}>
      <DataPanel title="Visibility settings" error={error}>
        <pre className="p-4 text-xs overflow-auto">{JSON.stringify(settings ?? {}, null, 2)}</pre>
      </DataPanel>
    </SectionShell>
  );
}

export function SearchPerformancePage() {
  const { projectId } = useActiveProject();
  const { searchProperties, searchLoading, searchError } = useIntegrationsData(projectId);

  const gscConnection = searchProperties?.connections.find(
    (row) => row.provider === "google_search_console",
  );
  const gscConnected = Boolean(gscConnection?.connected && gscConnection.propertyVerified);

  return (
    <SectionShell
      title="Search performance"
      description="GSC and GA4 performance views for your active project."
      tabs={searchTabs}
    >
      <DataPanel title="Performance data" error={searchError}>
        {searchLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading search connections…</p>
        ) : gscConnected ? (
          <div className="p-4 text-sm space-y-2">
            <p>
              Google Search Console is connected. Open{" "}
              <a
                href={integrationsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Integrations on app.goals.ac
              </a>{" "}
              to view performance charts and AI search reports.
            </p>
            {gscConnection?.propertyUrl ? (
              <p className="text-xs text-muted-foreground">Property: {gscConnection.propertyUrl}</p>
            ) : null}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            Connect Google Search Console in{" "}
            <a
              href={integrationsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Integrations on app.goals.ac
            </a>{" "}
            to unlock performance charts.
          </p>
        )}
      </DataPanel>
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
    <SectionShell title="Site health" description="Crawl status and page inventory for the active project." tabs={searchTabs}>
      {activeProject ? (
        <div className="rounded-xl border border-(--border) bg-white p-4 text-sm space-y-3">
          <p><span className="text-muted-foreground">Crawl status:</span> {activeProject.crawlStatus}</p>
          <p><span className="text-muted-foreground">Pages indexed:</span> {activeProject.pageCount}</p>
          <p><span className="text-muted-foreground">URL:</span> {activeProject.url}</p>
          <button
            type="button"
            disabled={scraping}
            onClick={() => void runCrawl()}
            className="h-9 px-3 rounded-lg bg-(--forest) text-white text-xs font-medium disabled:opacity-50"
          >
            {scraping ? "Queueing…" : "Queue site crawl"}
          </button>
          {scrapeMessage ? <p className="text-xs text-muted-foreground">{scrapeMessage}</p> : null}
        </div>
      ) : null}
    </SectionShell>
  );
}

export function SearchSuggestionsPage() {
  const { projectId } = useActiveProject();
  const [opportunities, setOpportunities] = useState<Array<{ id: number; keyword: string; opportunityScore: number; suggestedTitle: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void apiFetch<{ opportunities: typeof opportunities }>(
      `/api/website-projects/${projectId}/keyword-opportunities?status=open`,
    )
      .then((data) => setOpportunities(data.opportunities ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load opportunities"));
  }, [projectId]);

  return (
    <SectionShell title="Keyword suggestions" description="Open keyword opportunities scored for your project." tabs={searchTabs}>
      <DataPanel title="Opportunities" empty={opportunities.length === 0 ? "No open opportunities." : undefined} error={error}>
        {opportunities.map((row) => (
          <div key={row.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{row.keyword}</p>
            <p className="text-muted-foreground text-xs mt-1">Score {row.opportunityScore} · {row.suggestedTitle}</p>
          </div>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function AuditListPage() {
  const { audits, loading, error } = useAuditListData();

  return (
    <SectionShell title="GEO audits" description="Generative engine optimization audits for your URLs." requireProject={false}>
      <GeoAuditListView
        audits={audits}
        loading={loading}
        error={error}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function AuditDetailPage({ auditId }: { auditId: string }) {
  const { audit, loading, error } = useAuditDetailData(auditId);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <GeoAuditDetailView
        audit={audit}
        loading={loading}
        error={error}
        renderLink={renderLink}
      />
    </div>
  );
}

export function ResearchHubPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell title="Research" description="Competitive and community research for content angles." tabs={researchTabs}>
      <div className="grid gap-3 sm:grid-cols-2">
        <HubCard to={`/research/competitors?project=${projectId}`} title="Competitors" hint="AI competitor analyses" />
        <HubCard to={`/research/reddit?project=${projectId}`} title="Reddit" hint="Community visibility research" />
      </div>
    </SectionShell>
  );
}

export function ResearchCompetitorsPage() {
  const { projectId } = useActiveProject();
  const [analyses, setAnalyses] = useState<Array<{ id: number; competitorUrl: string; industry: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void apiFetch<{ analyses: typeof analyses }>(`/api/competitor-analysis?projectId=${projectId}`)
      .then((data) => setAnalyses(data.analyses ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analyses"));
  }, [projectId]);

  return (
    <SectionShell title="Competitor research" description="Saved competitor analyses for this project." tabs={researchTabs}>
      <DataPanel title="Analyses" empty={analyses.length === 0 ? "No competitor analyses yet." : undefined} error={error}>
        {analyses.map((row) => (
          <div key={row.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{row.competitorUrl}</p>
            <p className="text-xs text-muted-foreground mt-1">{row.industry}</p>
          </div>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function ResearchRedditPage() {
  return (
    <SectionShell
      title="Reddit visibility"
      description="Track subreddit mentions and community threads for content angles."
      tabs={researchTabs}
    >
      <DataPanel title="Reddit research">
        <div className="p-4 text-sm space-y-2">
          <p className="text-muted-foreground">
            Community visibility tracking surfaces Reddit threads and subreddit conversations relevant
            to your keywords and brand.
          </p>
          <a
            href="https://goals.ac/help"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Learn more in the goals.ac help center
          </a>
        </div>
      </DataPanel>
    </SectionShell>
  );
}

export function AutopilotPage() {
  const { projectId } = useActiveProject();
  const { settings, loading, error, saveSettings, saving } = useAutopilotData(projectId);

  return (
    <SectionShell title="Autopilot" description="Automated content cadence and publish mode for the active project.">
      <AutopilotView
        settings={settings}
        loading={loading}
        error={error}
        onSave={projectId ? saveSettings : undefined}
        saving={saving}
      />
    </SectionShell>
  );
}

export function SocialHubPage() {
  const { projectId } = useActiveProject();
  const {
    queue,
    queueLoading,
    queueError,
    metrics,
    metricsLoading,
    platformFilter,
    setPlatformFilter,
    reload,
  } = useSocialData(projectId);

  return (
    <SectionShell title="Social hub" description="Schedule and publish social variants.">
      <SocialHubView
        projectId={projectId}
        renderLink={renderLink}
        queue={queue}
        queueLoading={queueLoading}
        queueError={queueError}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        onRefreshQueue={reload}
        metrics={metrics}
        metricsLoading={metricsLoading}
      />
    </SectionShell>
  );
}

export function PartnerPage() {
  const { organizationId, organizationName, orgRole, loading } = useAuth();
  const { projects } = useActiveProject();

  return (
    <SectionShell title="Partner portal" description="Agency billing and client workspaces." requireProject={false}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading organization…</p>
      ) : organizationId ? (
        <DataPanel title="Organization">
          <div className="px-4 py-3 text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{organizationName ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Organization ID:</span>{" "}
              <span className="font-medium">{organizationId}</span>
            </p>
            {orgRole ? (
              <p>
                <span className="text-muted-foreground">Your role:</span>{" "}
                <span className="font-medium capitalize">{orgRole.replace(/_/g, " ")}</span>
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Client projects:</span>{" "}
              <span className="font-medium">{projects.length}</span>
            </p>
          </div>
        </DataPanel>
      ) : (
        <p className="text-sm text-muted-foreground">
          Partner features require an organization membership. Contact support to set up agency billing
          and client workspaces.
        </p>
      )}
    </SectionShell>
  );
}

export function HelpPage() {
  const { projects, projectId } = useActiveProject();
  const hasProject = projects.length > 0;
  const [hasCmsIntegration, setHasCmsIntegration] = useState(false);
  const [hasContentPiece, setHasContentPiece] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setHasCmsIntegration(false);
      setHasContentPiece(false);
      return;
    }

    let cancelled = false;
    setChecklistLoading(true);

    void Promise.allSettled([
      apiFetch<Record<string, CmsIntegrationRow>>(
        `/api/website-projects/${projectId}/cms-integrations`,
      ),
      apiFetch<ContentPiece[]>(`/api/website-projects/${projectId}/content-pieces`),
    ])
      .then(([integrationsResult, piecesResult]) => {
        if (cancelled) return;
        if (integrationsResult.status === "fulfilled") {
          setHasCmsIntegration(cmsConnectedCount(integrationsResult.value) > 0);
        } else {
          setHasCmsIntegration(false);
        }
        if (piecesResult.status === "fulfilled") {
          setHasContentPiece(piecesResult.value.length > 0);
        } else {
          setHasContentPiece(false);
        }
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <SectionShell title="Help" description="Product docs and setup guides." requireProject={false}>
      <HelpView
        advancedAppHref={getAppOrigin()}
        resourceLinks={[
          {
            label: "Help center on goals.ac",
            href: "https://goals.ac/help",
            description: "Guides, FAQs, and product documentation.",
          },
          {
            label: "Integrations setup",
            href: "https://goals.ac/help/integrations",
            description: "Connect WordPress, Shopify, and other CMS platforms.",
          },
        ]}
        checklist={[
          {
            id: "project",
            label: "Create a website project",
            done: hasProject,
            href: "/projects",
          },
          {
            id: "brand",
            label: "Complete brand profile",
            done: false,
            href: projectId ? `/projects/${projectId}` : "/projects",
          },
          {
            id: "integrations",
            label: "Connect a CMS integration",
            done: !checklistLoading && hasCmsIntegration,
            href: "/integrations",
          },
          {
            id: "content",
            label: "Generate your first content piece",
            done: !checklistLoading && hasContentPiece,
            href: projectId ? `/studio?project=${projectId}` : "/studio",
          },
        ]}
        renderLink={renderLink}
      />
    </SectionShell>
  );
}

export function AdminPage() {
  const { user } = useAuth();
  const appOrigin = getAppOrigin().replace(/\/+$/, "");

  return (
    <SectionShell title="Admin" description="Platform administration." requireProject={false}>
      {user?.role === "super_admin" ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Platform administration runs on the canonical Next.js app.</p>
          <a
            href="https://goals.ac/admin"
            className="font-medium text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open admin panel at goals.ac
          </a>
        </div>
      ) : user?.role === "admin" ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Platform administration runs on the canonical Next.js app.</p>
          <a
            href={`${appOrigin}/admin`}
            className="font-medium text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open admin panel at {appOrigin}
          </a>
        </div>
      ) : (
        <p className="text-sm text-red-700">Admin access required.</p>
      )}
    </SectionShell>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { loading, projects } = useProjectsData();

  if (loading) {
    return (
      <SectionShell title="Onboarding" description="Set up your first project and brand profile." requireProject={false}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </SectionShell>
    );
  }

  if (projects.length === 0) {
    return (
      <SectionShell title="Onboarding" description="Set up your first project and brand profile." requireProject={false}>
        <div className="space-y-4">
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
    <SectionShell title="Onboarding" description="Set up your first project and brand profile." requireProject={false}>
      <p className="text-sm text-muted-foreground">
        You already have projects synced. Visit{" "}
        <Link to="/projects" className="font-medium text-primary hover:underline">
          Projects
        </Link>{" "}
        to manage them.
      </p>
    </SectionShell>
  );
}

export function GrowthRoadmapPage({ slug }: { slug: string }) {
  const [roadmap, setRoadmap] = useState<GrowthRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void apiFetch<{ roadmaps: GrowthRoadmap[] }>("/api/roadmaps?limit=50")
      .then((data) => {
        if (cancelled) return;
        const hit = (data.roadmaps ?? []).find((row) => row.slug === slug) ?? null;
        setRoadmap(hit);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load roadmap");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <GrowthRoadmapView
        roadmap={roadmap}
        slug={slug}
        loading={loading}
        error={error}
        renderLink={renderLink}
      />
    </div>
  );
}

function HubCard({ to, title, hint }: { to: string; title: string; hint: string }) {
  return (
    <Link to={to} className="rounded-xl border border-(--border) bg-white p-4 hover:border-(--forest)">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </Link>
  );
}

function DataPanel({
  title,
  empty,
  error,
  children,
}: {
  title: string;
  empty?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {error ? <p className="text-sm text-red-700 mb-2">{error}</p> : null}
      <div className="rounded-xl border border-(--border) bg-white divide-y">
        {children}
        {empty ? <p className="p-4 text-sm text-muted-foreground">{empty}</p> : null}
      </div>
    </section>
  );
}