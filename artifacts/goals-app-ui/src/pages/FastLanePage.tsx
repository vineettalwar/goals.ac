import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, Leaf, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import { StepIndicator } from "@/components/onboarding/StepIndicator";

type Phase = "scan" | "plan" | "generate" | "done" | "error";

type FastLaneStatus = {
  crawlStatus?: string;
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

const AUTOPILOT_INTENT_KEY = "autopilot_intent";

function clearAutopilotIntent() {
  sessionStorage.removeItem(AUTOPILOT_INTENT_KEY);
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
  const [visibilitySnapshot, setVisibilitySnapshot] = useState<FastLaneStatus["visibility"] | null>(null);

  const pollProgress = useCallback(
    async (expected: number) => {
      const maxAttempts = 40;
      for (let i = 0; i < maxAttempts; i += 1) {
        try {
          const data = await apiFetch<FastLaneStatus>(
            `/api/onboarding/fast-lane?projectId=${encodeURIComponent(projectId)}`,
          );
          const progress = data.articleProgress;
          const ready = (progress?.draft ?? 0) + (progress?.ready ?? 0) + (progress?.published ?? 0);
          setReadyCount(ready);
          if (data.visibility) setVisibilitySnapshot(data.visibility);
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
    [projectId],
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
        if (data.crawlStatus === "done" || data.crawlStatus === "failed") {
          break;
        }
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
        if (status.visibility) setVisibilitySnapshot(status.visibility);
      } catch {
        // optional visibility snapshot
      }

      setPhase("done");
      clearAutopilotIntent();
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Setup failed. Check Integrations → AI for BYOK.");
    }
  }, [projectId, pollProgress]);

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
            steps={["Website", "Content plan", "Articles", "Connect CMS"]}
            current={phase === "done" ? 2 : phase === "generate" ? 2 : 1}
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
                Your 30-day calendar is ready. Connect WordPress to publish drafts automatically, or review
                articles in the dashboard.
              </p>
              {visibilitySnapshot ? (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-secondary/30 p-4 text-center sm:grid-cols-2">
                  <div>
                    <p className="text-xl font-bold">{visibilitySnapshot.visibilityScore}%</p>
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" /> AI visibility
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {visibilitySnapshot.latestGeoScore ?? "—"}
                      {visibilitySnapshot.latestGeoScore != null ? (
                        <span className="text-sm font-normal text-muted-foreground">/100</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">GEO score</p>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${projectId}/integrations`)}
                  className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
                >
                  Connect WordPress →
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
                >
                  Skip — open autopilot dashboard
                </button>
              </div>
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
