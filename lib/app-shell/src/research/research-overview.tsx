import type { ReactNode } from "react";
import { ArrowRight, FileText, MessageSquare, Search, ShieldAlert, Target } from "lucide-react";
import { cn } from "../cn";
import { btnOutline, btnPrimary, PanelLoading, StatusPill } from "../section-panels/shared";
import { buildAttackItems, displayCompetitorName, formatAnalyzedAt, keywordFromInsight, sortWatchlist } from "./helpers";
import type {
  AttackItem,
  CompetitorAnalysisRow,
  RedditThread,
  ResearchActionPaths,
  ResearchLinkProps,
  ThreatLevel,
} from "./types";

const THREAT_TONE = {
  low: "success" as const,
  medium: "warning" as const,
  high: "danger" as const,
};

function kindLabel(kind: AttackItem["kind"]): string {
  if (kind === "quick_win") return "Quick win";
  if (kind === "content_gap") return "Content gap";
  return "GEO gap";
}

export function ResearchOverviewView({
  analyses,
  loading,
  error,
  signalThreads,
  paths,
  renderLink,
}: {
  analyses: CompetitorAnalysisRow[];
  loading?: boolean;
  error?: string | null;
  signalThreads?: RedditThread[];
  paths: ResearchActionPaths;
  renderLink: (props: ResearchLinkProps) => ReactNode;
}) {
  const watchlist = sortWatchlist(analyses);
  const attackItems = buildAttackItems(analyses, 5);
  const peekThreads = (signalThreads ?? []).slice(0, 2);

  if (loading && analyses.length === 0) {
    return <PanelLoading label="Loading competitive landscape…" />;
  }

  if (!loading && analyses.length === 0) {
    return (
      <div className="paper-card space-y-4 p-8">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Map your competitive landscape</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Add your first competitor URL — we&apos;ll map threat, gaps, and a 90-day attack plan you can turn into Studio drafts.
            </p>
          </div>
        </div>
        {renderLink({
          href: paths.competitorsHref(),
          className: btnPrimary,
          children: (
            <>
              Analyze a competitor
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          ),
        })}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Watchlist</h2>
            <p className="text-xs text-muted-foreground">Threat-ranked competitors for this project</p>
          </div>
          {renderLink({
            href: paths.competitorsHref(),
            className: cn(btnOutline, "h-8"),
            children: "Manage",
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {watchlist.map((row) => {
            const threat = (row.threatLevel ?? "medium") as ThreatLevel;
            const analyzed = formatAnalyzedAt(row.createdAt);
            return (
              <div key={row.id}>
                {renderLink({
                  href: paths.competitorsHref(row.id),
                  className:
                    "paper-card inline-flex max-w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-secondary/30",
                  children: (
                    <>
                      <span className="truncate text-sm font-medium">{displayCompetitorName(row)}</span>
                      <StatusPill label={`${threat} threat`} tone={THREAT_TONE[threat]} />
                      {analyzed ? (
                        <span className="hidden text-[11px] text-muted-foreground sm:inline">{analyzed}</span>
                      ) : null}
                    </>
                  ),
                })}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Attack this week</h2>
          <p className="text-xs text-muted-foreground">
            Top gaps and quick wins from your latest analyses — turn them into work
          </p>
        </div>
        {attackItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Run a fresh analysis to populate an attack plan.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border border-border bg-card">
            {attackItems.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusPill label={kindLabel(item.kind)} tone="muted" />
                    <span className="text-xs text-muted-foreground">{item.competitorName}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{item.text}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.kind === "geo_gap"
                    ? renderLink({
                        href: paths.auditHref(item.competitorUrl),
                        className: cn(btnOutline, "h-8"),
                        children: (
                          <>
                            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                            Audit
                          </>
                        ),
                      })
                    : (
                      <>
                        {renderLink({
                          href: paths.keywordsHref(keywordFromInsight(item.text), "competitor_gap"),
                          className: cn(btnOutline, "h-8"),
                          children: (
                            <>
                              <Search className="mr-1.5 h-3.5 w-3.5" />
                              Keywords
                            </>
                          ),
                        })}
                        {renderLink({
                          href: paths.studioCreateHref({
                            title: item.text,
                            keyword: keywordFromInsight(item.text),
                            angle: `Competitive gap vs ${item.competitorName}`,
                          }),
                          className: cn(btnPrimary, "h-8 px-3 text-xs"),
                          children: (
                            <>
                              <FileText className="mr-1.5 h-3.5 w-3.5" />
                              Studio
                            </>
                          ),
                        })}
                      </>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Signals</h2>
            <p className="text-xs text-muted-foreground">Community demand from Reddit threads</p>
          </div>
          {renderLink({
            href: paths.signalsHref(),
            className: cn(btnOutline, "h-8"),
            children: (
              <>
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Find threads
              </>
            ),
          })}
        </div>
        {peekThreads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No signals in this session yet. Open Signals to search live Reddit discussions matching your brand keywords.
          </div>
        ) : (
          <ul className="space-y-2">
            {peekThreads.map((thread) => (
              <li key={thread.url} className="paper-card px-4 py-3">
                <p className="text-xs font-medium text-primary">{thread.subreddit}</p>
                <p className="text-sm font-medium">{thread.title}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 border-t border-border pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Related</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {renderLink({
            href: paths.keywordsHref(),
            className: "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
            children: (
              <>
                <Search className="h-3.5 w-3.5" />
                Keywords
              </>
            ),
          })}
          {renderLink({
            href: paths.visibilityHref(),
            className: "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
            children: "AI Visibility",
          })}
          {renderLink({
            href: paths.auditHref(),
            className: "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
            children: (
              <>
                <ShieldAlert className="h-3.5 w-3.5" />
                GEO Audit
              </>
            ),
          })}
        </div>
      </section>
    </div>
  );
}
