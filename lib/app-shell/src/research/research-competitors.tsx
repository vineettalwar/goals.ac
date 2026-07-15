import type { ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Globe,
  Search,
  Shield,
  Target,
  Zap,
} from "lucide-react";
import { cn } from "../cn";
import { btnOutline, btnPrimary, inputClass, PanelLoading, StatusPill } from "../section-panels/shared";
import { displayCompetitorName, formatAnalyzedAt, keywordFromInsight, sortWatchlist } from "./helpers";
import type {
  CompetitorAnalysisResult,
  CompetitorAnalysisRow,
  CompetitorFormState,
  ResearchActionPaths,
  ResearchLinkProps,
  ThreatLevel,
} from "./types";
import { COMPETITOR_STAGES } from "./types";

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
  resultLoading,
  selectedId,
  onSelect,
  formOpen,
  onFormOpenChange,
  paths,
  renderLink,
}: {
  analyses: CompetitorAnalysisRow[];
  loading?: boolean;
  error?: string | null;
  form: CompetitorFormState;
  onFormChange: (next: CompetitorFormState) => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
  result?: (CompetitorAnalysisResult & { competitorUrl?: string; id?: number }) | null;
  resultLoading?: boolean;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  formOpen?: boolean;
  onFormOpenChange?: (open: boolean) => void;
  paths: ResearchActionPaths;
  renderLink: (props: ResearchLinkProps) => ReactNode;
}) {
  const watchlist = sortWatchlist(analyses);
  const showForm = formOpen ?? watchlist.length === 0;

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Watchlist</h2>
            <p className="text-xs text-muted-foreground">Select an analysis to reopen the report</p>
          </div>
          {onFormOpenChange ? (
            <button
              type="button"
              className={cn(btnOutline, "h-8")}
              onClick={() => onFormOpenChange(!showForm)}
            >
              {showForm ? (
                <>
                  <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                  Hide form
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                  Analyze another
                </>
              )}
            </button>
          ) : null}
        </div>

        {loading && watchlist.length === 0 ? (
          <PanelLoading label="Loading analyses…" />
        ) : watchlist.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved analyses yet. Run your first competitor analysis below.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border border-border bg-card">
            {watchlist.map((row) => {
              const active = selectedId === row.id;
              const threat = (row.threatLevel ?? "medium") as ThreatLevel;
              const analyzed = formatAnalyzedAt(row.createdAt);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(row.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors",
                      active ? "bg-secondary/40" : "hover:bg-secondary/20",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{displayCompetitorName(row)}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.competitorUrl}</p>
                      {analyzed ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Analyzed {analyzed}</p>
                      ) : null}
                    </div>
                    <StatusPill label={`${threat} threat`} tone={THREAT_TONE[threat]} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showForm ? (
        <div className="paper-card space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4 text-primary" />
            Run analysis
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
                {COMPETITOR_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {onAnalyze ? (
            <button type="button" disabled={analyzing} onClick={onAnalyze} className={btnPrimary}>
              {analyzing ? "Analyzing…" : "Analyze competitor"}
            </button>
          ) : null}
        </div>
      ) : null}

      {resultLoading ? <PanelLoading label="Loading report…" /> : null}

      {result && !resultLoading ? (
        <CompetitorReport result={result} paths={paths} renderLink={renderLink} />
      ) : null}
    </div>
  );
}

function CompetitorReport({
  result,
  paths,
  renderLink,
}: {
  result: CompetitorAnalysisResult & { competitorUrl?: string; id?: number };
  paths: ResearchActionPaths;
  renderLink: (props: ResearchLinkProps) => ReactNode;
}) {
  const threat = result.threatLevel;
  const competitorUrl = result.competitorUrl;

  return (
    <div className="space-y-5">
      <div className="paper-card space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-tight">{result.competitorName}</h3>
            {competitorUrl ? (
              <a
                href={competitorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {competitorUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
          </div>
          <StatusPill label={`${threat} threat`} tone={THREAT_TONE[threat]} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {renderLink({
            href: paths.studioCreateHref({
              title: `Content plan vs ${result.competitorName}`,
              keyword: result.contentGaps[0] ? keywordFromInsight(result.contentGaps[0]) : result.competitorName,
              angle: result.summary,
            }),
            className: cn(btnPrimary, "h-9 text-xs"),
            children: (
              <>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Create in Studio
              </>
            ),
          })}
          {renderLink({
            href: paths.keywordsHref(
              result.contentGaps[0] ? keywordFromInsight(result.contentGaps[0]) : undefined,
            ),
            className: cn(btnOutline, "h-9"),
            children: "Open Keywords",
          })}
          {renderLink({
            href: paths.auditHref(competitorUrl),
            className: cn(btnOutline, "h-9"),
            children: "Run GEO audit",
          })}
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-amber-600" />
          Attack plan (90 days)
        </h3>
        {result.quickWins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quick wins returned for this analysis.</p>
        ) : (
          <ol className="space-y-2">
            {result.quickWins.map((win, index) => (
              <li
                key={win}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3 text-sm">
                  <span className="font-semibold text-primary tabular-nums">{index + 1}.</span>
                  <span>{win}</span>
                </div>
                {renderLink({
                  href: paths.studioCreateHref({
                    title: win,
                    keyword: keywordFromInsight(win),
                    angle: `Quick win vs ${result.competitorName}`,
                  }),
                  className: cn(btnOutline, "h-8 shrink-0"),
                  children: "Create",
                })}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Gaps to exploit</h3>
        <ul className="space-y-2">
          {result.contentGaps.map((gap) => (
            <GapRow
              key={`content-${gap}`}
              label="Content"
              text={gap}
              action={renderLink({
                href: paths.studioCreateHref({
                  title: gap,
                  keyword: keywordFromInsight(gap),
                  angle: `Content gap vs ${result.competitorName}`,
                }),
                className: cn(btnOutline, "h-8"),
                children: "Create in Studio",
              })}
            />
          ))}
          {result.geoGaps.map((gap) => (
            <GapRow
              key={`geo-${gap}`}
              label="GEO"
              text={gap}
              action={renderLink({
                href: paths.auditHref(competitorUrl),
                className: cn(btnOutline, "h-8"),
                children: "Run audit",
              })}
            />
          ))}
          {result.contentGaps.length === 0 && result.geoGaps.length === 0 ? (
            <li className="text-sm text-muted-foreground">No gaps listed for this analysis.</li>
          ) : null}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SwotList title="Strengths" icon={<Shield className="h-4 w-4 text-emerald-600" />} items={result.strengths} />
        <SwotList
          title="Weaknesses"
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          items={result.weaknesses}
        />
      </section>
    </div>
  );
}

function GapRow({ label, text, action }: { label: string; text: string; action: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <StatusPill label={label} tone="muted" />
        <p className="mt-1.5 text-sm">{text}</p>
      </div>
      {action}
    </li>
  );
}

function SwotList({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h4>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            {title === "Strengths" ? (
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
