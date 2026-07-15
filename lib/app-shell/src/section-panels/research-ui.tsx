import type { ReactNode } from "react";
import { AlertTriangle, Copy, ExternalLink, Globe, Loader2, MessageSquare, Search, Shield, Target, TrendingUp, Zap } from "lucide-react";
import { cn } from "../cn";
import { btnOutline, btnPrimary, inputClass, PanelLoading, StatusPill } from "./shared";

export type CompetitorAnalysisRow = {
  id: number;
  competitorUrl: string;
  industry: string;
};

export type CompetitorAnalysisResult = {
  competitorName: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  contentGaps: string[];
  geoGaps: string[];
  quickWins: string[];
  threatLevel: "low" | "medium" | "high";
};

const THREAT_TONE = {
  low: "success" as const,
  medium: "warning" as const,
  high: "danger" as const,
};

export function ResearchCompetitorsView({
  analyses,
  loading,
  error,
  form,
  onFormChange,
  onAnalyze,
  analyzing,
  result,
}: {
  analyses: CompetitorAnalysisRow[];
  loading?: boolean;
  error?: string | null;
  form: { competitorUrl: string; industry: string; location: string; stage: string };
  onFormChange: (next: { competitorUrl: string; industry: string; location: string; stage: string }) => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
  result?: CompetitorAnalysisResult | null;
}) {
  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="paper-card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4 text-red-600" /> Run analysis
        </h2>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Competitor URL</span>
          <input
            type="url"
            value={form.competitorUrl}
            onChange={(e) => onFormChange({ ...form, competitorUrl: e.target.value })}
            placeholder="https://competitor.com"
            className={inputClass}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Industry</span>
            <input
              type="text"
              value={form.industry}
              onChange={(e) => onFormChange({ ...form, industry: e.target.value })}
              placeholder="B2B SaaS"
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Location</span>
            <input
              type="text"
              value={form.location}
              onChange={(e) => onFormChange({ ...form, location: e.target.value })}
              placeholder="United States"
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Stage</span>
            <select
              value={form.stage}
              onChange={(e) => onFormChange({ ...form, stage: e.target.value })}
              className={inputClass}
            >
              <option value="early">Early</option>
              <option value="growth">Growth</option>
              <option value="mature">Mature</option>
            </select>
          </label>
        </div>
        {onAnalyze ? (
          <button type="button" disabled={analyzing} onClick={onAnalyze} className={btnPrimary}>
            {analyzing ? "Analyzing…" : "Analyze competitor"}
          </button>
        ) : null}
      </div>

      {result ? (
        <div className="space-y-4">
          <div className="paper-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{result.competitorName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
              </div>
              <StatusPill label={`${result.threatLevel} threat`} tone={THREAT_TONE[result.threatLevel]} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AnalysisList title="Strengths" icon={<Shield className="h-4 w-4 text-emerald-600" />} items={result.strengths} />
            <AnalysisList title="Weaknesses" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} items={result.weaknesses} />
            <AnalysisList title="Content gaps" icon={<Target className="h-4 w-4 text-blue-600" />} items={result.contentGaps} />
            <AnalysisList title="GEO gaps" icon={<Globe className="h-4 w-4 text-violet-600" />} items={result.geoGaps} />
          </div>
          <AnalysisList title="Quick wins" icon={<Zap className="h-4 w-4 text-amber-600" />} items={result.quickWins} />
        </div>
      ) : null}

      <div className="paper-card divide-y overflow-hidden">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold">Saved analyses</h2>
        </div>
        {loading && analyses.length === 0 ? (
          <PanelLoading label="Loading analyses…" />
        ) : analyses.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No competitor analyses yet.</p>
        ) : (
          analyses.map((row) => (
            <div key={row.id} className="px-4 py-3 text-sm">
              <p className="font-medium">{row.competitorUrl}</p>
              <p className="text-xs text-muted-foreground">{row.industry}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AnalysisList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="paper-card p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type RedditThread = {
  subreddit: string;
  title: string;
  url: string;
  intentScore: number;
  suggestedReply: string;
  score?: number;
  numComments?: number;
  source?: string;
};

export function ResearchRedditView({
  projectId,
  threads,
  loading,
  discovering,
  error,
  onDiscover,
  projectsHref = "/projects",
  renderLink,
}: {
  projectId?: string | null;
  threads?: RedditThread[];
  loading?: boolean;
  discovering?: boolean;
  error?: string | null;
  onDiscover?: () => void;
  projectsHref?: string;
  renderLink?: (props: { href: string; className?: string; children: ReactNode }) => ReactNode;
}) {
  if (!projectId) {
    return (
      <div className="paper-card max-w-3xl space-y-4 p-6">
        <h2 className="text-lg font-semibold">Reddit discovery</h2>
        <p className="text-sm text-muted-foreground">Select a project to find relevant threads.</p>
        {renderLink ? (
          renderLink({ href: projectsHref, className: btnPrimary, children: "Go to projects" })
        ) : (
          <a href={projectsHref} className={btnPrimary}>
            Go to projects
          </a>
        )}
      </div>
    );
  }

  const threadList = threads ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Reddit discovery</h2>
              <StatusPill label="beta" tone="primary" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Live threads from Reddit search — AI drafts replies only. You post manually.
            </p>
          </div>
        </div>
        {onDiscover ? (
          <button type="button" disabled={discovering} onClick={onDiscover} className={btnPrimary}>
            {discovering ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Finding…
              </span>
            ) : (
              "Find threads"
            )}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {threadList.length === 0 && !discovering && !loading ? (
        <div className="paper-card space-y-2 p-8 text-center text-sm text-muted-foreground">
          <p>Click &quot;Find threads&quot; to search Reddit for discussions matching your brand keywords.</p>
          <p className="text-xs">Results are real posts from Reddit&apos;s public API — not hallucinated URLs.</p>
        </div>
      ) : null}

      {loading && threadList.length === 0 ? <PanelLoading label="Loading threads…" /> : null}

      <ul className="space-y-4">
        {threadList.map((thread) => (
          <li key={thread.url} className="paper-card p-5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-primary">{thread.subreddit}</p>
                <h3 className="font-semibold">{thread.title}</h3>
              </div>
              <StatusPill label={`Intent ${thread.intentScore}`} tone="muted" />
            </div>
            <a
              href={thread.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open thread <ExternalLink className="h-3 w-3" />
            </a>
            {thread.score != null || thread.numComments != null ? (
              <p className="mb-3 text-xs text-muted-foreground">
                {thread.score != null ? `${thread.score} upvotes` : null}
                {thread.score != null && thread.numComments != null ? " · " : null}
                {thread.numComments != null ? `${thread.numComments} comments` : null}
              </p>
            ) : null}
            <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
              {thread.suggestedReply}
            </p>
            <button
              type="button"
              className={cn(btnOutline, "mt-3")}
              onClick={() => {
                void navigator.clipboard.writeText(thread.suggestedReply);
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy reply
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
