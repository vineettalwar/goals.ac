"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/page-skeleton";
import { useActiveProject } from "@/context/active-project";
import { useVisibilityData } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";

const VisibilityTrendChart = dynamic(
  () => import("@/components/ai-visibility-charts").then((m) => m.VisibilityTrendChart),
  { loading: () => <div className="paper-card p-6 h-80 animate-pulse rounded-xl bg-secondary/40" /> },
);

const CompetitorMentionsChart = dynamic(
  () => import("@/components/ai-visibility-charts").then((m) => m.CompetitorMentionsChart),
  { loading: () => <div className="paper-card p-6 h-72 animate-pulse rounded-xl bg-secondary/40" /> },
);

interface VisibilitySettings {
  llmTrackingEnabled: boolean;
  geoReauditEnabled: boolean;
  lastVisibilityCheckAt?: string;
  lastGeoReauditAt?: string;
}

interface VisibilitySummary {
  settings: VisibilitySettings;
  visibilityScore: number;
  promptCount: number;
  trend: Array<{ date: string; score: number; cited?: number; total?: number }>;
  byEngine: Array<{ engine: string; cited: number; total: number; score: number }>;
  competitorMentions: Array<{ name: string; count: number }>;
  geoScoreTrend: Array<{ date: string; score: number }>;
  latestGeoScore: number | null;
  recentSnapshots: Array<{
    id: number;
    prompt: string;
    engine: string;
    cited: boolean;
    competitorsMentioned: string[];
    checkedAt: string;
  }>;
}

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 60 ? "text-emerald-500" : score >= 30 ? "text-amber-500" : "text-red-500";
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={`${score} 100`}
          className={color}
        />
      </svg>
      <div className="absolute text-center">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <p className="text-[10px] text-muted-foreground">visibility</p>
      </div>
    </div>
  );
}

function parseSummary(data: Record<string, unknown> | undefined, settings: VisibilitySettings): VisibilitySummary | null {
  if (!data) return null;
  return {
    settings: (data.settings as VisibilitySettings) ?? settings,
    visibilityScore: (data.visibilityScore as number) ?? (data.score as { overall?: number })?.overall ?? 0,
    promptCount: (data.promptCount as number) ?? (data.prompts as unknown[])?.length ?? 0,
    trend: (data.trend as VisibilitySummary["trend"]) ?? [],
    byEngine: (data.byEngine as VisibilitySummary["byEngine"]) ?? [],
    competitorMentions: (data.competitorMentions as VisibilitySummary["competitorMentions"]) ?? [],
    geoScoreTrend: (data.geoScoreTrend as VisibilitySummary["geoScoreTrend"]) ?? [],
    latestGeoScore: (data.latestGeoScore as number | null) ?? null,
    recentSnapshots:
      (data.recentSnapshots as VisibilitySummary["recentSnapshots"]) ??
      (data.snapshots as VisibilitySummary["recentSnapshots"])?.slice(0, 20) ??
      [],
  };
}

export function AiVisibilityDashboard({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { activeProjectId, activeProject, isLoading: projectsLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const { settings: settingsQuery, summary: summaryQuery } = useVisibilityData(projectId);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = useMemo(
    () =>
      ({
        llmTrackingEnabled: Boolean(settingsQuery.data?.llmTrackingEnabled),
        geoReauditEnabled: Boolean(settingsQuery.data?.geoReauditEnabled),
        lastVisibilityCheckAt: settingsQuery.data?.lastVisibilityCheckAt as string | undefined,
        lastGeoReauditAt: settingsQuery.data?.lastGeoReauditAt as string | undefined,
      }) satisfies VisibilitySettings,
    [settingsQuery.data],
  );

  const summary = useMemo(
    () => parseSummary(summaryQuery.data, settings),
    [summaryQuery.data, settings],
  );

  const loading =
    Boolean(projectId) &&
    settingsQuery.isLoading &&
    summaryQuery.isLoading &&
    !summary;

  async function invalidateVisibility() {
    if (!projectId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.visibilitySettings(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.visibilitySummary(projectId) }),
    ]);
  }

  async function saveSettings(next: VisibilitySettings) {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/visibility-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        setError("Failed to save settings");
        return;
      }
      const saved = (await res.json()) as VisibilitySettings;
      queryClient.setQueryData(queryKeys.visibilitySettings(projectId), saved);
      if (saved.llmTrackingEnabled) {
        await fetch(`/api/website-projects/${projectId}/visibility`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "seed" }),
        });
      }
      await invalidateVisibility();
    } finally {
      setSaving(false);
    }
  }

  async function runCheckNow() {
    if (!projectId) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enqueue" }),
      });
      if (!res.ok) {
        setError("Failed to queue visibility check");
        return;
      }
      toast.success("Visibility check queued");
      setTimeout(() => {
        void invalidateVisibility();
      }, 3000);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={embedded ? "space-y-6" : "px-8 py-8 max-w-5xl space-y-6"}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" />
              Visibility
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Track whether search engines cite your brand when users ask questions in your niche.
              {activeProject ? (
                <span className="block mt-1 text-foreground/80">{activeProject.name}</span>
              ) : null}
            </p>
          </div>
        ) : activeProject ? (
          <p className="text-sm text-muted-foreground">Project: {activeProject.name}</p>
        ) : null}
        {projectId && (
          <Button onClick={runCheckNow} disabled={checking || loading} variant="outline" className="shrink-0">
            {checking ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
            Check now
          </Button>
        )}
      </div>

      {!projectId && !projectsLoading && (
        <div className="paper-card p-8 text-center text-muted-foreground text-sm">
          Choose a project in the sidebar to track visibility.
        </div>
      )}

      {projectId && (
        <>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="paper-card p-6 space-y-4">
            <h2 className="font-semibold">Tracking settings</h2>
            <p className="text-sm text-muted-foreground">Enable weekly automated checks for this project</p>
            <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
              <div>
                <Label>LLM citation tracking</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Weekly checks across ChatGPT, Perplexity, Claude, and Gemini
                </p>
              </div>
              <Switch
                checked={settings.llmTrackingEnabled}
                disabled={saving}
                onCheckedChange={(checked) => {
                  saveSettings({ ...settings, llmTrackingEnabled: checked });
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
              <div>
                <Label>Weekly GEO re-audit</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Re-run technical GEO audit on your homepage every Sunday
                </p>
              </div>
              <Switch
                checked={settings.geoReauditEnabled}
                disabled={saving}
                onCheckedChange={(checked) => {
                  saveSettings({ ...settings, geoReauditEnabled: checked });
                }}
              />
            </div>
            {settings.lastVisibilityCheckAt && (
              <p className="text-xs text-muted-foreground">
                Last visibility check: {new Date(settings.lastVisibilityCheckAt).toLocaleString()}
              </p>
            )}
          </div>

          {loading ? (
            <PageSkeleton />
          ) : summary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="paper-card p-6 flex flex-col items-center">
                  <ScoreRing score={summary.visibilityScore} />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {summary.promptCount} prompts tracked
                  </p>
                </div>
                <div className="paper-card p-6">
                  <p className="text-sm font-medium flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" /> GEO score
                  </p>
                  <p className="text-3xl font-bold">
                    {summary.latestGeoScore ?? "—"}
                    {summary.latestGeoScore != null && (
                      <span className="text-base font-normal text-muted-foreground">/100</span>
                    )}
                  </p>
                  <Link href="/geo-audit" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                    Run manual audit <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="paper-card p-6 space-y-2">
                  <p className="text-sm font-medium mb-2">By engine</p>
                  {summary.byEngine.map((e) => (
                    <div key={e.engine} className="flex items-center justify-between text-sm">
                      <span>{ENGINE_LABELS[e.engine] ?? e.engine}</span>
                      <Badge variant="muted">{e.score}% cited</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {summary.trend.length > 1 && <VisibilityTrendChart data={summary.trend} />}

              {summary.competitorMentions.length > 0 && (
                <CompetitorMentionsChart data={summary.competitorMentions} />
              )}

              {summary.recentSnapshots.length > 0 && (
                <div className="paper-card p-6 space-y-3">
                  <h2 className="font-semibold">Recent checks</h2>
                  {summary.recentSnapshots.map((snap) => (
                    <div key={snap.id} className="rounded-lg border px-4 py-3 text-sm space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium line-clamp-2">{snap.prompt}</p>
                        {snap.cited ? (
                          <Badge className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Cited
                          </Badge>
                        ) : (
                          <Badge variant="muted" className="shrink-0">
                            Not cited
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ENGINE_LABELS[snap.engine] ?? snap.engine} ·{" "}
                        {new Date(snap.checkedAt).toLocaleString()}
                        {snap.competitorsMentioned?.length > 0 &&
                          ` · Competitors: ${snap.competitorsMentioned.join(", ")}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {summary.promptCount === 0 && (
                <div className="paper-card p-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No prompts yet. Add competitor URLs and keywords in your brand profile, then enable
                    tracking.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/projects/${projectId}?tab=brand`}>Edit brand profile</Link>
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
