"use client";

import Link from "next/link";
import { Plus, Target, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { Brief, Goal } from "@/lib/queries/types";

export function GoalsPanelBriefsSection({
  projectId,
  goals,
  briefs,
  goalForm,
  setGoalForm,
  briefForm,
  setBriefForm,
  compilingGoalId,
  onCreateGoal,
  onCreateBrief,
  onCompileBriefs,
  onApproveBrief,
}: {
  projectId: string;
  goals: Goal[];
  briefs: Brief[];
  goalForm: { objective: string; targetMetric: string };
  setGoalForm: React.Dispatch<React.SetStateAction<{ objective: string; targetMetric: string }>>;
  briefForm: { workingTitle: string; targetKeywordCluster: string; outline: string };
  setBriefForm: React.Dispatch<
    React.SetStateAction<{ workingTitle: string; targetKeywordCluster: string; outline: string }>
  >;
  compilingGoalId: number | null;
  onCreateGoal: () => void;
  onCreateBrief: () => void;
  onCompileBriefs: (goalId: number) => void;
  onApproveBrief: (briefId: number) => void;
}) {
  return (
    <>
      <div className="paper-card p-6 rounded-xl space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" /> Goals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            aria-label="Goal objective"
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
        <Button size="sm" onClick={onCreateGoal} disabled={!projectId}>
          <Plus className="h-4 w-4" /> Add goal
        </Button>
        <ul className="space-y-2 mt-4">
          {goals.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border text-sm"
            >
              <span className="font-medium capitalize">
                {g.objective}: {g.targetMetric}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="muted">{g.status}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={compilingGoalId === g.id}
                  onClick={() => onCompileBriefs(g.id)}
                >
                  {compilingGoalId === g.id ? "Compiling…" : "Compile briefs"}
                </Button>
              </div>
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
        <Button size="sm" onClick={onCreateBrief} disabled={!projectId}>
          <Plus className="h-4 w-4" /> Add brief
        </Button>
        <ul className="space-y-2 mt-4">
          {briefs.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{b.workingTitle}</p>
                <p className="text-xs text-muted-foreground">{b.targetKeywordCluster}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="muted">{b.status}</Badge>
                {b.status === "draft" && (
                  <Button variant="secondary" size="sm" onClick={() => onApproveBrief(b.id)}>
                    Approve
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild disabled={b.status === "draft"}>
                  <Link href={`/projects/${projectId}/content-studio?briefId=${b.id}`}>
                    <Layers className="h-3.5 w-3.5" />
                    Create in Studio
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
