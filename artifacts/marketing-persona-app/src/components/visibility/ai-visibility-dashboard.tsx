"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useActiveProject } from "@/context/use-active-project";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
import { useVisibilityData } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";
import { SearchPropertyConnectionsPanel } from "@/components/integrations/search-property-connections-panel";
import { cn } from "@/lib/utils";

const VisibilityTrendChart = dynamic(
  () => import("@/components/visibility/ai-visibility-charts").then((m) => m.VisibilityTrendChart),
  { loading: () => <div className="h-64 animate-pulse rounded-lg bg-secondary/40" /> },
);

const CompetitorMentionsChart = dynamic(
  () => import("@/components/visibility/ai-visibility-charts").then((m) => m.CompetitorMentionsChart),
  { loading: () => <div className="h-56 animate-pulse rounded-lg bg-secondary/40" /> },
);

interface VisibilitySettings {
  llmTrackingEnabled: boolean;
  geoReauditEnabled: boolean;
  lastVisibilityCheckAt?: string;
  lastGeoReauditAt?: string;
}

interface VisibilityPrompt {
  id: number;
  prompt: string;
  category: string;
  isActive: boolean;
}

interface VisibilitySummary {
  settings: VisibilitySettings;
  visibilityScore: number;
  promptCount: number;
  prompts: VisibilityPrompt[];
  dataMode: "live" | "simulated";
  llmMentionsConfigured: boolean;
  brandLookupCostEstimateUsd?: number;
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
    source?: "live" | "simulated";
  }>;
}

const CATEGORY_ORDER = ["brand", "keyword", "competitor", "custom"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  brand: "From industry & brand",
  keyword: "From keywords",
  competitor: "From competitors",
  custom: "Custom",
};

const CATEGORY_SOURCE: Record<string, string> = {
  brand: "Brand profile → Industry / company name",
  keyword: "Brand profile → Primary keywords",
  competitor: "Brand profile → Competitor URLs",
  custom: "Added manually",
};

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

function visibilityTone(score: number) {
  if (score >= 60) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 30) return "text-amber-700 dark:text-amber-400";
  return "text-foreground";
}

function dedupePrompts(prompts: VisibilityPrompt[]): VisibilityPrompt[] {
  const seen = new Set<string>();
  const unique: VisibilityPrompt[] = [];
  for (const p of prompts) {
    if (!p.isActive) continue;
    const key = p.prompt.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique;
}

/** Old seeds dumped full ICP text into questions — detect so we can rebuild. */
function isPollutedPrompt(prompt: string): boolean {
  return (
    prompt.length > 180 ||
    /ideal customer profile|includes SMEs|typically founders|facing technical gaps/i.test(prompt)
  );
}

const ENGINE_CHIPS = ["ChatGPT", "Perplexity", "Claude", "Gemini"] as const;
const LIVE_ENGINE_CHIPS = ["ChatGPT", "Google AI Overview"] as const;

function DataModeBadges({
  dataMode,
  costEstimateUsd,
}: {
  dataMode: "live" | "simulated";
  costEstimateUsd?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {dataMode === "live" ? (
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium tracking-wide text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          Live API
        </span>
      ) : (
        <span className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium tracking-wide text-foreground">
          Simulated
        </span>
      )}
      <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium tracking-wide text-muted-foreground">
        {dataMode === "live" ? "DataForSEO LLM Mentions" : "Not search logs"}
      </span>
      {dataMode === "live" && costEstimateUsd != null ? (
        <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium tracking-wide text-muted-foreground">
          ~${costEstimateUsd.toFixed(2)} / lookup
        </span>
      ) : null}
    </div>
  );
}

function groupPrompts(prompts: VisibilityPrompt[]) {
  const groups = new Map<string, VisibilityPrompt[]>();
  for (const p of prompts) {
    const key = CATEGORY_ORDER.includes(p.category as (typeof CATEGORY_ORDER)[number])
      ? p.category
      : "custom";
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  return CATEGORY_ORDER.filter((key) => (groups.get(key)?.length ?? 0) > 0).map((key) => ({
    key,
    label: CATEGORY_LABELS[key] ?? key,
    source: CATEGORY_SOURCE[key] ?? CATEGORY_SOURCE.custom,
    items: groups.get(key) ?? [],
  }));
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
    <div className="divide-y divide-border/70 rounded-xl border border-border/80 bg-card">
      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="min-w-0">
          <Label className="text-sm font-medium">Weekly citation checks</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ChatGPT, Perplexity, Claude, Gemini
          </p>
        </div>
        <Switch
          checked={settings.llmTrackingEnabled}
          disabled={saving}
          onCheckedChange={(checked) => onChange({ ...settings, llmTrackingEnabled: checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="min-w-0">
          <Label className="text-sm font-medium">Weekly GEO re-audit</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">Homepage scan every Sunday</p>
        </div>
        <Switch
          checked={settings.geoReauditEnabled}
          disabled={saving}
          onCheckedChange={(checked) => onChange({ ...settings, geoReauditEnabled: checked })}
        />
      </div>
      {settings.lastVisibilityCheckAt ? (
        <p className="px-4 py-2.5 text-xs text-muted-foreground">
          Last check{" "}
          {new Date(settings.lastVisibilityCheckAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
        </p>
      ) : null}
    </div>
  );
}

function SourcesDisclosure({ projectId }: { projectId: string }) {
  const [mounted, setMounted] = useState(false);

  return (
    <details
      className="group rounded-xl border border-border/80 bg-card"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open) setMounted(true);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-foreground">Search console sources</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          Optional · GSC & Bing
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180" />
        </span>
      </summary>
      {mounted ? (
        <div className="border-t border-border/70 px-4 pb-4 pt-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Separate from the probe questions below. Connect verified properties for AI Overview and
            Copilot citation reports.
          </p>
          <SearchPropertyConnectionsPanel projectId={projectId} embedded hideCategoryHeader />
        </div>
      ) : null}
    </details>
  );
}

function CheckStatusBanner({
  status,
  promptCount,
  dataMode,
}: {
  status: "idle" | "queuing" | "running";
  promptCount: number;
  dataMode: "live" | "simulated";
}) {
  if (status === "idle") return null;

  return (
    <div className="rounded-xl border border-border px-5 py-4">
      <div className="flex items-start gap-3">
        <Spinner size="sm" className="mt-1" />
        <div className="min-w-0 space-y-1.5">
          <p className="text-[15px] font-medium tracking-normal text-foreground">
            {status === "queuing" ? "Starting citation check" : "Citation check running"}
          </p>
          <p className="max-w-prose text-sm leading-6 tracking-normal text-muted-foreground text-pretty">
            {dataMode === "live"
              ? "Running a live DataForSEO LLM Mentions brand lookup (ChatGPT + Google AI Overview). Results usually arrive in under a minute. This page refreshes automatically when they land."
              : `Sending ${promptCount} probe questions through a simulated Gemini role-play of ChatGPT, Perplexity, Claude, and Gemini. This is not live search traffic. Answers usually arrive in 2–5 minutes. This page refreshes automatically when results land.`}
          </p>
        </div>
      </div>
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
    <div className="space-y-8">
      <div className="max-w-xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Start tracking AI citations</h2>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Add industry, keywords, and competitors in your brand profile. We turn those fields into
            probe questions, then ask AI engines whether they cite your brand.
          </p>
        </div>
        <Button asChild>
          <Link href={`/projects/${projectId}?tab=brand`}>Open brand profile</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Tracking</h3>
        <TrackingSettings settings={settings} saving={saving} onChange={onSettingsChange} />
      </section>
    </div>
  );
}

function PendingCheckState({
  projectId,
  prompts,
  settings,
  saving,
  regenerating,
  dataMode,
  costEstimateUsd,
  onSettingsChange,
  onRegenerate,
}: {
  projectId: string;
  prompts: VisibilityPrompt[];
  settings: VisibilitySettings;
  saving: boolean;
  regenerating: boolean;
  dataMode: "live" | "simulated";
  costEstimateUsd?: number;
  onSettingsChange: (next: VisibilitySettings) => void;
  onRegenerate: () => void;
}) {
  const unique = dedupePrompts(prompts);
  const groups = groupPrompts(unique);
  const duplicateCount = prompts.filter((p) => p.isActive).length - unique.length;
  const polluted = unique.some((p) => isPollutedPrompt(p.prompt));
  const engineChips = dataMode === "live" ? LIVE_ENGINE_CHIPS : ENGINE_CHIPS;

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-4">
        <DataModeBadges dataMode={dataMode} costEstimateUsd={costEstimateUsd} />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-normal">Ready to measure citations</h2>
          <p className="max-w-prose text-[15px] leading-7 tracking-normal text-muted-foreground text-pretty">
            {dataMode === "live"
              ? "With DataForSEO credentials configured, Run check uses live LLM Mentions for ChatGPT and Google AI Overview. Share-of-voice and mention counts come from that API, not from our own model role-play."
              : "Without DataForSEO LLM Mentions credentials, we write short probe questions from your brand profile and ask a simulated Gemini role-play of four AI engines. A citation score is the share of answers that mention your brand. These are not questions real buyers typed into Google or ChatGPT."}
          </p>
          {dataMode === "live" ? (
            <p className="max-w-prose text-sm leading-6 tracking-normal text-muted-foreground text-pretty">
              Typical cost is about $0.20–0.40 per brand lookup
              {costEstimateUsd != null ? ` (estimate for this project: $${costEstimateUsd.toFixed(2)})` : ""}.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {engineChips.map((engine) => (
            <span
              key={engine}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-foreground"
            >
              {engine}
            </span>
          ))}
        </div>
      </header>

      {polluted || duplicateCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-[15px] font-medium leading-6 tracking-normal text-foreground">
            This probe set needs a rebuild
          </p>
          <p className="mt-1.5 max-w-prose text-sm leading-6 tracking-normal text-muted-foreground">
            {polluted
              ? "An older generator pasted your full audience profile into a question."
              : null}
            {duplicateCount > 0
              ? ` ${duplicateCount} duplicate rows are still stored from repeated seeding.`
              : null}{" "}
            Regenerate once to replace them with clean questions from the current brand profile.
          </p>
          <Button
            type="button"
            className="mt-4 gap-1.5"
            disabled={regenerating}
            onClick={onRegenerate}
          >
            {regenerating ? <Spinner size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {regenerating ? "Rebuilding…" : "Rebuild probe questions"}
          </Button>
        </div>
      ) : null}

      <section className="space-y-5">
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">Where this data comes from</h3>
          <p className="max-w-prose text-sm leading-6 tracking-normal text-muted-foreground">
            Every question maps to a field you control. Nothing is scraped from live chat logs.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/80 bg-card px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Source
            </p>
            <p className="mt-2 text-[15px] font-medium leading-6 tracking-normal">
              <Link
                href={`/projects/${projectId}?tab=brand`}
                className="underline-offset-4 hover:underline"
              >
                Brand profile
              </Link>
            </p>
            <p className="mt-1 text-sm leading-6 tracking-normal text-muted-foreground">
              Industry, keywords, competitor URLs
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Method
            </p>
            <p className="mt-2 text-[15px] font-medium leading-6 tracking-normal">
              Probe &amp; score
            </p>
            <p className="mt-1 text-sm leading-6 tracking-normal text-muted-foreground">
              Ask four engines, then score brand mentions in the answers
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Probe set
            </p>
            <p className="mt-2 text-[15px] font-medium leading-6 tracking-normal tabular-nums">
              {unique.length} questions
            </p>
            <p className="mt-1 text-sm leading-6 tracking-normal text-muted-foreground">
              {duplicateCount > 0 ? `${duplicateCount} duplicates still stored` : "No duplicates"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}?tab=brand`}>Edit brand profile</Link>
          </Button>
          {!polluted && duplicateCount === 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={regenerating}
              onClick={onRegenerate}
              className="gap-1.5"
            >
              {regenerating ? <Spinner size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {regenerating ? "Rebuilding…" : "Rebuild from brand profile"}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold tracking-wide">Questions we will send</h3>
          <p className="text-sm leading-6 tracking-normal text-muted-foreground">
            Grouped by the brand-profile field that produced them.
          </p>
        </div>

        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium tracking-normal">{group.label}</p>
                  <p className="text-xs leading-5 tracking-wide text-muted-foreground">
                    {group.source}
                  </p>
                </div>
                <span className="text-xs tabular-nums tracking-wide text-muted-foreground">
                  {group.items.length}
                </span>
              </div>
              <ol className="space-y-2">
                {group.items.map((p, index) => (
                  <li
                    key={p.id}
                    className={cn(
                      "rounded-xl border px-4 py-3.5 text-[15px] leading-7 tracking-normal",
                      isPollutedPrompt(p.prompt)
                        ? "border-amber-200 bg-amber-50/50 text-foreground/80 dark:border-amber-500/20 dark:bg-amber-500/5"
                        : "border-border/80 bg-card text-foreground",
                    )}
                  >
                    <span className="mr-2 text-xs font-medium tabular-nums text-muted-foreground">
                      {index + 1}.
                    </span>
                    {p.prompt}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Tracking schedule</h3>
        <TrackingSettings settings={settings} saving={saving} onChange={onSettingsChange} />
      </section>
    </div>
  );
}

function parsePrompts(raw: unknown): VisibilityPrompt[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const prompt = typeof row.prompt === "string" ? row.prompt : "";
      if (!prompt) return null;
      return {
        id: typeof row.id === "number" ? row.id : 0,
        prompt,
        category: typeof row.category === "string" ? row.category : "custom",
        isActive: row.isActive !== false,
      };
    })
    .filter((p): p is VisibilityPrompt => p != null);
}

function parseSummary(data: Record<string, unknown> | undefined, settings: VisibilitySettings): VisibilitySummary | null {
  if (!data) return null;
  const prompts = parsePrompts(data.prompts);
  const dataMode = data.dataMode === "live" ? "live" : "simulated";
  return {
    settings: (data.settings as VisibilitySettings) ?? settings,
    visibilityScore: (data.visibilityScore as number) ?? (data.score as { overall?: number })?.overall ?? 0,
    promptCount: (data.promptCount as number) ?? prompts.filter((p) => p.isActive).length,
    prompts,
    dataMode,
    llmMentionsConfigured: Boolean(data.llmMentionsConfigured) || dataMode === "live",
    brandLookupCostEstimateUsd:
      typeof data.brandLookupCostEstimateUsd === "number" ? data.brandLookupCostEstimateUsd : undefined,
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
                  <TrackingSettings settings={settings} saving={saving} onChange={saveSettings} />
                </section>
              </div>
            )
          ) : null}

          {summary ? <SourcesDisclosure projectId={projectId} /> : null}
        </>
      )}
    </div>
  );
}
