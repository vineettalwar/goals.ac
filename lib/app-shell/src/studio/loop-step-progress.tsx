"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

export type LoopStepEvent = {
  type?: string;
  tool?: string;
  decision?: string;
  summary?: string;
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
      ok: typeof event.ok === "boolean" ? event.ok : undefined,
      runStatus: typeof event.runStatus === "string" ? event.runStatus : undefined,
    },
  ];
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
        return (
          <li
            key={`${index}:${step.tool ?? "step"}:${step.decision ?? ""}`}
            className={
              last && isRunning
                ? "flex items-center gap-3 text-sm font-medium text-foreground"
                : "flex items-center gap-3 text-sm text-muted-foreground"
            }
          >
            {last && isRunning ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>
              {step.tool ?? "step"}
              {step.decision ? ` — ${step.decision}` : ""}
              {step.summary ? ` (${step.summary})` : ""}
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
