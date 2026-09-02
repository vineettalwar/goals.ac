"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeSession } from "../onboarding-api";

type Piece = {
  id: number;
  contentItemId: number | null;
  title: string;
  wordCount: number;
  status: string;
  bodyMarkdown?: string;
};

const POLL_MS = 3000;
const MAX_POLLS = 20; // ~1 minute before we call it and offer a retry

type Phase = "starting" | "queued" | "writing" | "ready" | "failed";

/**
 * The completion screen. Never shows a fake success: it polls the real content
 * piece and only celebrates once words are actually on the page. If generation
 * never starts, it says so and offers a real retry, not a generic error toast.
 *
 * GUESS: the fixed contract's `POST /api/onboarding/session/complete` returns
 * `{ projectId, contentItemId }`, and content pieces are matched to that id via
 * the existing `content_pieces.content_item_id` column, polled through the
 * already-shipped `GET /api/content-pieces?websiteProjectId=` list route. There
 * is no dedicated single-piece status endpoint in the contract to poll instead.
 */
export function TerminalStep() {
  const [phase, setPhase] = useState<Phase>("starting");
  const [piece, setPiece] = useState<Piece | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const pollCount = useRef(0);

  async function start() {
    setPhase("starting");
    setError(null);
    pollCount.current = 0;
    try {
      const result = await completeSession();
      setProjectId(result.projectId);
      if (result.contentItemId == null) {
        // Onboarding itself succeeded; only the article dispatch did not start.
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
            if (match.wordCount > 0 || match.status !== "draft" || match.bodyMarkdown) {
              setPhase("ready");
              return;
            }
            setPhase("writing");
          }
        }
      } catch {
        // transient, keep polling; only the max-poll timeout reports failure
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
    <div className="flex items-center gap-3 text-muted-foreground" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {phase === "starting" ? "Starting your first article…" : "Writing your first article, live…"}
    </div>
  );
}
