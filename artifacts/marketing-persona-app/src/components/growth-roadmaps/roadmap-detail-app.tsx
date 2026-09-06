"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Pin, PinOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RoadmapChat } from "@/components/roadmap/roadmap-chat";
import { useActiveProject } from "@/context/use-active-project";
import { useProjectContent } from "@/lib/queries";

const EASE = [0.16, 1, 0.3, 1] as const;

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

type Step =
  | { kind: "intro" }
  | { kind: "summary"; text: string }
  | { kind: "phase"; index: number; phase: Phase }
  | { kind: "actions" };

function buildSteps(content: RoadmapContent): Step[] {
  const phases = content.phases ?? [];
  const steps: Step[] = [{ kind: "intro" }];
  if (content.executiveSummary?.trim()) {
    steps.push({ kind: "summary", text: content.executiveSummary.trim() });
  }
  for (let i = 0; i < phases.length; i++) {
    steps.push({ kind: "phase", index: i, phase: phases[i]! });
  }
  steps.push({ kind: "actions" });
  return steps;
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
  const reduceMotion = useReducedMotion();
  const { activeProjectId } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const { data: projectContent } = useProjectContent(projectId || null);
  const [pinLoading, setPinLoading] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [pinOverride, setPinOverride] = useState<boolean | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const steps = useMemo(() => buildSteps(content), [content]);
  const step = steps[stepIndex] ?? steps[0];
  const total = steps.length;
  const progressPct = total > 0 ? Math.round(((stepIndex + 1) / total) * 100) : 0;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= total - 1;

  const isPinnedFromQuery =
    activeProjectId != null
      ? ((projectContent?.roadmaps ?? []) as Array<{ id: number }>).some((r) => r.id === roadmapId)
      : false;
  const isPinned = pinOverride ?? (activeProjectId ? isPinnedFromQuery : false);

  const goNext = useCallback(() => {
    if (isLast) return;
    setDirection(1);
    setStepIndex((i) => Math.min(total - 1, i + 1));
  }, [isLast, total]);

  const goBack = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    setStepIndex((i) => Math.max(0, i - 1));
  }, [isFirst]);

  const goNextRef = useRef(goNext);
  const goBackRef = useRef(goBack);
  useEffect(() => {
    goNextRef.current = goNext;
    goBackRef.current = goBack;
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "Enter" || e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNextRef.current();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "Backspace") {
        e.preventDefault();
        goBackRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const variants = reduceMotion
    ? { enter: { opacity: 1, y: 0 }, center: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 } }
    : {
        enter: (dir: 1 | -1) => ({ opacity: 0, y: dir === 1 ? 24 : -24 }),
        center: { opacity: 1, y: 0 },
        exit: (dir: 1 | -1) => ({ opacity: 0, y: dir === 1 ? -24 : 24 }),
      };

  const stepKey =
    step?.kind === "phase"
      ? `phase-${step.index}`
      : step?.kind === "summary"
        ? "summary"
        : step?.kind ?? "intro";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col pb-28">
      <div className="h-1 w-full bg-secondary">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Roadmap progress"
        />
      </div>

      <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        <Link
          href="/strategy/roadmaps"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Growth roadmaps
        </Link>
        <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {stepIndex + 1} of {total}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {!isFirst && (
          <button
            type="button"
            onClick={goBack}
            className="mb-6 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepKey}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: EASE }}
          >
            {step?.kind === "intro" && (
              <div className="space-y-6">
                <p className="text-sm font-medium capitalize text-muted-foreground">
                  {location} · {stage}
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {industry}
                </h1>
                <p className="max-w-prose text-lg text-muted-foreground">
                  A 12-month growth roadmap — walk through each phase one at a time.
                </p>
              </div>
            )}

            {step?.kind === "summary" && (
              <div className="space-y-6">
                <p className="text-sm font-medium text-muted-foreground">Executive summary</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Where this roadmap is headed
                </h1>
                <p className="max-w-prose text-base leading-relaxed text-foreground/90 sm:text-lg">
                  {step.text}
                </p>
              </div>
            )}

            {step?.kind === "phase" && (
              <PhaseStep
                number={step.index + 1}
                phaseCount={(content.phases ?? []).length}
                phase={step.phase}
              />
            )}

            {step?.kind === "actions" && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Next step</p>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Ready to turn this into content?
                  </h1>
                  <p className="max-w-prose text-muted-foreground">
                    Generate a content strategy from this roadmap, or pin it to your active project.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    size="lg"
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
                  {activeProjectId && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={togglePin}
                      disabled={pinLoading}
                    >
                      {isPinned ? (
                        <>
                          <PinOff className="h-4 w-4" />
                          Unpin from project
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
                {!activeProjectId && (
                  <p className="text-sm text-muted-foreground">
                    Select a project in the sidebar to generate a strategy or pin this roadmap.
                  </p>
                )}
              </div>
            )}

            {!isLast && (
              <div className="mt-10 flex items-center gap-4">
                <Button size="lg" onClick={goNext}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">press Enter ↵</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <RoadmapChat slug={slug} />
    </div>
  );
}

function PhaseStep({
  number,
  phaseCount,
  phase,
}: {
  number: number;
  phaseCount: number;
  phase: Phase;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Phase {number} of {phaseCount}
          {phase.timeframe ? ` · ${phase.timeframe}` : ""}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {phase.title}
        </h1>
      </div>

      {phase.objectives?.length > 0 && (
        <Section label="Objectives">
          <ul className="space-y-3">
            {phase.objectives.map((o, j) => (
              <li key={j} className="flex gap-3 text-base leading-relaxed text-foreground/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {o}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {phase.tactics?.length > 0 && (
        <Section label="Tactics">
          <ul className="space-y-3">
            {phase.tactics.map((t, j) => (
              <li key={j} className="flex gap-3 text-base leading-relaxed text-foreground/90">
                <span className="shrink-0 text-muted-foreground" aria-hidden>
                  →
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {phase.kpis?.length > 0 && (
        <Section label="KPIs">
          <ul className="space-y-3">
            {phase.kpis.map((kpi, j) => (
              <li
                key={j}
                className="rounded-lg border border-border bg-secondary/60 px-4 py-3 text-sm leading-relaxed text-foreground"
              >
                {kpi}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </h2>
      {children}
    </div>
  );
}
