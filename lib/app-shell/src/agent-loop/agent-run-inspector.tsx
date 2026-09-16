"use client";

import { LoopStepProgress, loopStepsFromTrajectory } from "../studio/loop-step-progress";

export type TrajectoryStepView = {
  at?: string;
  tool?: string;
  decision?: string;
  summary?: string;
  error?: string;
  ok?: boolean;
  argsSummary?: string;
  creditsSpent?: number;
  evidenceRefs?: Array<{ source: string; verified: boolean; url?: string }>;
};

export type AgentRunView = {
  id?: number;
  status: string;
  stopReason?: string | null;
  goalKind?: string;
  creditsSpent?: number;
  pendingApproval?: { tool: string; reason: string; args?: Record<string, unknown> } | null;
  trajectory: TrajectoryStepView[];
};

export function AgentRunInspector({
  run,
  onClose,
}: {
  run: AgentRunView;
  onClose: () => void;
}) {
  const awaiting = run.status === "awaiting_approval" || Boolean(run.pendingApproval);
  const failed = run.status === "failed" || run.status === "budget_exhausted" || run.status === "no_evidence";
  return (
    <div className="mt-6 border border-border p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <strong>
          Run {run.id ?? "—"} · {run.status}
          {run.goalKind ? ` · ${run.goalKind}` : ""}
        </strong>
        <button type="button" className="border border-border px-2 py-1" onClick={onClose}>
          Close
        </button>
      </div>
      {run.stopReason ? <p className="mb-2 text-muted-foreground">{run.stopReason}</p> : null}
      {awaiting && run.pendingApproval ? (
        <p className="mb-2">
          Waiting on <code>{run.pendingApproval.tool}</code>: {run.pendingApproval.reason}
        </p>
      ) : null}
      {typeof run.creditsSpent === "number" ? (
        <p className="mb-2 text-xs text-muted-foreground">{run.creditsSpent} credits spent</p>
      ) : null}
      <LoopStepProgress
        steps={loopStepsFromTrajectory(run.trajectory, run.status)}
        isRunning={run.status === "running"}
      />
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
        {run.trajectory.map((step, index) => (
          <li key={`${step.at ?? index}:${step.tool ?? "stop"}:${step.decision ?? ""}`}>
            <span className={step.ok === false || failed ? "text-destructive" : undefined}>
              {step.tool ?? "stop"} — {step.decision}
              {step.summary ? ` (${step.summary})` : ""}
              {step.error && step.error !== step.summary ? ` · ${step.error}` : ""}
            </span>
            {step.argsSummary ? <div className="text-xs">{step.argsSummary}</div> : null}
            {step.evidenceRefs && step.evidenceRefs.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-xs">
                {step.evidenceRefs.map((ref) => (
                  <li key={`${ref.source}:${ref.url ?? ""}`}>
                    {ref.source}
                    {ref.verified ? " · verified" : " · not verified"}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
