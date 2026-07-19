"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { PartnerDemoChecklist } from "@/components/onboarding/partner-demo-checklist";
import { setActiveProjectCookie } from "@/lib/active-project/cookie";
import { clearAutopilotIntent } from "@/lib/projects/autopilot-intent";

type Phase = "scan" | "plan" | "generate" | "done" | "error";

type FastLaneStatus = {
  crawlStatus?: string | null;
  scrapeStatus?: string | null;
  articleProgress?: {
    generating: number;
    draft: number;
    ready: number;
    published: number;
    failed: number;
  };
  firstPieceId?: number | null;
  visibility?: {
    visibilityScore: number;
    visibilityDelta?: number | null;
    latestGeoScore: number | null;
    geoScoreDelta?: number | null;
  };
};

/** Brand scan is scrapeStatus; crawlStatus alone can stay pending if sitemap fails. */
function brandScanSettled(data: FastLaneStatus): boolean {
  const scrape = data.scrapeStatus;
  if (scrape === "done" || scrape === "failed") return true;
  // Fallback when scrapeStatus unset: accept crawl terminal so we don't hang forever.
  if (!scrape) {
    return data.crawlStatus === "done" || data.crawlStatus === "failed";
  }
  return false;
}

function stepIndex(phase: Phase): number {
  if (phase === "scan") return 0;
  if (phase === "plan") return 1;
  if (phase === "generate") return 2;
  if (phase === "done") return 3;
  return 1;
}

export function FastLaneClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("scan");
  const [message, setMessage] = useState("Scanning your website for brand context…");
  const [error, setError] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [firstPieceId, setFirstPieceId] = useState<number | null>(null);
  const [visibilitySnapshot, setVisibilitySnapshot] = useState<FastLaneStatus["visibility"] | null>(null);

  const applyStatus = useCallback((data: FastLaneStatus) => {
    const progress = data.articleProgress;
    const ready = (progress?.draft ?? 0) + (progress?.ready ?? 0) + (progress?.published ?? 0);
    setReadyCount(ready);
    if (data.visibility) setVisibilitySnapshot(data.visibility);
    if (data.firstPieceId != null) setFirstPieceId(data.firstPieceId);
    return { ready, progress };
  }, []);

  const pollProgress = useCallback(async (expected: number) => {
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      const statusRes = await fetch(`/api/onboarding/fast-lane?projectId=${projectId}`);
      if (statusRes.ok) {
        const data = (await statusRes.json()) as FastLaneStatus;
        const { ready, progress } = applyStatus(data);

        if (ready >= expected || (progress?.failed ?? 0) > 0) {
          return true;
        }
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    return false;
  }, [projectId, applyStatus]);

  const runFastLane = useCallback(async () => {
    setPhase("scan");
    setMessage("Scanning your website for brand context…");

    let attempts = 0;
    while (attempts < 30) {
      const statusRes = await fetch(`/api/onboarding/fast-lane?projectId=${projectId}`);
      if (statusRes.ok) {
        const data = (await statusRes.json()) as FastLaneStatus;
        if (brandScanSettled(data)) break;
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
      applyStatus((await statusRes.json()) as FastLaneStatus);
    }

    setPhase("done");
    clearAutopilotIntent();
  }, [projectId, pollProgress, applyStatus]);

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
          <StepIndicator
            steps={["Website", "Content plan", "Articles", "Demo ready"]}
            current={stepIndex(phase)}
          />
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
                Your 30-day calendar is ready. Walk the partner checklist below — review, humanize, CMS, visibility, then command center.
              </p>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Visibility snapshot
                  </p>
                  <Link
                    href="/search/visibility"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open full view
                  </Link>
                </div>
                {visibilitySnapshot ? (
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-xl font-bold">{visibilitySnapshot.visibilityScore}%</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Eye className="h-3 w-3" /> AI visibility
                      </p>
                      {visibilitySnapshot.visibilityDelta != null &&
                      visibilitySnapshot.visibilityDelta !== 0 ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {visibilitySnapshot.visibilityDelta > 0 ? "+" : ""}
                          {visibilitySnapshot.visibilityDelta}pp
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {visibilitySnapshot.latestGeoScore ?? "—"}
                        {visibilitySnapshot.latestGeoScore != null && (
                          <span className="text-sm font-normal text-muted-foreground">/100</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">GEO score</p>
                      {visibilitySnapshot.geoScoreDelta != null &&
                      visibilitySnapshot.geoScoreDelta !== 0 ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {visibilitySnapshot.geoScoreDelta > 0 ? "+" : ""}
                          {visibilitySnapshot.geoScoreDelta} vs prior
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    Scores will appear as crawl and GEO data land.
                  </p>
                )}
              </div>
              <PartnerDemoChecklist projectId={projectId} firstPieceId={firstPieceId} />
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
