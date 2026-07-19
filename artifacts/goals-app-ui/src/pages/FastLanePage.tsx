import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, Leaf, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { PartnerDemoChecklist } from "@/components/onboarding/PartnerDemoChecklist";

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

function brandScanSettled(data: FastLaneStatus): boolean {
  const scrape = data.scrapeStatus;
  if (scrape === "done" || scrape === "failed") return true;
  if (!scrape) {
    return data.crawlStatus === "done" || data.crawlStatus === "failed";
  }
  return false;
}

const AUTOPILOT_INTENT_KEY = "autopilot_intent";

function clearAutopilotIntent() {
  sessionStorage.removeItem(AUTOPILOT_INTENT_KEY);
}

function stepIndex(phase: Phase): number {
  if (phase === "scan") return 0;
  if (phase === "plan") return 1;
  if (phase === "generate") return 2;
  if (phase === "done") return 3;
  return 1;
}

export function FastLanePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const projectId = searchParams.get("projectId") ?? "";

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

  const pollProgress = useCallback(
    async (expected: number) => {
      const maxAttempts = 40;
      for (let i = 0; i < maxAttempts; i += 1) {
        try {
          const data = await apiFetch<FastLaneStatus>(
            `/api/onboarding/fast-lane?projectId=${encodeURIComponent(projectId)}`,
          );
          const { ready, progress } = applyStatus(data);
          if (ready >= expected || (progress?.failed ?? 0) > 0) {
            return true;
          }
        } catch {
          // keep polling until timeout
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      return false;
    },
    [projectId, applyStatus],
  );

  const runFastLane = useCallback(async () => {
    setPhase("scan");
    setMessage("Scanning your website for brand context…");

    let attempts = 0;
    while (attempts < 30) {
      try {
        const data = await apiFetch<FastLaneStatus>(
          `/api/onboarding/fast-lane?projectId=${encodeURIComponent(projectId)}`,
        );
        if (brandScanSettled(data)) break;
      } catch {
        // crawl status unavailable — continue polling
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts += 1;
    }

    setPhase("plan");
    setMessage("Building your 30-day content plan…");

    try {
      const data = await apiFetch<{ articleCount?: number; message?: string; error?: string }>(
        "/api/onboarding/fast-lane",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: Number(projectId) }),
        },
      );

      const articleCount = data.articleCount ?? 3;
      setQueuedCount(articleCount);
      setPhase("generate");
      setMessage(`Generating your first ${articleCount} expert articles…`);

      await pollProgress(articleCount);

      try {
        const status = await apiFetch<FastLaneStatus>(
          `/api/onboarding/fast-lane?projectId=${encodeURIComponent(projectId)}`,
        );
        applyStatus(status);
      } catch {
        // optional visibility / piece snapshot
      }

      setPhase("done");
      clearAutopilotIntent();
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Setup failed. Check Integrations → AI for BYOK.");
    }
  }, [projectId, pollProgress, applyStatus]);

  useEffect(() => {
    if (!projectId || authLoading || !user) return;
    localStorage.setItem("goals.activeProjectId", projectId);
    void runFastLane();
  }, [projectId, authLoading, user, runFastLane]);

  if (!projectId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?callbackUrl=${encodeURIComponent(`/onboarding/fast-lane?projectId=${projectId}`)}`} replace />;
  }

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

        <div className="paper-card space-y-4 p-8">
          {phase === "error" ? (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}?tab=brand`)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Continue to project
              </button>
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
                Your 30-day calendar is ready. Walk the partner checklist below — review, humanize, CMS,
                visibility, then command center.
              </p>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Visibility snapshot
                  </p>
                  <Link to="/search/visibility" className="text-xs font-medium text-primary hover:underline">
                    Open full view
                  </Link>
                </div>
                {visibilitySnapshot ? (
                  <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-2">
                    <div>
                      <p className="text-xl font-bold">{visibilitySnapshot.visibilityScore}%</p>
                      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
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
                        {visibilitySnapshot.latestGeoScore != null ? (
                          <span className="text-sm font-normal text-muted-foreground">/100</span>
                        ) : null}
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
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {phase === "generate" && readyCount > 0
                  ? `${readyCount} of ${queuedCount} articles ready…`
                  : "This usually takes 1–3 minutes"}
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need help? <Link to="/help" className="text-primary hover:underline">Visit help center</Link>
        </p>
      </div>
    </div>
  );
}
