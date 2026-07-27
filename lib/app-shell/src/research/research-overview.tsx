import type { ReactNode } from "react";
import {
  ArrowRight,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "../cn";
import { btnOutline, btnPrimary, PanelLoading, StatusPill } from "../section-panels/shared";
import {
  articleIdeaSourceLabel,
  buildAttackItems,
  displayCompetitorName,
  formatAnalyzedAt,
  keywordFromInsight,
  pickTopArticleIdeas,
  sortWatchlist,
} from "./helpers";
import type {
  AttackItem,
  BrandFitSignals,
  CompetitorAnalysisRow,
  KeywordSignalCounts,
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
  keywordSignals,
  opportunities,
  brandFit,
  discoveringIdeas,
  onDiscoverIdeas,
  semrushConfigured,
  paths,
  renderLink,
}: {
  analyses: CompetitorAnalysisRow[];
  loading?: boolean;
  error?: string | null;
  signalThreads?: RedditThread[];
  keywordSignals?: KeywordSignalCounts | null;
  /** Open keyword opportunities — top 4 unique ideas are shown. */
  opportunities?: Array<{
    id: number;
    keyword: string;
    suggestedTitle?: string | null;
    suggestedAngle?: string | null;
    source?: string | null;
    opportunityScore?: number | null;
    status?: string | null;
  }>;
  /** Brand signals used to prefer ideas that fit this project. */
  brandFit?: BrandFitSignals | null;
  discoveringIdeas?: boolean;
  /** Run research discovery (GSC / AI / Semrush) to fill article ideas. */
  onDiscoverIdeas?: () => void;
  /** When false, show Settings CTA for Semrush BYOK. Omit when unknown. */
  semrushConfigured?: boolean | null;
  paths: ResearchActionPaths;
  renderLink: (props: ResearchLinkProps) => ReactNode;
}) {
  const watchlist = sortWatchlist(analyses);
  const attackItems = buildAttackItems(analyses, 5);
  const peekThreads = (signalThreads ?? []).slice(0, 2);
  const signals = keywordSignals ?? { gsc: 0, semrush: 0, competitorGap: 0, total: 0 };
  const articleIdeas = pickTopArticleIdeas(opportunities ?? [], 4, brandFit);
  const hasAnalyses = analyses.length > 0;

  if (loading && !hasAnalyses && articleIdeas.length === 0 && signals.total === 0) {
    return <PanelLoading label="Loading competitive landscape…" />;
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
            children: hasAnalyses ? "Manage" : "Add competitor",
          })}
        </div>
        {hasAnalyses ? (
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
        ) : (
          <div className="paper-card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Map your competitive landscape</p>
                <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                  Add a competitor URL — we&apos;ll map threat, gaps, and a 90-day attack plan.
                </p>
              </div>
            </div>
            {renderLink({
              href: paths.competitorsHref(),
              className: cn(btnPrimary, "h-8 shrink-0"),
              children: (
                <>
                  Analyze a competitor
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              ),
            })}
          </div>
        )}
      </section>

      {hasAnalyses ? (
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
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
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
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Article ideas</h2>
            <p className="text-xs text-muted-foreground">
              Top research-backed ideas ranked for this brand — write one today
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onDiscoverIdeas ? (
              <button
                type="button"
                className={cn(btnOutline, "h-8")}
                disabled={discoveringIdeas}
                onClick={onDiscoverIdeas}
              >
                {discoveringIdeas ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                {articleIdeas.length === 0 ? "Discover ideas" : "Refresh ideas"}
              </button>
            ) : null}
            {renderLink({
              href: paths.keywordsHref(),
              className: cn(btnOutline, "h-8"),
              children: (
                <>
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                  {signals.total > 0 ? `All ideas (${signals.total})` : "Keywords hub"}
                </>
              ),
            })}
          </div>
        </div>
        {articleIdeas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No open article ideas yet.{" "}
            {onDiscoverIdeas
              ? "Run Discover to pull GSC, competitor gaps, and brand-fit AI topics."
              : "Run GSC sync or Semrush gaps from the Keywords hub."}
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border border-border bg-card">
            {articleIdeas.map((idea) => (
              <li
                key={idea.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusPill label={articleIdeaSourceLabel(idea.source)} tone="muted" />
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {idea.opportunityScore}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{idea.keyword}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{idea.suggestedTitle}</p>
                  {idea.suggestedAngle ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{idea.suggestedAngle}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {renderLink({
                    href: paths.keywordsHref(idea.keyword, idea.source),
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
                      title: idea.suggestedTitle,
                      keyword: idea.keyword,
                      angle: idea.suggestedAngle || undefined,
                    }),
                    className: cn(btnPrimary, "h-8 px-3 text-xs"),
                    children: (
                      <>
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Studio
                      </>
                    ),
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
        {semrushConfigured === false ? (
          <p className="text-sm text-muted-foreground">
            Semrush is not configured for this org.{" "}
            {renderLink({
              href: paths.settingsHref(),
              className: "font-medium text-primary underline-offset-2 hover:underline",
              children: "Add a Semrush API key in Settings",
            })}
            .
          </p>
        ) : null}
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
