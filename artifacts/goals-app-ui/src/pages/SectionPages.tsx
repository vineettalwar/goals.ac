import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { SectionShell } from "@/components/SectionShell";
import { DataPanel } from "@/components/DataPanel";
import { useActiveProject } from "@/hooks/use-active-project";
import { apiFetch } from "@/lib/api";
import { formatTimestamp } from "@/types/api";

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
            <span className="text-(--muted)">{goal.status} · {goal.targetMetric}</span>
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
              <span className="text-(--muted) shrink-0">{piece.plannedDate}</span>
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
      <DataPanel title="Primary keywords" empty={keywords.length === 0 ? "Add keywords in brand profile (local app)." : undefined} error={error}>
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
            <span className="text-(--muted)">{kw.isActive ? "Active" : "Paused"}</span>
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
  return (
    <SectionShell title="Search performance" description="GSC/GA4 performance views are being ported to the edge API." tabs={searchTabs}>
      <p className="text-sm text-(--muted)">Connect Google Search Console in Integrations (local app) to unlock performance charts.</p>
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
          <p><span className="text-(--muted)">Crawl status:</span> {activeProject.crawlStatus}</p>
          <p><span className="text-(--muted)">Pages indexed:</span> {activeProject.pageCount}</p>
          <p><span className="text-(--muted)">URL:</span> {activeProject.url}</p>
          <button
            type="button"
            disabled={scraping}
            onClick={() => void runCrawl()}
            className="h-9 px-3 rounded-lg bg-(--forest) text-white text-xs font-medium disabled:opacity-50"
          >
            {scraping ? "Queueing…" : "Queue site crawl"}
          </button>
          {scrapeMessage ? <p className="text-xs text-(--muted)">{scrapeMessage}</p> : null}
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
            <p className="text-(--muted) text-xs mt-1">Score {row.opportunityScore} · {row.suggestedTitle}</p>
          </div>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function AuditListPage() {
  const [audits, setAudits] = useState<Array<{ id: number; url: string; geoScore: number; createdAt: number | string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ audits: typeof audits }>("/api/geo-audits")
      .then((data) => setAudits(data.audits ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load audits"));
  }, []);

  return (
    <SectionShell title="GEO audits" description="Generative engine optimization audits for your URLs." requireProject={false}>
      <DataPanel title="Audits" empty={audits.length === 0 ? "No GEO audits yet." : undefined} error={error}>
        {audits.map((audit) => (
          <Link key={audit.id} to={`/audit/${audit.id}`} className="block px-4 py-3 hover:bg-[#f5f3ef] text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-medium truncate">{audit.url}</span>
              <span className="text-(--muted) shrink-0">Score {audit.geoScore}</span>
            </div>
            <p className="text-xs text-(--muted) mt-1">{formatTimestamp(audit.createdAt)}</p>
          </Link>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function AuditDetailPage({ auditId }: { auditId: string }) {
  const [audit, setAudit] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<Record<string, unknown>>(`/api/geo-audits/${auditId}`)
      .then(setAudit)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load audit"));
  }, [auditId]);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link to="/audit" className="text-sm text-(--muted) hover:text-(--forest)">← GEO audits</Link>
      <h1 className="text-2xl font-bold mt-4 mb-4">GEO audit</h1>
      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}
      <pre className="rounded-xl border border-(--border) bg-white p-4 text-xs overflow-auto">
        {JSON.stringify(audit, null, 2)}
      </pre>
    </div>
  );
}

export function ResearchHubPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell title="Research" description="Competitive and community research for content angles." tabs={researchTabs}>
      <div className="grid gap-3 sm:grid-cols-2">
        <HubCard to={`/research/competitors?project=${projectId}`} title="Competitors" hint="AI competitor analyses" />
        <HubCard to={`/research/reddit?project=${projectId}`} title="Reddit" hint="Community visibility (coming soon)" />
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
            <p className="text-xs text-(--muted) mt-1">{row.industry}</p>
          </div>
        ))}
      </DataPanel>
    </SectionShell>
  );
}

export function ResearchRedditPage() {
  return (
    <SectionShell title="Reddit visibility" description="Track subreddit mentions and threads — queue worker support coming soon." tabs={researchTabs}>
      <p className="text-sm text-(--muted)">This module requires background jobs not yet on the edge write worker.</p>
    </SectionShell>
  );
}

export function AutopilotPage() {
  const { projectId } = useActiveProject();
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void apiFetch<Record<string, unknown>>(`/api/website-projects/${projectId}/autopilot-settings`)
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load autopilot"));
  }, [projectId]);

  return (
    <SectionShell title="Autopilot" description="Automated content cadence and publish mode for the active project.">
      <DataPanel title="Autopilot settings" error={error}>
        <pre className="p-4 text-xs overflow-auto">{JSON.stringify(settings ?? { enabled: false }, null, 2)}</pre>
      </DataPanel>
    </SectionShell>
  );
}

export function SocialHubPage() {
  return (
    <SectionShell title="Social hub" description="Schedule and publish social variants — write APIs rolling out on edge.">
      <p className="text-sm text-(--muted)">
        Open <Link to="/studio" className="text-(--forest) font-medium">Content studio</Link> for social-format drafts.
      </p>
    </SectionShell>
  );
}

export function PartnerPage() {
  return (
    <SectionShell title="Partner portal" description="Agency billing and client workspaces." requireProject={false}>
      <p className="text-sm text-(--muted)">Partner features require organization admin role — port in progress.</p>
    </SectionShell>
  );
}

export function HelpPage() {
  return (
    <SectionShell title="Help" description="Product docs and setup guides." requireProject={false}>
      <a
        href="https://goals.ac/help"
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-sm font-medium text-(--forest)"
      >
        Open help center on goals.ac →
      </a>
    </SectionShell>
  );
}

export function AdminPage() {
  const { user } = useAuth();
  return (
    <SectionShell title="Admin" description="Platform administration." requireProject={false}>
      {user?.role === "super_admin" || user?.role === "admin" ? (
        <p className="text-sm text-(--muted)">Admin APIs are not yet exposed on api.goals.ac. Use local dev for full admin panel.</p>
      ) : (
        <p className="text-sm text-red-700">Admin access required.</p>
      )}
    </SectionShell>
  );
}

export function OnboardingPage() {
  return (
    <SectionShell title="Onboarding" description="Set up your first project and brand profile." requireProject={false}>
      <p className="text-sm text-(--muted)">
        You already have projects synced. Visit <Link to="/projects" className="text-(--forest) font-medium">Projects</Link> to manage them.
      </p>
    </SectionShell>
  );
}

export function GrowthRoadmapPage({ slug }: { slug: string }) {
  const [roadmap, setRoadmap] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ roadmaps: Array<Record<string, unknown>> }>("/api/roadmaps?limit=50")
      .then((data) => {
        const hit = (data.roadmaps ?? []).find((r) => String(r.slug) === slug);
        setRoadmap(hit ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roadmap"));
  }, [slug]);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link to="/strategy/roadmaps" className="text-sm text-(--muted) hover:text-(--forest)">← Roadmaps</Link>
      <h1 className="text-2xl font-bold mt-4 mb-4">
        {roadmap ? `${String(roadmap.industry)} · ${String(roadmap.location)}` : slug}
      </h1>
      {error ? <p className="text-sm text-red-700 mb-4">{error}</p> : null}
      {!roadmap && !error ? <p className="text-sm text-(--muted)">Roadmap not found.</p> : null}
      {roadmap ? (
        <pre className="rounded-xl border border-(--border) bg-white p-4 text-xs overflow-auto">
          {JSON.stringify(roadmap, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function HubCard({ to, title, hint }: { to: string; title: string; hint: string }) {
  return (
    <Link to={to} className="rounded-xl border border-(--border) bg-white p-4 hover:border-(--forest)">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-(--muted) mt-1">{hint}</p>
    </Link>
  );
}
