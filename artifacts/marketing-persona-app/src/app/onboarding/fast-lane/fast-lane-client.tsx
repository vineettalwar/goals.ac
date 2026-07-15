"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { setActiveProjectCookie } from "@/lib/active-project/cookie";
import {
  clearAutopilotIntent,
  postAutopilotCompleteRedirect,
} from "@/lib/projects/autopilot-intent";

type Phase = "scan" | "plan" | "generate" | "done" | "error";

type FastLaneStatus = {
  articleProgress?: {
    generating: number;
    draft: number;
    ready: number;
    published: number;
    failed: number;
  };
  visibility?: {
    visibilityScore: number;
    latestGeoScore: number | null;
  };
};

export function FastLaneClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("scan");
  const [message, setMessage] = useState("Scanning your website for brand context…");
  const [error, setError] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [visibilitySnapshot, setVisibilitySnapshot] = useState<FastLaneStatus["visibility"] | null>(null);

  const pollProgress = useCallback(async (expected: number) => {
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      const statusRes = await fetch(`/api/onboarding/fast-lane?projectId=${projectId}`);
      if (statusRes.ok) {
        const data = (await statusRes.json()) as FastLaneStatus;
        const progress = data.articleProgress;
        const ready = (progress?.draft ?? 0) + (progress?.ready ?? 0) + (progress?.published ?? 0);
        setReadyCount(ready);
        if (data.visibility) setVisibilitySnapshot(data.visibility);

        if (ready >= expected || (progress?.failed ?? 0) > 0) {
          return true;
        }
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    return false;
  }, [projectId]);

  const runFastLane = useCallback(async () => {
    setPhase("scan");
    setMessage("Scanning your website for brand context…");

    let attempts = 0;
    while (attempts < 30) {
      const statusRes = await fetch(`/api/onboarding/fast-lane?projectId=${projectId}`);
      if (statusRes.ok) {
        const { crawlStatus } = await statusRes.json();
        if (crawlStatus === "done" || crawlStatus === "failed") {
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
      attempts += 1;
    }

    setPhase("plan");
    setMessage("Building your 30-day content plan…");

    const res = await fetch("/api/onboarding/fast-lane", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: Number(projectId) }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPhase("error");
      setError(data.message ?? data.error ?? "Setup failed. Check Integrations → AI for BYOK.");
      return;
    }

    const articleCount = data.articleCount ?? 3;
    setQueuedCount(articleCount);
    setPhase("generate");
    setMessage(`Generating your first ${articleCount} expert articles…`);

    await pollProgress(articleCount);

    const statusRes = await fetch(`/api/onboarding/fast-lane?projectId=${projectId}`);
    if (statusRes.ok) {
      const status = (await statusRes.json()) as FastLaneStatus;
      if (status.visibility) setVisibilitySnapshot(status.visibility);
    }

    setPhase("done");
    clearAutopilotIntent();
  }, [projectId, pollProgress]);

  useEffect(() => {
    setActiveProjectCookie(Number(projectId));
    runFastLane();
  }, [projectId, runFastLane]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">goals.ac</span>
          </div>
          <StepIndicator steps={["Website", "Content plan", "Articles", "Connect CMS"]} current={phase === "done" ? 2 : phase === "generate" ? 2 : 1} />
          <h1 className="mt-8 text-3xl font-bold">Setting up Content Autopilot</h1>
          <p className="mt-2 text-muted-foreground">{message}</p>
        </div>

        <div className="paper-card p-8 space-y-4">
          {phase === "error" ? (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => router.push(`/projects/${projectId}?tab=brand`)}>
                Continue to project
              </Button>
            </>
          ) : phase === "done" ? (
            <>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  {readyCount > 0
                    ? `${readyCount} article${readyCount !== 1 ? "s" : ""} ready for review`
                    : `${queuedCount} articles queued for generation`}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your 30-day calendar is ready. Connect WordPress to publish drafts automatically, or review articles in the dashboard.
              </p>
              {visibilitySnapshot && (
                <div className="rounded-lg border border-border bg-secondary/30 p-4 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold">{visibilitySnapshot.visibilityScore}%</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Eye className="h-3 w-3" /> AI visibility
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {visibilitySnapshot.latestGeoScore ?? "—"}
                      {visibilitySnapshot.latestGeoScore != null && (
                        <span className="text-sm font-normal text-muted-foreground">/100</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">GEO score</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 pt-2">
                <Button size="lg" onClick={() => router.push("/dashboard")}>
                  Open command center
                </Button>
                <Button variant="outline" onClick={() => router.push(`/onboarding/connect?projectId=${projectId}`)}>
                  Connect WordPress
                </Button>
                <Button variant="ghost" onClick={() => router.push(postAutopilotCompleteRedirect(Number(projectId)))}>
                  Open content studio
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-6 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {phase === "generate" && readyCount > 0
                  ? `${readyCount} of ${queuedCount} articles ready…`
                  : "This usually takes 1–3 minutes"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
