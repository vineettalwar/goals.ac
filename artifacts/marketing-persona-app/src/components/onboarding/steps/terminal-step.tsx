"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeSession } from "../onboarding-api";
import {
  AgentTeamProgress,
  useAgentTeamState,
  type AgentTeamState,
} from "@/components/content/agents";

type Piece = {
  id: number;
  contentItemId: number | null;
  title: string;
  wordCount: number;
  status: string;
  bodyMarkdown?: string;
  pieceMetadata?: {
    agentTeamProgress?: {
      agents: AgentTeamState;
      isRunning: boolean;
      totalElapsedMs?: number;
      updatedAt: string;
    };
  } | null;
};

const POLL_MS = 2000;
const MAX_POLLS = 90; // ~3 minutes with agent team

type Phase = "starting" | "queued" | "writing" | "ready" | "failed";

/**
 * Completion screen: polls the real content piece and shows one-agent-at-a-time
 * progress from piece_metadata.agentTeamProgress while the job runs.
 */
export function TerminalStep() {
  const [phase, setPhase] = useState<Phase>("starting");
  const [piece, setPiece] = useState<Piece | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const pollCount = useRef(0);
  const agentTeam = useAgentTeamState();

  async function start() {
    setPhase("starting");
    setError(null);
    pollCount.current = 0;
    agentTeam.reset();
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
          const match = pieces.find((p) => p.contentItemId === contentItemId);
          if (match) {
            setPiece(match);
            const progress = match.pieceMetadata?.agentTeamProgress;
            if (progress?.agents) {
              agentTeam.hydrate({
                agents: progress.agents,
                isRunning: progress.isRunning,
                totalElapsedMs: progress.totalElapsedMs,
              });
            } else if (match.status === "generating") {
              agentTeam.handleEvent({ type: "pipeline_start", totalAgents: 8 });
            }

            if (
              match.wordCount > 0 ||
              (match.status !== "draft" && match.status !== "generating") ||
              match.bodyMarkdown
            ) {
              if (match.status === "failed") {
                setPhase("failed");
                setError("Generation failed. You can try again.");
                return;
              }
              if (match.wordCount > 0 || match.bodyMarkdown) {
                setPhase("ready");
                return;
              }
            }
            setPhase("writing");
          }
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
        {phase === "starting" ? "Starting your first article…" : "Agent team writing your first article…"}
      </p>
      <AgentTeamProgress
        agentState={agentTeam.state}
        isRunning={agentTeam.isRunning || phase === "writing" || phase === "queued"}
        totalElapsedMs={agentTeam.totalElapsedMs}
      />
    </div>
  );
}
