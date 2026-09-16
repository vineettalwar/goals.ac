"use client";

import { CheckCircle2, Loader2, PauseCircle, XCircle } from "lucide-react";

export type LoopStepEvent = {
  type?: string;
  tool?: string;
  decision?: string;
  summary?: string;
  error?: string;
  ok?: boolean;
  runStatus?: string;
};

export function applyLoopStepEvent(steps: LoopStepEvent[], event: { type?: string; [key: string]: unknown }): LoopStepEvent[] {
  if (event.type !== "loop_step") return steps;
  return [
    ...steps,
    {
      type: "loop_step",
      tool: typeof event.tool === "string" ? event.tool : undefined,
      decision: typeof event.decision === "string" ? event.decision : undefined,
      summary: typeof event.summary === "string" ? event.summary : undefined,
      error: typeof event.error === "string" ? event.error : undefined,
      ok: typeof event.ok === "boolean" ? event.ok : undefined,
      runStatus: typeof event.runStatus === "string" ? event.runStatus : undefined,
    },
  ];
}

export function loopStepsFromTrajectory(
  trajectory: Array<{
    tool?: string;
    decision?: string;
    summary?: string;
    error?: string;
    ok?: boolean;
  }>,
  runStatus?: string,
): LoopStepEvent[] {
  return trajectory.map((step) => ({
    type: "loop_step",
    tool: step.tool,
    decision: step.decision,
    summary: step.summary,
    error: step.error,
    ok: step.ok,
    runStatus,
  }));
}

function StepIcon({
  step,
  last,
  isRunning,
}: {
  step: LoopStepEvent;
  last: boolean;
  isRunning?: boolean;
}) {
  if (last && isRunning) return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
  if (step.runStatus === "awaiting_approval" && last) {
    return <PauseCircle className="h-4 w-4 shrink-0 text-amber-700" />;
  }
  if (step.ok === false || step.runStatus === "failed") {
    return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
  }
  return <CheckCircle2 className="h-4 w-4 shrink-0" />;
}

export function LoopStepProgress({
  steps,
  isRunning,
}: {
  steps: LoopStepEvent[];
  isRunning?: boolean;
}) {
  if (steps.length === 0 && !isRunning) return null;
  return (
    <ol className="mt-6 space-y-2" aria-live="polite" aria-busy={isRunning ? "true" : "false"}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const failed = step.ok === false || Boolean(step.error);
        return (
          <li
            key={`${index}:${step.tool ?? "step"}:${step.decision ?? ""}`}
            className={
              last && isRunning
                ? "flex items-start gap-3 text-sm font-medium text-foreground"
                : failed
                  ? "flex items-start gap-3 text-sm text-destructive"
                  : "flex items-start gap-3 text-sm text-muted-foreground"
            }
          >
            <StepIcon step={step} last={last} isRunning={isRunning} />
            <span>
              {step.tool ?? "step"}
              {step.decision ? ` — ${step.decision}` : ""}
              {step.summary ? ` (${step.summary})` : ""}
              {step.error && step.error !== step.summary ? ` · ${step.error}` : ""}
            </span>
          </li>
        );
      })}
      {isRunning && steps.length === 0 ? (
        <li className="flex items-center gap-3 text-sm font-medium text-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          Employee loop
        </li>
      ) : null}
    </ol>
  );
}
