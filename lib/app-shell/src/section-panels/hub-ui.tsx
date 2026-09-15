import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../cn";
import type { SectionLinkProps } from "../section/types";

function HubTile({
  href,
  title,
  hint,
  renderLink,
}: {
  href: string;
  title: string;
  hint: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  return (
    <>
      {renderLink({
        href,
        className: "group flex items-center gap-3 border-b border-border py-3 transition-colors hover:text-primary",
        children: (
          <>
            <span className="min-w-0 flex-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
          </>
        ),
      })}
    </>
  );
}

export function StrategyHubGrid({
  projectId: _projectId,
  renderLink,
}: {
  projectId: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  return (
    <div>
      <HubTile renderLink={renderLink} href="/strategy/roadmaps" title="Roadmaps" hint="12-month growth plan" />
      <HubTile renderLink={renderLink} href="/strategy/calendar" title="Calendar" hint="Planned content dates" />
      <HubTile renderLink={renderLink} href="/strategy/topical-map" title="Topical map" hint="Keyword clusters" />
      <HubTile renderLink={renderLink} href="/strategy/goals" title="Goals" hint="Traffic and authority targets" />
    </div>
  );
}

export function SearchHubGrid({
  projectId: _projectId,
  renderLink,
}: {
  projectId: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  return (
    <div>
      <HubTile renderLink={renderLink} href="/search/keywords" title="Keywords" hint="Tracked rank terms" />
      <HubTile renderLink={renderLink} href="/search/visibility" title="AI visibility" hint="LLM citation tracking" />
      <HubTile renderLink={renderLink} href="/search/performance" title="Performance" hint="GSC and GA4" />
      <HubTile renderLink={renderLink} href="/search/site" title="Site links" hint="Crawl and index status" />
    </div>
  );
}

export function ResearchHubGrid({
  projectId: _projectId,
  renderLink,
}: {
  projectId: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  return (
    <div>
      <HubTile renderLink={renderLink} href="/research/competitors" title="Competitors" hint="Watchlist and attack plans" />
      <HubTile renderLink={renderLink} href="/research/reddit" title="Signals" hint="Community demand" />
    </div>
  );
}

export function HubCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("flex h-14 animate-pulse items-center border-b border-border")}>
          <div className="h-3.5 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
