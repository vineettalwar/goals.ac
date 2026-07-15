"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Map as MapIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/use-active-project";
import {
  useGoals,
  useBriefs,
  useGscSyncStatus,
  useGscQueries,
  useKeywordAlerts,
} from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import type { Brief, Goal } from "@/lib/queries/types";
import type { GscQueryRow } from "@/lib/queries/fetchers";
import { GoalsPanelBriefsSection } from "./goals-panel-briefs";
import {
  defaultSyncDateRange,
  priorPeriodRange,
} from "@workspace/seo-tools/gscSearchAnalytics";

type QueryMover = {
  query: string;
  clicksDelta: number;
  impressionsDelta: number;
  clicks: number;
  impressions: number;
};

function sumMetric(rows: GscQueryRow[], key: "clicks" | "impressions") {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
}

function buildQueryMovers(current: GscQueryRow[], prior: GscQueryRow[]) {
  const priorMap = new Map(prior.map((row) => [row.query.toLowerCase(), row]));
  const movers: QueryMover[] = current.map((row) => {
    const prev = priorMap.get(row.query.toLowerCase());
    const clicks = Number(row.clicks) || 0;
    const impressions = Number(row.impressions) || 0;
    const prevClicks = Number(prev?.clicks) || 0;
    const prevImpressions = Number(prev?.impressions) || 0;
    return {
      query: row.query,
      clicks,
      impressions,
      clicksDelta: clicks - prevClicks,
      impressionsDelta: impressions - prevImpressions,
    };
  });

  const improving = [...movers]
    .filter((m) => m.clicksDelta > 0 || m.impressionsDelta > 0)
    .sort((a, b) => b.clicksDelta - a.clicksDelta || b.impressionsDelta - a.impressionsDelta)
    .slice(0, 3);
  const declining = [...movers]
    .filter((m) => m.clicksDelta < 0 || m.impressionsDelta < 0)
    .sort((a, b) => a.clicksDelta - b.clicksDelta || a.impressionsDelta - b.impressionsDelta)
    .slice(0, 3);

  return {
    improving,
    declining,
    totals: {
      clicks: sumMetric(current, "clicks"),
      impressions: sumMetric(current, "impressions"),
      clicksDelta: sumMetric(current, "clicks") - sumMetric(prior, "clicks"),
      impressionsDelta: sumMetric(current, "impressions") - sumMetric(prior, "impressions"),
    },
  };
}

function formatDelta(value: number, suffix = "") {
  if (value === 0) return `0${suffix}`;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString()}${suffix}`;
}

function deltaClass(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-muted-foreground";
}

export function GoalsPanel({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { activeProjectId, activeProject } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const { data: goals = [], isLoading: goalsLoading } = useGoals(projectId);
  const { data: briefs = [], isLoading: briefsLoading } = useBriefs(projectId);
  const loading = goalsLoading || briefsLoading;
  const [goalForm, setGoalForm] = useState({ objective: "traffic", targetMetric: "" });
  const [briefForm, setBriefForm] = useState({ workingTitle: "", targetKeywordCluster: "", outline: "" });
  const [compilingGoalId, setCompilingGoalId] = useState<number | null>(null);
  const { data: gscStatus = null, isLoading: gscStatusLoading } = useGscSyncStatus(projectId);

  const recentRange = useMemo(() => defaultSyncDateRange(14), []);
  const priorRange = useMemo(
    () => priorPeriodRange(recentRange.startDate, recentRange.endDate),
    [recentRange.endDate, recentRange.startDate],
  );
  const gscEnabled = Boolean(projectId && gscStatus?.connected);
  const { data: recentQueries = [], isLoading: recentLoading } = useGscQueries(
    projectId,
    gscEnabled,
    recentRange,
  );
  const { data: priorQueries = [], isLoading: priorLoading } = useGscQueries(
    projectId,
    gscEnabled,
    priorRange,
  );
  const { data: alerts = [], isLoading: alertsLoading } = useKeywordAlerts(projectId);

  const movement = useMemo(
    () => buildQueryMovers(recentQueries, priorQueries),
    [priorQueries, recentQueries],
  );
  const rankMovers = useMemo(
    () =>
      alerts
        .filter((a) => a.previousPosition != null && a.currentPosition != null)
        .slice(0, 4),
    [alerts],
  );
  const hasGscMovement =
    recentQueries.length > 0 &&
    (movement.improving.length > 0 ||
      movement.declining.length > 0 ||
      movement.totals.clicks > 0 ||
      movement.totals.impressions > 0);
  const hasRankMovement = rankMovers.length > 0;
  const progressLoading =
    gscStatusLoading || (gscEnabled && (recentLoading || priorLoading)) || alertsLoading;
  const searchIntegrationsHref = projectId ? `/projects/${projectId}/integrations/search` : "#";

  const clusterMap = briefs.reduce<Record<string, Brief[]>>((acc, brief) => {
    const cluster = brief.targetKeywordCluster?.trim() || "Unclustered";
    acc[cluster] = [...(acc[cluster] ?? []), brief];
    return acc;
  }, {});

  async function createGoal() {
    if (!projectId || !goalForm.targetMetric.trim()) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: Number(projectId),
        objective: goalForm.objective,
        targetMetric: goalForm.targetMetric,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to create goal");
      return;
    }
    const goal = (await res.json()) as Goal;
    queryClient.setQueryData<Goal[]>(queryKeys.goals(projectId), (prev = []) => [goal, ...prev]);
    setGoalForm({ objective: "traffic", targetMetric: "" });
    toast.success("Goal created");
  }

  async function createBrief() {
    if (!projectId || !briefForm.workingTitle.trim()) return;
    const res = await fetch("/api/briefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: Number(projectId),
        workingTitle: briefForm.workingTitle,
        targetKeywordCluster: briefForm.targetKeywordCluster,
        outline: briefForm.outline || undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to create brief");
      return;
    }
    const brief = (await res.json()) as Brief;
    queryClient.setQueryData<Brief[]>(queryKeys.briefs(projectId), (prev = []) => [brief, ...prev]);
    setBriefForm({ workingTitle: "", targetKeywordCluster: "", outline: "" });
    toast.success("Brief created");
  }

  async function compileBriefsForGoal(goalId: number) {
    setCompilingGoalId(goalId);
    try {
      const res = await fetch(`/api/goals/${goalId}/compile-briefs`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { briefs?: Brief[]; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to compile briefs");
        return;
      }
      if (data.briefs?.length) {
        queryClient.setQueryData<Brief[]>(queryKeys.briefs(projectId), (prev = []) => [
          ...data.briefs!,
          ...prev,
        ]);
      }
      toast.success(`Generated ${data.briefs?.length ?? 0} brief suggestions`);
    } finally {
      setCompilingGoalId(null);
    }
  }

  async function approveBrief(briefId: number) {
    const res = await fetch(`/api/briefs/${briefId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (!res.ok) {
      toast.error("Failed to approve brief");
      return;
    }
    const updated = (await res.json()) as Brief;
    queryClient.setQueryData<Brief[]>(queryKeys.briefs(projectId), (prev = []) =>
      prev.map((b) => (b.id === briefId ? updated : b)),
    );
    toast.success("Brief approved");
  }

  const containerClass = embedded ? "space-y-8" : "px-8 py-8 max-w-4xl space-y-8";

  return (
    <div className={containerClass}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold">Goals & Briefs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Content pipeline: goals define outcomes, briefs become drafts
          </p>
        </div>
      ) : null}

      {!projectId ? (
        <div className="paper-card p-6 rounded-xl text-sm text-muted-foreground">
          Choose a project in the sidebar to manage goals and briefs.
        </div>
      ) : loading && goals.length === 0 && briefs.length === 0 ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {activeProject && (
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-medium text-foreground">{activeProject.name}</span>
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="paper-card p-6 rounded-xl space-y-3">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <MapIcon className="h-4 w-4" /> Cluster map
              </h2>
              <p className="text-xs text-muted-foreground">
                Briefs grouped by keyword cluster — full topical map lives in Search → Topical map.
              </p>
              {Object.keys(clusterMap).length === 0 ? (
                <p className="text-sm text-muted-foreground">Compile or add briefs to see clusters.</p>
              ) : (
                <ul className="space-y-2">
                  {Object.entries(clusterMap).map(([cluster, items]) => (
                    <li key={cluster} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{cluster}</span>
                        <Badge variant="muted">{items.length} brief{items.length === 1 ? "" : "s"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {items.filter((b) => b.status === "approved").length} approved ·{" "}
                        {items.filter((b) => b.status === "draft").length} draft
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/search/topical-map">Open topical map</Link>
              </Button>
            </div>

            <div className="paper-card p-6 rounded-xl space-y-3">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" /> GSC progress
              </h2>
              <p className="text-xs text-muted-foreground">
                Keyword movement from Search Console (last 14d vs prior 14d) and tracked-rank alerts.
              </p>
              {progressLoading ? (
                <p className="text-sm text-muted-foreground">Loading keyword progress…</p>
              ) : !hasGscMovement && !hasRankMovement ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect Search Console for keyword progress
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={searchIntegrationsHref}>Connect Search Console</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {hasGscMovement ? (
                    <>
                      <dl className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Clicks (14d)</dt>
                          <dd>
                            {movement.totals.clicks.toLocaleString()}{" "}
                            <span className={deltaClass(movement.totals.clicksDelta)}>
                              ({formatDelta(movement.totals.clicksDelta)})
                            </span>
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Impressions (14d)</dt>
                          <dd>
                            {movement.totals.impressions.toLocaleString()}{" "}
                            <span className={deltaClass(movement.totals.impressionsDelta)}>
                              ({formatDelta(movement.totals.impressionsDelta)})
                            </span>
                          </dd>
                        </div>
                      </dl>
                      {movement.improving.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Improving</p>
                          <ul className="space-y-1">
                            {movement.improving.map((row) => (
                              <li
                                key={`up-${row.query}`}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <span className="truncate" title={row.query}>
                                  {row.query}
                                </span>
                                <span className={`shrink-0 inline-flex items-center gap-1 ${deltaClass(row.clicksDelta || row.impressionsDelta)}`}>
                                  <TrendingUp className="h-3 w-3" />
                                  {row.clicksDelta !== 0
                                    ? formatDelta(row.clicksDelta, " clk")
                                    : formatDelta(row.impressionsDelta, " impr")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {movement.declining.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Declining</p>
                          <ul className="space-y-1">
                            {movement.declining.map((row) => (
                              <li
                                key={`down-${row.query}`}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <span className="truncate" title={row.query}>
                                  {row.query}
                                </span>
                                <span className={`shrink-0 inline-flex items-center gap-1 ${deltaClass(row.clicksDelta || row.impressionsDelta)}`}>
                                  <TrendingDown className="h-3 w-3" />
                                  {row.clicksDelta !== 0
                                    ? formatDelta(row.clicksDelta, " clk")
                                    : formatDelta(row.impressionsDelta, " impr")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {hasRankMovement ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {hasGscMovement ? "Rank alerts" : "Tracked keyword movement"}
                      </p>
                      <ul className="space-y-1">
                        {rankMovers.map((alert) => {
                          const improved =
                            (alert.previousPosition ?? 0) > (alert.currentPosition ?? 0);
                          return (
                            <li
                              key={alert.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="truncate" title={alert.keyword}>
                                {alert.keyword}
                              </span>
                              <span
                                className={`shrink-0 inline-flex items-center gap-1 ${improved ? "text-emerald-600" : "text-rose-600"}`}
                              >
                                {improved ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                #{alert.previousPosition} → #{alert.currentPosition}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={searchIntegrationsHref}>Search integrations</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <GoalsPanelBriefsSection
            projectId={projectId}
            goals={goals}
            briefs={briefs}
            goalForm={goalForm}
            setGoalForm={setGoalForm}
            briefForm={briefForm}
            setBriefForm={setBriefForm}
            compilingGoalId={compilingGoalId}
            onCreateGoal={createGoal}
            onCreateBrief={createBrief}
            onCompileBriefs={(goalId) => void compileBriefsForGoal(goalId)}
            onApproveBrief={(briefId) => void approveBrief(briefId)}
          />
        </>
      )}
    </div>
  );
}
