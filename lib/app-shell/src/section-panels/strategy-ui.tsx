import type { ReactNode } from "react";
import { Calendar, Map, Pin, Plus, Sparkles, Target, TrendingUp } from "lucide-react";
import { cn } from "../cn";
import type { SectionLinkProps } from "../section/types";
import { btnOutline, btnPrimary, inputClass, PanelLoading, StatusPill, StatCard } from "./shared";

export type StrategyGoal = {
  id: number;
  objective: string;
  status: string;
  targetMetric: string;
};

export type StrategyBrief = {
  id: number;
  workingTitle: string;
  targetKeywordCluster?: string | null;
  status: string;
};

export type CalendarPiece = {
  id: number;
  title: string;
  plannedDate?: string | null;
  status?: string;
};

export type RoadmapCatalogItem = {
  id: number;
  slug: string;
  industry: string;
  location: string;
  stage: string;
};

function SectionLink({
  renderLink,
  ...props
}: SectionLinkProps & { renderLink: (props: SectionLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

export function StrategyGoalsView({
  goals,
  briefs,
  loading,
  error,
  saving,
  goalForm,
  onGoalFormChange,
  onCreateGoal,
  onCompileBriefs,
  compilingGoalId,
  gscStatus,
  renderLink,
  projectDetailHref,
}: {
  goals: StrategyGoal[];
  briefs: StrategyBrief[];
  loading?: boolean;
  error?: string | null;
  saving?: boolean;
  goalForm: { objective: string; targetMetric: string };
  onGoalFormChange: (next: { objective: string; targetMetric: string }) => void;
  onCreateGoal?: () => void;
  onCompileBriefs?: (goalId: number) => void;
  compilingGoalId?: number | null;
  gscStatus?: {
    connected: boolean;
    propertyVerified?: boolean;
    queryCount?: number;
    lastSyncedAt?: string | null;
  } | null;
  renderLink: (props: SectionLinkProps) => ReactNode;
  projectDetailHref?: string;
}) {
  const clusterMap = briefs.reduce<Record<string, StrategyBrief[]>>((acc, brief) => {
    const cluster = brief.targetKeywordCluster?.trim() || "Unclustered";
    acc[cluster] = [...(acc[cluster] ?? []), brief];
    return acc;
  }, {});

  if (loading && goals.length === 0 && briefs.length === 0) {
    return <PanelLoading label="Loading goals…" />;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="paper-card space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Map className="h-4 w-4 text-violet-600" /> Cluster map
          </h2>
          <p className="text-xs text-muted-foreground">
            Briefs grouped by keyword cluster — full topical map lives in Topical map.
          </p>
          {Object.keys(clusterMap).length === 0 ? (
            <p className="text-sm text-muted-foreground">Compile or add briefs to see clusters.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(clusterMap).map(([cluster, items]) => (
                <li key={cluster} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{cluster}</span>
                    <StatusPill label={`${items.length} brief${items.length === 1 ? "" : "s"}`} tone="primary" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="paper-card space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> GSC progress
          </h2>
          {!gscStatus ? (
            <p className="text-sm text-muted-foreground">Loading GSC status…</p>
          ) : !gscStatus.connected ? (
            <p className="text-sm text-muted-foreground">
              Connect Google Search Console in Integrations to track ranking progress.
            </p>
          ) : (
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Property</dt>
                <dd>{gscStatus.propertyVerified ? "Verified" : "Pending verification"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Queries indexed</dt>
                <dd>{gscStatus.queryCount ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Last sync</dt>
                <dd>{gscStatus.lastSyncedAt ? new Date(gscStatus.lastSyncedAt).toLocaleString() : "Not synced yet"}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <div className="paper-card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-blue-600" /> Create goal
        </h2>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <select
            value={goalForm.objective}
            onChange={(e) => onGoalFormChange({ ...goalForm, objective: e.target.value })}
            className={inputClass}
          >
            <option value="traffic">Traffic</option>
            <option value="leads">Leads</option>
            <option value="authority">Authority</option>
          </select>
          <input
            type="text"
            value={goalForm.targetMetric}
            onChange={(e) => onGoalFormChange({ ...goalForm, targetMetric: e.target.value })}
            placeholder="Target metric (e.g. 10k organic sessions/mo)"
            className={inputClass}
          />
          <button type="button" disabled={saving || !onCreateGoal} onClick={onCreateGoal} className={btnPrimary}>
            <Plus className="mr-1 inline h-4 w-4" /> Add goal
          </button>
        </div>
      </div>

      <div className="paper-card divide-y overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Goals ({goals.length})</h2>
        </div>
        {goals.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No goals yet. Create one above.</p>
        ) : (
          goals.map((goal) => (
            <div key={goal.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium capitalize">{goal.objective}</p>
                <p className="text-xs text-muted-foreground">{goal.targetMetric}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={goal.status} tone={goal.status === "active" ? "success" : "muted"} />
                {onCompileBriefs ? (
                  <button
                    type="button"
                    disabled={compilingGoalId === goal.id}
                    onClick={() => onCompileBriefs(goal.id)}
                    className={btnOutline}
                  >
                    {compilingGoalId === goal.id ? "Compiling…" : "Compile briefs"}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {briefs.length > 0 ? (
        <div className="paper-card divide-y overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Briefs ({briefs.length})</h2>
          </div>
          {briefs.map((brief) => (
            <div key={brief.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{brief.workingTitle}</p>
                {brief.targetKeywordCluster ? (
                  <p className="text-xs text-muted-foreground">{brief.targetKeywordCluster}</p>
                ) : null}
              </div>
              <StatusPill label={brief.status} tone={brief.status === "approved" ? "success" : "muted"} />
            </div>
          ))}
        </div>
      ) : null}

      {projectDetailHref ? (
        <p className="text-xs text-muted-foreground">
          Edit brand keywords in{" "}
          <SectionLink renderLink={renderLink} href={projectDetailHref} className="font-medium text-primary hover:underline">
            project brand profile
          </SectionLink>
          .
        </p>
      ) : null}
    </div>
  );
}

export function StrategyCalendarView({
  pieces,
  loading,
  error,
  renderLink,
}: {
  pieces: CalendarPiece[];
  loading?: boolean;
  error?: string | null;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  const scheduled = pieces.filter((piece) => piece.plannedDate);

  if (loading && pieces.length === 0) {
    return <PanelLoading label="Loading calendar…" />;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Scheduled" value={scheduled.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Total pieces" value={pieces.length} icon={<Sparkles className="h-5 w-5" />} />
        <StatCard
          label="This month"
          value={scheduled.filter((p) => p.plannedDate?.startsWith(new Date().toISOString().slice(0, 7))).length}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
      <div className="paper-card divide-y overflow-hidden">
        {scheduled.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No planned dates on content pieces yet.</p>
        ) : (
          scheduled.map((piece) => (
            <SectionLink
              key={piece.id}
              renderLink={renderLink}
              href={`/content-piece/${piece.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-secondary/20"
            >
              <span className="truncate font-medium">{piece.title}</span>
              <span className="shrink-0 text-muted-foreground">{piece.plannedDate}</span>
            </SectionLink>
          ))
        )}
      </div>
    </div>
  );
}

export function StrategyRoadmapsView({
  roadmaps,
  loading,
  error,
  renderLink,
}: {
  roadmaps: RoadmapCatalogItem[];
  loading?: boolean;
  error?: string | null;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  if (loading && roadmaps.length === 0) {
    return <PanelLoading label="Loading roadmaps…" />;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {roadmaps.map((roadmap) => (
          <SectionLink
            key={roadmap.id}
            renderLink={renderLink}
            href={`/growth-roadmaps/${roadmap.slug}`}
            className="paper-card block p-4 transition-colors hover:bg-secondary/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{roadmap.industry}</p>
                <p className="mt-1 text-xs text-muted-foreground">{roadmap.location}</p>
              </div>
              <Pin className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <StatusPill label={roadmap.stage} tone="primary" />
          </SectionLink>
        ))}
      </div>
      {roadmaps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roadmaps in database.</p>
      ) : null}
    </div>
  );
}

export function StrategyTopicalMapView({
  keywords,
  briefClusters,
  loading,
  error,
  projectDetailHref,
  renderLink,
}: {
  keywords: string[];
  briefClusters?: Array<{ cluster: string; count: number }>;
  loading?: boolean;
  error?: string | null;
  projectDetailHref?: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  if (loading && keywords.length === 0) {
    return <PanelLoading label="Loading topical map…" />;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {keywords.map((kw) => (
          <div key={kw} className="paper-card p-4">
            <p className="text-sm font-semibold">{kw}</p>
            <p className="mt-1 text-xs text-muted-foreground">Primary brand keyword</p>
          </div>
        ))}
      </div>
      {keywords.length === 0 ? (
        <div className="paper-card border-dashed p-8 text-center text-sm text-muted-foreground">
          Add keywords in your brand profile.
          {projectDetailHref ? (
            <>
              {" "}
              <SectionLink renderLink={renderLink} href={projectDetailHref} className="font-medium text-primary hover:underline">
                Open brand profile
              </SectionLink>
            </>
          ) : null}
        </div>
      ) : null}
      {briefClusters && briefClusters.length > 0 ? (
        <div className="paper-card divide-y overflow-hidden">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold">Brief clusters</h2>
          </div>
          {briefClusters.map((row) => (
            <div key={row.cluster} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{row.cluster}</span>
              <StatusPill label={`${row.count} briefs`} tone="muted" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
