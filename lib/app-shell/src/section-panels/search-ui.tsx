import type { ReactNode } from "react";
import { ArrowUpDown, BarChart3, Eye, Globe, Lightbulb, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { cn } from "../cn";
import type { SectionLinkProps } from "../section/types";
import { btnOutline, btnPrimary, inputClass, PanelLoading, ScoreRing, StatCard, StatusPill, ToggleRow } from "./shared";

export type TrackedKeyword = {
  id: number;
  keyword: string;
  isActive: boolean;
};

export type KeywordOpportunity = {
  id: number;
  keyword: string;
  opportunityScore: number;
  suggestedTitle: string;
};

export type VisibilitySettings = {
  llmTrackingEnabled?: boolean;
  geoReauditEnabled?: boolean;
  lastVisibilityCheckAt?: string | null;
  lastGeoReauditAt?: string | null;
};

export type VisibilitySummary = {
  visibilityScore?: number;
  promptCount?: number;
  trend?: Array<{ date: string; score: number }>;
  byEngine?: Array<{ engine: string; cited: number; total: number; score: number }>;
  competitorMentions?: Array<{ name: string; count: number }>;
  latestGeoScore?: number | null;
  recentSnapshots?: Array<{
    id: number;
    prompt: string;
    engine: string;
    cited: boolean;
    checkedAt: string;
  }>;
};

export type ArticlePerformanceRow = {
  id: number;
  title: string;
  status: string;
  publishedUrl?: string | null;
  sessions?: number;
  clicks?: number;
  ctr?: number;
  avgSessionDuration?: number;
};

export type ArticlePerformanceData = {
  articles: ArticlePerformanceRow[];
  ga4Connected?: boolean;
  gscConnected?: boolean;
};

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

function SectionLink({
  renderLink,
  ...props
}: SectionLinkProps & { renderLink: (props: SectionLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

export function SearchKeywordsView({
  keywords,
  loading,
  error,
  trackInput,
  onTrackInputChange,
  onAddKeyword,
  onRemoveKeyword,
  adding,
}: {
  keywords: TrackedKeyword[];
  loading?: boolean;
  error?: string | null;
  trackInput?: string;
  onTrackInputChange?: (value: string) => void;
  onAddKeyword?: () => void;
  onRemoveKeyword?: (id: number) => void;
  adding?: boolean;
}) {
  if (loading && keywords.length === 0) {
    return <PanelLoading label="Loading keywords…" />;
  }

  const active = keywords.filter((k) => k.isActive).length;

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tracked" value={keywords.length} icon={<Search className="h-5 w-5" />} />
        <StatCard label="Active" value={active} tone="emerald" icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="Paused" value={keywords.length - active} icon={<RefreshCw className="h-5 w-5" />} />
      </div>

      {onAddKeyword ? (
        <div className="paper-card flex flex-wrap gap-2 p-4">
          <input
            type="text"
            value={trackInput ?? ""}
            onChange={(e) => onTrackInputChange?.(e.target.value)}
            placeholder="Add keyword to track…"
            className={cn(inputClass, "max-w-md flex-1")}
          />
          <button type="button" disabled={adding || !trackInput?.trim()} onClick={onAddKeyword} className={btnPrimary}>
            <Plus className="mr-1 inline h-4 w-4" /> Track keyword
          </button>
        </div>
      ) : null}

      <div className="paper-card divide-y overflow-hidden">
        {keywords.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No tracked keywords yet.</p>
        ) : (
          keywords.map((kw) => (
            <div key={kw.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{kw.keyword}</span>
              <div className="flex items-center gap-2">
                <StatusPill label={kw.isActive ? "Active" : "Paused"} tone={kw.isActive ? "success" : "muted"} />
                {onRemoveKeyword ? (
                  <button type="button" onClick={() => onRemoveKeyword(kw.id)} className="text-red-700 hover:underline">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SearchVisibilityView({
  settings,
  summary,
  loading,
  saving,
  error,
  onSettingsChange,
  onRunCheck,
  runningCheck,
  integrationsHref,
  brandProfileHref,
  renderLink,
}: {
  settings: VisibilitySettings | null;
  summary: VisibilitySummary | null;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  onSettingsChange?: (next: VisibilitySettings) => void;
  onRunCheck?: () => void;
  runningCheck?: boolean;
  integrationsHref?: string;
  brandProfileHref?: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  if (loading && !settings && !summary) {
    return <PanelLoading label="Loading visibility…" />;
  }

  const score = summary?.visibilityScore ?? 0;
  const promptCount = summary?.promptCount ?? 0;

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="paper-card flex flex-col items-center justify-center p-6">
          <ScoreRing score={score} />
          <p className="mt-2 text-sm font-medium">Visibility score</p>
          <p className="text-xs text-muted-foreground">{promptCount} prompts tracked</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(summary?.byEngine ?? []).map((row) => (
            <div key={row.engine} className="paper-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {ENGINE_LABELS[row.engine] ?? row.engine}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{row.score}%</p>
              <p className="text-xs text-muted-foreground">
                {row.cited}/{row.total} cited
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(row.score, 100)}%` }} />
              </div>
            </div>
          ))}
          {summary?.latestGeoScore != null ? (
            <div className="paper-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest GEO score</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{summary.latestGeoScore}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onRunCheck ? (
          <button type="button" disabled={runningCheck} onClick={onRunCheck} className={btnPrimary}>
            {runningCheck ? "Running check…" : "Run visibility check"}
          </button>
        ) : null}
        {integrationsHref ? (
          <SectionLink renderLink={renderLink} href={integrationsHref} className={btnOutline}>
            Search Console setup
          </SectionLink>
        ) : null}
        {brandProfileHref ? (
          <SectionLink renderLink={renderLink} href={brandProfileHref} className={btnOutline}>
            Brand profile
          </SectionLink>
        ) : null}
      </div>

      {settings && onSettingsChange ? (
        <div className="paper-card p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 text-violet-600" /> Tracking settings
          </h2>
          <ToggleRow
            label="Weekly citation checks"
            description="ChatGPT, Perplexity, Claude, and Gemini"
            checked={Boolean(settings.llmTrackingEnabled)}
            disabled={saving}
            onChange={(checked) => onSettingsChange({ ...settings, llmTrackingEnabled: checked })}
          />
          <ToggleRow
            label="Weekly GEO re-audit"
            description="Homepage scan every Sunday"
            checked={Boolean(settings.geoReauditEnabled)}
            disabled={saving}
            onChange={(checked) => onSettingsChange({ ...settings, geoReauditEnabled: checked })}
          />
        </div>
      ) : null}

      {summary?.competitorMentions && summary.competitorMentions.length > 0 ? (
        <div className="paper-card divide-y overflow-hidden">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold">Competitor mentions</h2>
          </div>
          {summary.competitorMentions.map((row) => (
            <div key={row.name} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{row.name}</span>
              <StatusPill label={`${row.count} mentions`} tone="muted" />
            </div>
          ))}
        </div>
      ) : null}

      {summary?.recentSnapshots && summary.recentSnapshots.length > 0 ? (
        <div className="paper-card divide-y overflow-hidden">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold">Recent checks</h2>
          </div>
          {summary.recentSnapshots.slice(0, 8).map((snap) => (
            <div key={snap.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{snap.prompt}</span>
                <StatusPill label={snap.cited ? "Cited" : "Not cited"} tone={snap.cited ? "success" : "muted"} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {ENGINE_LABELS[snap.engine] ?? snap.engine} · {new Date(snap.checkedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {!summary?.byEngine?.length && !loading ? (
        <div className="paper-card border-dashed p-8 text-center text-sm text-muted-foreground">
          Add competitors and keywords in your brand profile, then run a visibility check.
        </div>
      ) : null}
    </div>
  );
}

export function SearchPerformanceView({
  data,
  loading,
  error,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  sortKey,
  onSortKeyChange,
  integrationsHref,
  renderLink,
  contentPieceHref,
}: {
  data: ArticlePerformanceData | null;
  loading?: boolean;
  error?: string | null;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRefresh?: () => void;
  sortKey: "sessions" | "clicks";
  onSortKeyChange: (key: "sessions" | "clicks") => void;
  integrationsHref?: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
  contentPieceHref: (id: number) => string;
}) {
  const articles = [...(data?.articles ?? [])].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Start</span>
          <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">End</span>
          <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className={inputClass} />
        </label>
        {onRefresh ? (
          <button type="button" disabled={loading} onClick={onRefresh} className={btnOutline}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        ) : null}
        <button type="button" onClick={() => onSortKeyChange(sortKey === "sessions" ? "clicks" : "sessions")} className={btnOutline}>
          <ArrowUpDown className="mr-1 inline h-3.5 w-3.5" /> Sort by {sortKey}
        </button>
      </div>

      {!data?.gscConnected && !data?.ga4Connected && !loading ? (
        <div className="paper-card p-4 text-sm text-muted-foreground">
          Connect Google Search Console and GA4 in{" "}
          {integrationsHref ? (
            <SectionLink renderLink={renderLink} href={integrationsHref} className="font-medium text-primary hover:underline">
              Integrations
            </SectionLink>
          ) : (
            "Integrations"
          )}{" "}
          to unlock performance charts.
        </div>
      ) : null}

      {loading && !data ? <PanelLoading label="Loading performance…" /> : null}

      <div className="paper-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Article</th>
              <th className="px-4 py-3 font-medium">Sessions</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium">CTR</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No published articles with performance data in this range.
                </td>
              </tr>
            ) : (
              articles.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <SectionLink
                      renderLink={renderLink}
                      href={contentPieceHref(row.id)}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {row.title}
                    </SectionLink>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{(row.sessions ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums">{(row.clicks ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.ctr != null ? `${(row.ctr * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SearchSiteHealthView({
  crawlStatus,
  pageCount,
  url,
  scraping,
  scrapeMessage,
  onRunCrawl,
}: {
  crawlStatus?: string | null;
  pageCount?: number | null;
  url?: string | null;
  scraping?: boolean;
  scrapeMessage?: string | null;
  onRunCrawl?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Crawl status" value={crawlStatus ?? "—"} icon={<Globe className="h-5 w-5" />} />
        <StatCard label="Pages indexed" value={pageCount ?? 0} tone="emerald" icon={<Search className="h-5 w-5" />} />
        <StatCard label="Site URL" value={<span className="text-base truncate">{url ?? "—"}</span>} />
      </div>
      <div className="paper-card space-y-3 p-5 text-sm">
        <p className="text-muted-foreground">
          Queue a fresh crawl to refresh your page inventory and internal link graph.
        </p>
        {onRunCrawl ? (
          <button type="button" disabled={scraping} onClick={onRunCrawl} className={btnPrimary}>
            {scraping ? "Queueing…" : "Queue site crawl"}
          </button>
        ) : null}
        {scrapeMessage ? <p className="text-xs text-muted-foreground">{scrapeMessage}</p> : null}
      </div>
    </div>
  );
}

export function SearchSuggestionsView({
  opportunities,
  loading,
  error,
}: {
  opportunities: KeywordOpportunity[];
  loading?: boolean;
  error?: string | null;
}) {
  if (loading && opportunities.length === 0) {
    return <PanelLoading label="Loading suggestions…" />;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <StatCard
        label="Open opportunities"
        value={opportunities.length}
        icon={<Lightbulb className="h-5 w-5 text-amber-600" />}
        tone="amber"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {opportunities.map((row) => (
          <div key={row.id} className="paper-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{row.keyword}</p>
              <StatusPill label={`Score ${row.opportunityScore}`} tone="warning" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{row.suggestedTitle}</p>
          </div>
        ))}
      </div>
      {opportunities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open opportunities.</p>
      ) : null}
    </div>
  );
}
