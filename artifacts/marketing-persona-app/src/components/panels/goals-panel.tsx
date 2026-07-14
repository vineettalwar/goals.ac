"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Target, Layers, Map, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useActiveProject } from "@/context/use-active-project";
import { useBriefs, useGoals, useGscSyncStatus } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import type { Brief, Goal } from "@/lib/queries/types";
import { GoalsPanelBriefsSection } from "./goals-panel-briefs";
import { formatDisplayDateTime } from "@/lib/format/date";

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
  const { data: gscStatus = null } = useGscSyncStatus(projectId);

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
                <Map className="h-4 w-4" /> Cluster map
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
                Search Console query sync feeds opportunity scoring for goal-aligned briefs.
              </p>
              {!gscStatus ? (
                <p className="text-sm text-muted-foreground">Loading GSC status…</p>
              ) : !gscStatus.connected ? (
                <p className="text-sm text-muted-foreground">
                  Connect Google Search Console in project integrations to track ranking progress.
                </p>
              ) : (
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Property</dt>
                    <dd>{gscStatus.propertyVerified ? "Verified" : "Pending verification"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Queries indexed</dt>
                    <dd>{gscStatus.queryCount}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Last sync</dt>
                    <dd>
                      {gscStatus.lastSyncedAt
                        ? formatDisplayDateTime(gscStatus.lastSyncedAt)
                        : "Not synced yet"}
                    </dd>
                  </div>
                </dl>
              )}
              <Button variant="outline" size="sm" asChild disabled={!projectId}>
                <Link href={projectId ? `/projects/${projectId}/integrations` : "#"}>
                  Manage GSC connection
                </Link>
              </Button>
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
