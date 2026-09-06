import { useMemo, useState } from "react";
import {
  StrategyCalendarView,
  StrategyGoalsView,
  StrategyHubGrid,
  StrategyRoadmapsView,
  StrategyTopicalMapView,
} from "@workspace/app-shell";
import { SectionShell } from "@/components/SectionShell";
import { useActiveProject } from "@/hooks/use-active-project";
import {
  useBrandKeywords,
  useBriefsData,
  useCalendarPieces,
  useGoalsData,
  useGscSyncStatus,
  useRoadmapsCatalog,
} from "@/hooks/use-section-queries";
import { apiFetch } from "@/lib/api";
import { renderLink, strategyTabs } from "@/pages/section-page-shared";

export function StrategyHubPage() {
  const { projectId } = useActiveProject();
  return (
    <SectionShell title="Strategy" description="Plan goals, editorial calendar, and roadmap alignment." tabs={strategyTabs}>
      <StrategyHubGrid projectId={projectId} renderLink={renderLink} />
    </SectionShell>
  );
}

export function StrategyGoalsPage() {
  const { projectId, activeProject } = useActiveProject();
  const { goals, error } = useGoalsData(projectId);
  const { briefs } = useBriefsData(projectId);
  const { gscStatus } = useGscSyncStatus(projectId);
  const [goalForm, setGoalForm] = useState({ objective: "traffic", targetMetric: "" });
  const [saving, setSaving] = useState(false);
  const [compilingGoalId, setCompilingGoalId] = useState<number | null>(null);

  async function createGoal() {
    if (!projectId || !goalForm.targetMetric.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectId),
          objective: goalForm.objective,
          targetMetric: goalForm.targetMetric,
        }),
      });
      setGoalForm({ objective: "traffic", targetMetric: "" });
    } finally {
      setSaving(false);
    }
  }

  async function compileBriefs(goalId: number) {
    setCompilingGoalId(goalId);
    try {
      await apiFetch(`/api/goals/${goalId}/compile-briefs`, { method: "POST" });
    } finally {
      setCompilingGoalId(null);
    }
  }

  return (
    <SectionShell title="Strategy goals" description="Active growth goals for this project." tabs={strategyTabs}>
      <StrategyGoalsView
        goals={goals}
        briefs={briefs}
        error={error}
        saving={saving}
        goalForm={goalForm}
        onGoalFormChange={setGoalForm}
        onCreateGoal={() => void createGoal()}
        onCompileBriefs={(id) => void compileBriefs(id)}
        compilingGoalId={compilingGoalId}
        gscStatus={gscStatus}
        renderLink={renderLink}
        projectDetailHref={activeProject ? `/projects/${activeProject.id}` : undefined}
      />
    </SectionShell>
  );
}

export function StrategyCalendarPage() {
  const { projectId } = useActiveProject();
  const { pieces, error } = useCalendarPieces(projectId);

  return (
    <SectionShell title="Editorial calendar" description="Content scheduled by planned date." tabs={strategyTabs}>
      <StrategyCalendarView pieces={pieces} projectId={projectId} error={error} renderLink={renderLink} />
    </SectionShell>
  );
}

export function StrategyRoadmapsPage() {
  const { roadmaps, error } = useRoadmapsCatalog();

  return (
    <SectionShell title="Roadmaps" description="Programmatic growth roadmaps catalog." tabs={strategyTabs} requireProject={false}>
      <StrategyRoadmapsView roadmaps={roadmaps} error={error} renderLink={renderLink} />
    </SectionShell>
  );
}

export function StrategyTopicalMapPage() {
  const { projectId, activeProject } = useActiveProject();
  const { keywords, error } = useBrandKeywords(projectId);
  const { briefs } = useBriefsData(projectId);
  const briefClusters = useMemo(() => {
    const map = new Map<string, number>();
    for (const brief of briefs) {
      const cluster = brief.targetKeywordCluster?.trim() || "Unclustered";
      map.set(cluster, (map.get(cluster) ?? 0) + 1);
    }
    return [...map.entries()].map(([cluster, count]) => ({ cluster, count }));
  }, [briefs]);

  return (
    <SectionShell title="Topical map" description="Primary keyword clusters from your brand profile." tabs={strategyTabs}>
      <StrategyTopicalMapView
        keywords={keywords}
        briefClusters={briefClusters}
        error={error}
        renderLink={renderLink}
        projectDetailHref={activeProject ? `/projects/${activeProject.id}` : undefined}
      />
    </SectionShell>
  );
}
