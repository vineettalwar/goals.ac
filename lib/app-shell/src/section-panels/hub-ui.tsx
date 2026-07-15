import type { ReactNode } from "react";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Eye,
  Globe,
  Lightbulb,
  Map,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "../cn";
import type { SectionLinkProps } from "../section/types";

function HubTile({
  href,
  title,
  hint,
  icon,
  renderLink,
}: {
  href: string;
  title: string;
  hint: string;
  icon: ReactNode;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  return (
    <>
      {renderLink({
        href,
        className: "paper-card group flex items-center gap-3 p-4 transition-colors hover:bg-secondary/20",
        children: (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40">
              {icon}
            </span>
            <span className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{title}</p>
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
  projectId,
  renderLink,
}: {
  projectId: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  const q = projectId ? `?project=${projectId}` : "";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <HubTile
        renderLink={renderLink}
        href={`/strategy/goals${q}`}
        title="Goals"
        hint="Traffic, leads, and authority objectives"
        icon={<Target className="h-4 w-4 text-blue-600" />}
      />
      <HubTile
        renderLink={renderLink}
        href={`/strategy/calendar${q}`}
        title="Calendar"
        hint="Planned content dates"
        icon={<Calendar className="h-4 w-4 text-violet-600" />}
      />
      <HubTile
        renderLink={renderLink}
        href={`/strategy/roadmaps${q}`}
        title="Roadmaps"
        hint="Growth roadmap catalog"
        icon={<Map className="h-4 w-4 text-emerald-600" />}
      />
      <HubTile
        renderLink={renderLink}
        href={`/strategy/topical-map${q}`}
        title="Topical map"
        hint="Brand keywords and clusters"
        icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
      />
    </div>
  );
}

export function SearchHubGrid({
  projectId,
  renderLink,
}: {
  projectId: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  const q = projectId ? `?project=${projectId}` : "";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <HubTile
        renderLink={renderLink}
        href={`/search/keywords${q}`}
        title="Keywords"
        hint="Tracked rank terms"
        icon={<Search className="h-4 w-4 text-blue-600" />}
      />
      <HubTile
        renderLink={renderLink}
        href={`/search/visibility${q}`}
        title="AI visibility"
        hint="LLM citation tracking"
        icon={<Eye className="h-4 w-4 text-violet-600" />}
      />
      <HubTile
        renderLink={renderLink}
        href={`/search/performance${q}`}
        title="Performance"
        hint="GSC and GA4 article metrics"
        icon={<BarChart3 className="h-4 w-4 text-emerald-600" />}
      />
      <HubTile
        renderLink={renderLink}
        href={`/search/suggestions${q}`}
        title="Suggestions"
        hint="Keyword opportunities"
        icon={<Lightbulb className="h-4 w-4 text-amber-600" />}
      />
      <HubTile
        renderLink={renderLink}
        href={`/search/site${q}`}
        title="Site"
        hint="Crawl and index status"
        icon={<Globe className="h-4 w-4 text-sky-600" />}
      />
    </div>
  );
}

export function ResearchHubGrid({
  projectId,
  renderLink,
}: {
  projectId: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  const q = projectId ? `?project=${projectId}` : "";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <HubTile
        renderLink={renderLink}
        href={`/research/competitors${q}`}
        title="Competitors"
        hint="AI competitor analyses"
        icon={<Users className="h-4 w-4 text-red-600" />}
      />
      <HubTile
        renderLink={renderLink}
        href={`/research/reddit${q}`}
        title="Reddit"
        hint="Community visibility research"
        icon={<Globe className="h-4 w-4 text-orange-600" />}
      />
    </div>
  );
}

export function HubCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("paper-card flex h-[72px] animate-pulse items-center gap-3 p-4")}>
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-24 rounded bg-muted" />
            <div className="h-3 w-36 rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
