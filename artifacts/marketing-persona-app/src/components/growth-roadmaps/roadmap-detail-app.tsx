"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Pin, PinOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { RoadmapChat } from "@/components/roadmap/roadmap-chat";
import { useActiveProject } from "@/context/use-active-project";
import { useProjectContent } from "@/lib/queries";

interface Phase {
  title: string;
  timeframe: string;
  objectives: string[];
  tactics: string[];
  kpis: string[];
}

interface RoadmapContent {
  executiveSummary?: string;
  phases?: Phase[];
}

type RoadmapDetailAppProps = {
  roadmapId: number;
  slug: string;
  industry: string;
  location: string;
  stage: string;
  content: RoadmapContent;
};

export function RoadmapDetailApp({
  roadmapId,
  slug,
  industry,
  location,
  stage,
  content,
}: RoadmapDetailAppProps) {
  const router = useRouter();
  const { activeProjectId } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const { data: projectContent } = useProjectContent(projectId || null);
  const [pinLoading, setPinLoading] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [pinOverride, setPinOverride] = useState<boolean | null>(null);

  const phases = content?.phases ?? [];

  const isPinnedFromQuery =
    activeProjectId != null
      ? ((projectContent?.roadmaps ?? []) as Array<{ id: number }>).some((r) => r.id === roadmapId)
      : false;
  const isPinned = pinOverride ?? (activeProjectId ? isPinnedFromQuery : false);

  async function togglePin() {
    if (!activeProjectId) {
      toast.error("Select a project first");
      return;
    }
    setPinLoading(true);
    try {
      const method = isPinned ? "DELETE" : "POST";
      const res = await fetch(
        `/api/website-projects/${activeProjectId}/roadmaps/${roadmapId}`,
        { method },
      );
      if (!res.ok) {
        toast.error(isPinned ? "Failed to unpin" : "Failed to pin");
        return;
      }
      setPinOverride(!isPinned);
      toast.success(isPinned ? "Removed from project" : "Pinned to project");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPinLoading(false);
    }
  }

  async function generateContentStrategy() {
    if (!activeProjectId) {
      toast.error("Select a project first");
      return;
    }
    setGeneratingStrategy(true);
    try {
      const res = await fetch("/api/content-strategies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmapId,
          websiteProjectId: activeProjectId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to generate content strategy");
        return;
      }
      const data = (await res.json()) as { strategy?: { id?: number } };
      const strategyId = data.strategy?.id;
      if (!strategyId) {
        toast.error("Strategy generated but no result id was returned.");
        return;
      }
      toast.success("Content strategy generated");
      router.push(`/content-strategy/${strategyId}`);
    } catch {
      toast.error("Failed to generate content strategy");
    } finally {
      setGeneratingStrategy(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6 pb-32">
      <Link
        href="/strategy/roadmaps"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Growth roadmaps
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Badge variant="muted" className="mb-2 capitalize">
            {location} · {stage}
          </Badge>
          <h1 className="text-2xl font-bold">{industry}</h1>
          <p className="text-sm text-muted-foreground mt-1">12-month growth roadmap</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            onClick={generateContentStrategy}
            disabled={generatingStrategy || !activeProjectId}
          >
            {generatingStrategy ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate content strategy
              </>
            )}
          </Button>
          {activeProjectId && isPinned != null && (
            <Button variant="outline" onClick={togglePin} disabled={pinLoading}>
              {isPinned ? (
                <>
                  <PinOff className="h-4 w-4" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4" />
                  Pin to project
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {content.executiveSummary && (
        <div className="paper-card rounded-xl p-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Executive summary
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {content.executiveSummary}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {phases.map((phase, i) => (
          <div key={`${phase.title}-${phase.timeframe}`} className="paper-card rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="step-dot active shrink-0">{i + 1}</div>
              <div>
                <h3 className="font-bold text-lg">{phase.title}</h3>
                <p className="text-sm text-primary font-medium">{phase.timeframe}</p>
              </div>
            </div>
            {phase.objectives?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Objectives
                </h4>
                <ul className="space-y-1.5">
                  {phase.objectives.map((o, j) => (
                    <li key={j} className="text-sm flex gap-2">
                      <span className="text-primary">•</span>
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {phase.tactics?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Tactics
                </h4>
                <ul className="space-y-1.5">
                  {phase.tactics.map((t, j) => (
                    <li key={j} className="text-sm flex gap-2">
                      <span className="text-muted-foreground">→</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {phase.kpis?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  KPIs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {phase.kpis.map((kpi, j) => (
                    <span key={j} className="text-xs bg-muted rounded-md px-2.5 py-1">
                      {kpi}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <RoadmapChat slug={slug} />
    </div>
  );
}
