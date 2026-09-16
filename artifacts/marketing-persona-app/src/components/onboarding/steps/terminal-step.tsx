"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeSession } from "../onboarding-api";
import { LoopStepProgress, loopStepsFromTrajectory } from "@workspace/app-shell/studio";

type Piece = {
  id: number;
  contentItemId: number | null;
  title: string;
  wordCount: number;
  status: string;
  bodyMarkdown?: string;
  pieceMetadata?: { agentRunId?: number } | null;
};

type RunListItem = { id: number; status: string; goalKind: string };
type AgentRun = {
  id?: number;
  status: string;
  stopReason?: string | null;
  trajectory: Array<{ tool?: string; decision?: string; summary?: string; error?: string; ok?: boolean }>;
};

const POLL_MS = 2000;
const MAX_POLLS = 90;

type Phase = "starting" | "queued" | "writing" | "ready" | "failed";

export function TerminalStep() {
  const [phase, setPhase] = useState<Phase>("starting");
  const [piece, setPiece] = useState<Piece | null>(null);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const pollCount = useRef(0);

  async function start() {
    setPhase("starting");
    setError(null);
    pollCount.current = 0;
    setRun(null);
    try {
      const result = await completeSession();
      setProjectId(result.projectId);
      if (result.contentItemId == null) {
        setPhase("failed");
        setError("Your account is all set, but we couldn't start your first article yet.");
        return;
      }
      setPhase("queued");
      void poll(result.projectId, result.contentItemId);
    } catch {
      setPhase("failed");
      setError("We couldn't start writing your first article.");
    }
  }

  async function loadLatestRun(pid: number, pieceRow: Piece | null): Promise<AgentRun | null> {
    const stamped = pieceRow?.pieceMetadata?.agentRunId;
    if (stamped) {
      const res = await fetch(`/api/agent-runs/${stamped}`);
      if (res.ok) {
        const data = (await res.json()) as { run: AgentRun };
        return data.run;
      }
    }
    const listRes = await fetch(`/api/website-projects/${pid}/agent-runs`);
    if (!listRes.ok) return null;
    const data = (await listRes.json()) as { runs?: RunListItem[] };
    const latest = (data.runs ?? []).find((row) => row.goalKind === "research_then_draft");
    if (!latest) return null;
    const res = await fetch(`/api/agent-runs/${latest.id}`);
    if (!res.ok) return null;
    return ((await res.json()) as { run: AgentRun }).run;
  }

  async function poll(pid: number, contentItemId: number) {
    for (;;) {
      if (pollCount.current >= MAX_POLLS) {
        setPhase("failed");
        setError("Generation is taking longer than expected.");
        return;
      }
      pollCount.current += 1;
      try {
        const res = await fetch(`/api/content-pieces?websiteProjectId=${pid}`);
        if (res.ok) {
          const { pieces } = (await res.json()) as { pieces: Piece[] };
          const match = pieces.find((p) => p.contentItemId === contentItemId) ?? null;
          if (match) setPiece(match);
          const latestRun = await loadLatestRun(pid, match);
          if (latestRun) setRun(latestRun);

          if (match) {
            if (match.status === "failed" || latestRun?.status === "failed") {
              setPhase("failed");
              setError(latestRun?.stopReason ?? "Generation failed. You can try again.");
              return;
            }
            if (match.wordCount > 0 || match.bodyMarkdown) {
              setPhase("ready");
              return;
            }
          }
          setPhase("writing");
        }
      } catch {
        // transient, keep polling
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, []);

  if (phase === "failed") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-destructive">{error}</p>
        <Button type="button" onClick={start} size="lg" className="w-fit">
          Try again
        </Button>
        {projectId && (
          <a href={`/projects/${projectId}`} className="text-sm text-muted-foreground underline underline-offset-2">
            Go to your project instead
          </a>
        )}
      </div>
    );
  }

  if (phase === "ready" && piece) {
    return (
      <div className="flex flex-col gap-4" aria-live="polite">
        <div className="paper-card flex items-start gap-3 px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium text-foreground">{piece.title || "Your first article"}</p>
            <p className="text-sm text-muted-foreground">{piece.wordCount} words drafted and ready for review.</p>
          </div>
        </div>
        {projectId && (
          <Button asChild size="lg" className="w-fit">
            <a href={`/projects/${projectId}/content-studio`}>Go to your content studio</a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-sm text-muted-foreground">
        {phase === "starting" ? "Starting your first article…" : "Employee loop drafting your first article…"}
      </p>
      <LoopStepProgress
        steps={loopStepsFromTrajectory(run?.trajectory ?? [], run?.status)}
        isRunning={phase === "writing" || phase === "queued" || run?.status === "running"}
      />
    </div>
  );
}
