"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { SearchPropertyConnectionsPanel } from "@/components/integrations/search-property-connections-panel";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ORDER,
  ENGINE_CHIPS,
  LIVE_ENGINE_CHIPS,
  dedupePrompts,
  groupPrompts,
  isPollutedPrompt,
  type VisibilityPrompt,
  type VisibilitySettings,
} from "./ai-visibility-types";

export function DataModeBadges({
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

export function TrackingSettings({
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

export function SourcesDisclosure({ projectId }: { projectId: string }) {
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

export function CheckStatusBanner({
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

export function SetupEmptyState({
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

export function PendingCheckState({
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

// Re-export CATEGORY_ORDER so panels file is self-contained for rendering
export { CATEGORY_ORDER };
