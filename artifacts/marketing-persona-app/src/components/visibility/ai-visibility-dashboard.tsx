"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
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
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useActiveProject } from "@/context/active-project";
import { useVisibilityData } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import { SearchPropertyConnectionsPanel } from "@/components/integrations/search-property-connections-panel";

const VisibilityTrendChart = dynamic(
  () => import("@/components/visibility/ai-visibility-charts").then((m) => m.VisibilityTrendChart),
  { loading: () => <div className="paper-card p-6 h-80 animate-pulse rounded-xl bg-secondary/40" /> },
);

const CompetitorMentionsChart = dynamic(
  () => import("@/components/visibility/ai-visibility-charts").then((m) => m.CompetitorMentionsChart),
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

function visibilityTone(score: number) {
  if (score >= 60) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-foreground";
}

function TrackingSettings({
  settings,
  saving,
  onChange,
}: {
  settings: VisibilitySettings;
  saving: boolean;
  onChange: (next: VisibilitySettings) => void;
}) {
  return (
    <div className="rounded-xl border border-border/80 p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm">Weekly citation checks</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            ChatGPT, Perplexity, Claude, and Gemini
          </p>
        </div>
        <Switch
          checked={settings.llmTrackingEnabled}
          disabled={saving}
          onCheckedChange={(checked) => onChange({ ...settings, llmTrackingEnabled: checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
        <div>
          <Label className="text-sm">Weekly GEO re-audit</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Homepage scan every Sunday</p>
        </div>
        <Switch
          checked={settings.geoReauditEnabled}
          disabled={saving}
          onCheckedChange={(checked) => onChange({ ...settings, geoReauditEnabled: checked })}
        />
      </div>
      {settings.lastVisibilityCheckAt ? (
        <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
          Last check {new Date(settings.lastVisibilityCheckAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

function SetupEmptyState({
  projectId,
  settings,
  saving,
  onSettingsChange,
}: {
  projectId: string;
  settings: VisibilitySettings;
  saving: boolean;
  onSettingsChange: (next: VisibilitySettings) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed p-8 sm:p-10 text-center">
        <h2 className="text-lg font-semibold">Start tracking AI citations</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add competitors and target keywords in your brand profile. We&apos;ll generate prompts and
          check whether each engine cites your brand.
        </p>
        <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-medium text-foreground">1.</span>
            Add competitors and keywords in brand profile
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-foreground">2.</span>
            Turn on weekly citation checks below
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-foreground">3.</span>
            Run your first check from the button above
          </li>
        </ol>
        <Button asChild className="mt-6">
          <Link href={`/projects/${projectId}?tab=brand`}>Set up brand profile</Link>
        </Button>
      </div>
      <TrackingSettings settings={settings} saving={saving} onChange={onSettingsChange} />
    </div>
  );
}

function PendingCheckState({
  promptCount,
  settings,
  saving,
  onSettingsChange,
}: {
  promptCount: number;
  settings: VisibilitySettings;
  saving: boolean;
  onSettingsChange: (next: VisibilitySettings) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-6 dark:border-violet-500/20 dark:bg-violet-500/5">
        <p className="text-sm font-medium text-violet-900 dark:text-violet-200">Ready to measure</p>
        <p className="mt-1 text-2xl font-bold">{promptCount} prompts queued</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Run a check now to see citation rates across engines. Results usually appear within a few
          minutes.
        </p>
      </div>
      <TrackingSettings settings={settings} saving={saving} onChange={onSettingsChange} />
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
  const [checkQueued, setCheckQueued] = useState(false);
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
      setCheckQueued(true);
      setTimeout(() => {
        void invalidateVisibility();
        setCheckQueued(false);
      }, 3000);
    } finally {
      setChecking(false);
    }
  }

  const hasSnapshots = (summary?.recentSnapshots.length ?? 0) > 0;
  const hasPrompts = (summary?.promptCount ?? 0) > 0;

  return (
    <div className={embedded ? "space-y-6" : "px-8 py-8 max-w-5xl space-y-6"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold">Visibility</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              See whether AI engines cite your brand for niche questions.
              {activeProject ? (
                <span className="block mt-1 text-foreground/80">{activeProject.name}</span>
              ) : null}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Citation rates across ChatGPT, Perplexity, Claude, and Gemini
            {activeProject ? ` · ${activeProject.name}` : ""}
          </p>
        )}
        {projectId ? (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button onClick={runCheckNow} disabled={checking || loading || !hasPrompts} variant="outline" className="shrink-0">
              {checking ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
              {checking ? "Queuing…" : "Run check"}
            </Button>
            {checkQueued ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Check queued — results refresh shortly</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {!projectId && projectsLoading && <PageSkeleton />}

      {!projectId && !projectsLoading && (
        <div className="paper-card p-8 text-center text-muted-foreground text-sm">
          Choose a project in the sidebar to track visibility.
        </div>
      )}

      {projectId && (
        <>
          <SearchPropertyConnectionsPanel projectId={projectId} embedded />

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <PageSkeleton />
          ) : summary ? (
            !hasPrompts ? (
              <SetupEmptyState
                projectId={projectId}
                settings={settings}
                saving={saving}
                onSettingsChange={saveSettings}
              />
            ) : !hasSnapshots ? (
              <PendingCheckState
                promptCount={summary.promptCount}
                settings={settings}
                saving={saving}
                onSettingsChange={saveSettings}
              />
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-500/20 dark:bg-violet-500/5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-300">
                      <Eye className="h-4 w-4" />
                      Citation rate
                    </div>
                    <p className={`mt-1 text-3xl font-bold ${visibilityTone(summary.visibilityScore)}`}>
                      {summary.visibilityScore}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.promptCount} prompts · latest batch
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">GEO score</p>
                    <p className="mt-1 text-3xl font-bold">
                      {summary.latestGeoScore ?? "—"}
                      {summary.latestGeoScore != null ? (
                        <span className="text-base font-normal text-muted-foreground">/100</span>
                      ) : null}
                    </p>
                    <Link
                      href="/audit"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Run technical audit <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {summary.byEngine.some((e) => e.total > 0) ? (
                  <div className="flex flex-wrap gap-2">
                    {summary.byEngine
                      .filter((e) => e.total > 0)
                      .map((e) => (
                        <div
                          key={e.engine}
                          className="rounded-lg border border-border/80 px-3 py-2 text-sm"
                        >
                          <span className="text-muted-foreground">{ENGINE_LABELS[e.engine] ?? e.engine}</span>
                          <span className="ml-2 font-medium">{e.score}% cited</span>
                        </div>
                      ))}
                  </div>
                ) : null}

                {summary.trend.length > 1 ? <VisibilityTrendChart data={summary.trend} /> : null}

                {summary.competitorMentions.length > 0 ? (
                  <CompetitorMentionsChart data={summary.competitorMentions} />
                ) : null}

                {summary.recentSnapshots.length > 0 ? (
                  <div className="space-y-3">
                    <h2 className="font-semibold text-sm">Recent checks</h2>
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
                ) : null}

                <TrackingSettings settings={settings} saving={saving} onChange={saveSettings} />
              </div>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
