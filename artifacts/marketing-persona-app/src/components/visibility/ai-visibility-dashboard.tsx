"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useActiveProject } from "@/context/use-active-project";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
import { useVisibilityData } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import { cn } from "@/lib/utils";
import {
  ENGINE_LABELS,
  dedupePrompts,
  parsePrompts,
  parseSummary,
  visibilityTone,
  type VisibilitySettings,
  type VisibilitySummary,
} from "./ai-visibility-types";
import {
  CheckStatusBanner,
  DataModeBadges,
  PendingCheckState,
  SetupEmptyState,
  SourcesDisclosure,
  TrackingSettings,
} from "./ai-visibility-panels";

const VisibilityTrendChart = dynamic(
  () => import("@/components/visibility/ai-visibility-charts").then((m) => m.VisibilityTrendChart),
  { loading: () => <div className="h-64 animate-pulse rounded-lg bg-secondary/40" /> },
);

const CompetitorMentionsChart = dynamic(
  () => import("@/components/visibility/ai-visibility-charts").then((m) => m.CompetitorMentionsChart),
  { loading: () => <div className="h-56 animate-pulse rounded-lg bg-secondary/40" /> },
);

export function AiVisibilityDashboard({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { activeProjectId, activeProject, isLoading: projectsLoading } = useActiveProject();
  const projectId = activeProjectId != null ? String(activeProjectId) : "";
  const { settings: settingsQuery, summary: summaryQuery } = useVisibilityData(projectId);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<"idle" | "queuing" | "running">("idle");
  const [regenerating, setRegenerating] = useState(false);
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

  const hasSnapshots = (summary?.recentSnapshots.length ?? 0) > 0;
  const hasPrompts = (summary?.promptCount ?? 0) > 0;
  const dataMode = summary?.dataMode ?? "simulated";
  const canRunCheck = dataMode === "live" || hasPrompts;
  const uniquePromptCount = summary ? dedupePrompts(summary.prompts).length : 0;
  const enginesWithData = summary?.byEngine.filter((e) => e.total > 0) ?? [];

  useEffect(() => {
    if (checkStatus !== "running" || !projectId) return;
    if (hasSnapshots) {
      setCheckStatus("idle");
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.visibilitySummary(projectId) });
      if (Date.now() - started > 5 * 60 * 1000) {
        setCheckStatus("idle");
        setError(
          "Still waiting on results after 5 minutes. Confirm the background worker is running, then try Run check again.",
        );
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [checkStatus, projectId, hasSnapshots, queryClient]);

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

  async function regeneratePrompts() {
    if (!projectId) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reseed" }),
      });
      if (!res.ok) {
        setError("Failed to regenerate questions from brand profile");
        return;
      }
      await invalidateVisibility();
    } finally {
      setRegenerating(false);
    }
  }

  async function runCheckNow() {
    if (!projectId) return;
    setChecking(true);
    setError(null);
    setCheckStatus("queuing");
    try {
      const res = await fetch(`/api/website-projects/${projectId}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enqueue" }),
      });
      if (!res.ok) {
        setCheckStatus("idle");
        setError("Failed to start citation check. Try again in a moment.");
        return;
      }
      setCheckStatus("running");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={embedded ? "space-y-8" : `${APP_SHELL_PAGE} space-y-8`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {!embedded ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Visibility</h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Probe AI engines with brand-derived questions and score citations
                {activeProject ? ` · ${activeProject.name}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm leading-6 tracking-normal text-muted-foreground">
              Brand citation probes across four AI engines
              {activeProject ? ` · ${activeProject.name}` : ""}
            </p>
          )}
        </div>
        {projectId ? (
          <Button
            onClick={runCheckNow}
            disabled={checking || loading || !canRunCheck || checkStatus === "running"}
            size="sm"
            className="shrink-0 gap-1.5"
          >
            {checking || checkStatus === "running" ? (
              <Spinner size="sm" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {checking ? "Starting…" : checkStatus === "running" ? "Checking…" : "Run check"}
          </Button>
        ) : null}
      </div>

      {!projectId && projectsLoading && <PageSkeleton />}

      {!projectId && !projectsLoading && (
        <p className="text-sm text-muted-foreground">Choose a project in the sidebar to track visibility.</p>
      )}

      {projectId && (
        <>
          <CheckStatusBanner
            status={checkStatus}
            promptCount={uniquePromptCount || summary?.promptCount || 0}
            dataMode={summary?.dataMode ?? "simulated"}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <PageSkeleton />
          ) : summary ? (
            !hasPrompts && summary.dataMode !== "live" ? (
              <SetupEmptyState
                projectId={projectId}
                settings={settings}
                saving={saving}
                onSettingsChange={saveSettings}
              />
            ) : !hasSnapshots ? (
              <PendingCheckState
                projectId={projectId}
                prompts={summary.prompts}
                settings={settings}
                saving={saving}
                regenerating={regenerating}
                dataMode={summary.dataMode}
                costEstimateUsd={summary.brandLookupCostEstimateUsd}
                onSettingsChange={saveSettings}
                onRegenerate={regeneratePrompts}
              />
            ) : (
              <ResultsView
                summary={summary}
                settings={settings}
                saving={saving}
                enginesWithData={enginesWithData}
                projectId={projectId}
                onSaveSettings={saveSettings}
              />
            )
          ) : null}

          {summary ? <SourcesDisclosure projectId={projectId} /> : null}
        </>
      )}
    </div>
  );
}

/** Inline sub-component: shown when snapshots exist (the "has data" branch). */
function ResultsView({
  summary,
  settings,
  saving,
  enginesWithData,
  projectId,
  onSaveSettings,
}: {
  summary: VisibilitySummary;
  settings: VisibilitySettings;
  saving: boolean;
  enginesWithData: VisibilitySummary["byEngine"];
  projectId: string;
  onSaveSettings: (next: VisibilitySettings) => void;
}) {
  return (
    <div className="space-y-8">
      <DataModeBadges
        dataMode={summary.dataMode}
        costEstimateUsd={summary.brandLookupCostEstimateUsd}
      />
      {summary.dataMode === "live" ? (
        <p className="max-w-prose text-sm leading-6 tracking-normal text-muted-foreground text-pretty">
          Live results use DataForSEO LLM Mentions (ChatGPT + Google AI Overview). Typical cost is
          about $0.20–0.40 per lookup
          {summary.brandLookupCostEstimateUsd != null
            ? ` (this project ≈ $${summary.brandLookupCostEstimateUsd.toFixed(2)})`
            : ""}
          .
        </p>
      ) : (
        <p className="max-w-prose text-sm leading-6 tracking-normal text-muted-foreground text-pretty">
          Simulated mode: probe answers come from a Gemini role-play of four engines, not live
          ChatGPT or Google AI Overview logs. Configure DataForSEO credentials to switch to Live API.
        </p>
      )}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Citation rate
          </p>
          <p
            className={cn(
              "mt-1 text-4xl font-semibold tracking-tight tabular-nums",
              visibilityTone(summary.visibilityScore),
            )}
          >
            {summary.visibilityScore}%
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share of probe answers that cited your brand · latest batch
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            GEO score
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {summary.latestGeoScore ?? "—"}
            {summary.latestGeoScore != null ? (
              <span className="text-sm font-normal text-muted-foreground"> /100</span>
            ) : null}
          </p>
          <Link
            href="/audit"
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Technical audit <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {enginesWithData.length > 0 ? (
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border/70 py-3 text-sm">
          {enginesWithData.map((e) => (
            <div key={e.engine} className="flex items-baseline gap-2">
              <span className="text-muted-foreground">
                {ENGINE_LABELS[e.engine] ?? e.engine}
              </span>
              <span className="font-medium tabular-nums">{e.score}%</span>
            </div>
          ))}
        </div>
      ) : null}

      {summary.trend.length > 1 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Trend</h2>
          <VisibilityTrendChart data={summary.trend} />
        </section>
      ) : null}

      {summary.competitorMentions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Competitor mentions</h2>
          <CompetitorMentionsChart data={summary.competitorMentions} />
        </section>
      ) : null}

      {summary.recentSnapshots.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Recent engine answers</h2>
          <ul className="divide-y divide-border/70 rounded-xl border border-border/80 bg-card">
            {summary.recentSnapshots.map((snap) => (
              <li key={snap.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium leading-snug line-clamp-2">
                    {snap.prompt}
                  </p>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 text-xs font-medium",
                      snap.cited
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {snap.cited ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Cited
                      </>
                    ) : (
                      "Not cited"
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ENGINE_LABELS[snap.engine] ?? snap.engine}
                  {snap.source === "live" ? " · Live API" : snap.source === "simulated" ? " · Simulated" : null}
                  {" · "}
                  {new Date(snap.checkedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
                  {snap.competitorsMentioned?.length > 0
                    ? ` · Also mentioned: ${snap.competitorsMentioned.join(", ")}`
                    : null}
                </p>
                {!snap.cited && projectId ? (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <Link
                      href={`/projects/${projectId}/content-studio?${new URLSearchParams({
                        optimize: "1",
                        keyword: snap.prompt.slice(0, 80),
                      }).toString()}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Optimize for this prompt
                    </Link>
                    <Link
                      href="/search/refresh"
                      className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
                    >
                      Open refresh queue
                    </Link>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Tracking schedule</h2>
        <TrackingSettings settings={settings} saving={saving} onChange={onSaveSettings} />
      </section>
    </div>
  );
}
