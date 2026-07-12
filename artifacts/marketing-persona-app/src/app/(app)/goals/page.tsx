"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useActiveProject } from "@/context/active-project";
import { useBriefs, useGoals } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";

interface Goal {
  id: number;
  objective: string;
  targetMetric: string;
  status: string;
  deadline: string | null;
}

interface Brief {
  id: number;
  workingTitle: string;
  targetKeywordCluster: string;
  status: string;
}

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { activeProjectId, activeProject } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const { data: goals = [], isLoading: goalsLoading } = useGoals(projectId);
  const { data: briefs = [], isLoading: briefsLoading } = useBriefs(projectId);
  const loading = goalsLoading || briefsLoading;
  const [goalForm, setGoalForm] = useState({ objective: "traffic", targetMetric: "" });
  const [briefForm, setBriefForm] = useState({ workingTitle: "", targetKeywordCluster: "", outline: "" });

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

  return (
    <div className="px-8 py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Goals & Briefs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Content pipeline: goals define outcomes, briefs become drafts
        </p>
      </div>

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
          <div className="paper-card p-6 rounded-xl space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" /> Goals
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                value={goalForm.objective}
                onChange={(e) => setGoalForm((p) => ({ ...p, objective: e.target.value }))}
              >
                {["traffic", "leads", "sales", "authority"].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Target metric (e.g. 10k monthly visits)"
                value={goalForm.targetMetric}
                onChange={(e) => setGoalForm((p) => ({ ...p, targetMetric: e.target.value }))}
              />
            </div>
            <Button size="sm" onClick={createGoal} disabled={!projectId}>
              <Plus className="h-4 w-4" /> Add goal
            </Button>
            <ul className="space-y-2 mt-4">
              {(goals as Goal[]).map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border text-sm"
                >
                  <span className="font-medium capitalize">
                    {g.objective}: {g.targetMetric}
                  </span>
                  <Badge variant="muted">{g.status}</Badge>
                </li>
              ))}
            </ul>
          </div>

          <div className="paper-card p-6 rounded-xl space-y-4">
            <h2 className="font-semibold">Content briefs</h2>
            <Input
              placeholder="Working title"
              value={briefForm.workingTitle}
              onChange={(e) => setBriefForm((p) => ({ ...p, workingTitle: e.target.value }))}
            />
            <Input
              placeholder="Target keyword cluster"
              value={briefForm.targetKeywordCluster}
              onChange={(e) => setBriefForm((p) => ({ ...p, targetKeywordCluster: e.target.value }))}
            />
            <Textarea
              placeholder="Outline (optional)"
              rows={3}
              value={briefForm.outline}
              onChange={(e) => setBriefForm((p) => ({ ...p, outline: e.target.value }))}
            />
            <Button size="sm" onClick={createBrief} disabled={!projectId}>
              <Plus className="h-4 w-4" /> Add brief
            </Button>
            <ul className="space-y-2 mt-4">
              {(briefs as Brief[]).map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border text-sm"
                >
                  <div>
                    <p className="font-medium">{b.workingTitle}</p>
                    <p className="text-xs text-muted-foreground">{b.targetKeywordCluster}</p>
                  </div>
                  <Badge variant="muted">{b.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
