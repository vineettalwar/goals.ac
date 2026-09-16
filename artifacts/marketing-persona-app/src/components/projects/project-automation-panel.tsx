"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Save } from "lucide-react";
import type { AutopilotSettings, VisibilitySettings } from "@workspace/db/schema";
import { DEFAULT_AUTOPILOT_SETTINGS, DEFAULT_VISIBILITY_SETTINGS } from "@workspace/db/schema";
import type { CmsIntegrationCredentials } from "@workspace/content-engine/support/publishing/cms-integration-types";
import { resolvePrimaryBlogDestination } from "@workspace/content-engine/support/publishing/cms-platform-keys";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const RUN_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${hour.toString().padStart(2, "0")}:00`,
}));

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SwitchRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {title}
        </Label>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </div>
  );
}

function publishDeskLabel(mode: AutopilotSettings["publishMode"]) {
  if (mode === "live") return "Live";
  if (mode === "manual") return "Review";
  return "Draft";
}

interface Props {
  projectId: string;
}

export function ProjectAutomationPanel({ projectId }: Props) {
  const [autopilot, setAutopilot] = useState<AutopilotSettings>(DEFAULT_AUTOPILOT_SETTINGS);
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY_SETTINGS);
  const [blogCmsConnected, setBlogCmsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAutopilot, setSavingAutopilot] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [autopilotSaved, setAutopilotSaved] = useState(false);
  const [visibilitySaved, setVisibilitySaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [autoRes, visRes, cmsRes] = await Promise.all([
        fetch(`/api/website-projects/${projectId}/autopilot-settings`),
        fetch(`/api/website-projects/${projectId}/visibility-settings`),
        fetch(`/api/website-projects/${projectId}/cms-integrations`),
      ]);
      if (autoRes.ok) setAutopilot({ ...DEFAULT_AUTOPILOT_SETTINGS, ...(await autoRes.json()) });
      if (visRes.ok) setVisibility({ ...DEFAULT_VISIBILITY_SETTINGS, ...(await visRes.json()) });
      if (cmsRes.ok) {
        const creds = (await cmsRes.json()) as CmsIntegrationCredentials;
        setBlogCmsConnected(Boolean(resolvePrimaryBlogDestination(creds)));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAutopilot() {
    setSavingAutopilot(true);
    setAutopilotSaved(false);
    const res = await fetch(`/api/website-projects/${projectId}/autopilot-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(autopilot),
    });
    setSavingAutopilot(false);
    if (!res.ok) {
      toast.error("Failed to save autopilot settings");
      return;
    }
    setAutopilot(await res.json());
    setAutopilotSaved(true);
    setTimeout(() => setAutopilotSaved(false), 3000);
    toast.success("Autopilot settings saved");
  }

  async function saveVisibility() {
    setSavingVisibility(true);
    setVisibilitySaved(false);
    const res = await fetch(`/api/website-projects/${projectId}/visibility-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visibility),
    });
    setSavingVisibility(false);
    if (!res.ok) {
      toast.error("Failed to save visibility settings");
      return;
    }
    const saved = await res.json();
    setVisibility(saved);
    setVisibilitySaved(true);
    setTimeout(() => setVisibilitySaved(false), 3000);
    toast.success("Visibility settings saved");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  const runHour =
    RUN_HOUR_OPTIONS.find((opt) => opt.value === autopilot.preferredRunHour)?.label ??
    `${String(autopilot.preferredRunHour).padStart(2, "0")}:00`;

  return (
    <div className="space-y-10">
      <section>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-prose">
            <h2 className="font-semibold tracking-tight">Content Autopilot</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadence + review queue — not unattended spam. Writes the next due calendar topic, or
              queues one keyword / cold-start topic for today when the calendar is empty. Live
              publish still needs a connected CMS; review gates still apply.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Label htmlFor="autopilot-enabled" className="text-sm font-medium">
              {autopilot.enabled ? "On" : "Off"}
            </Label>
            <Switch
              id="autopilot-enabled"
              checked={autopilot.enabled}
              onCheckedChange={(checked) => setAutopilot((p) => ({ ...p, enabled: checked }))}
            />
          </div>
        </header>

        <div className="copy-desk-bar mt-5">
          <span>{autopilot.enabled ? "Armed" : "Idle"}</span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <span>{autopilot.cadence === "weekly" ? "Weekly" : "Daily"}</span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <span>{publishDeskLabel(autopilot.publishMode)}</span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <span>
            {runHour} {autopilot.timezone.replace(/_/g, " ")}
          </span>
          {autopilot.lastRunAt ? (
            <>
              <span aria-hidden className="text-muted-foreground">
                ·
              </span>
              <span>Last {new Date(autopilot.lastRunAt).toLocaleString()}</span>
            </>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field id="autopilot-schedule" label="Schedule">
            <Select
              value={autopilot.cadence}
              onValueChange={(value: "daily" | "weekly") =>
                setAutopilot((p) => ({ ...p, cadence: value }))
              }
            >
              <SelectTrigger id="autopilot-schedule">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (one article per day)</SelectItem>
                <SelectItem value="weekly">Weekly (one article per week)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="autopilot-publish-mode" label="Publish mode">
            <Select
              value={autopilot.publishMode}
              onValueChange={(value: AutopilotSettings["publishMode"]) =>
                setAutopilot((p) => ({ ...p, publishMode: value }))
              }
            >
              <SelectTrigger id="autopilot-publish-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual review (generate only)</SelectItem>
                <SelectItem value="draft">Auto-publish as draft</SelectItem>
                <SelectItem value="live">Auto-publish live</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {autopilot.publishMode === "live" && !blogCmsConnected && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Connect WordPress, Shopify, Webflow, or Wix before live auto-publish. You can still
              save these settings.
            </p>
          )}
          <Field id="autopilot-timezone" label="Timezone">
            <Select
              value={autopilot.timezone}
              onValueChange={(value) => setAutopilot((p) => ({ ...p, timezone: value }))}
            >
              <SelectTrigger id="autopilot-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="autopilot-run-hour" label="Run at (local time)">
            <Select
              value={String(autopilot.preferredRunHour)}
              onValueChange={(value) =>
                setAutopilot((p) => ({ ...p, preferredRunHour: Number(value) }))
              }
            >
              <SelectTrigger id="autopilot-run-hour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RUN_HOUR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-6 divide-y divide-border border-y border-border">
          <SwitchRow
            id="autopilot-auto-queue"
            title="Auto-queue keyword opportunities"
            description="When the calendar has nothing due, queue one high-score keyword for today"
            checked={autopilot.autoQueueOpportunities ?? true}
            onCheckedChange={(checked) =>
              setAutopilot((p) => ({ ...p, autoQueueOpportunities: checked }))
            }
          />
        </div>

        {(autopilot.autoQueueOpportunities ?? true) && (
          <div className="mt-5 max-w-md">
            <Field id="autopilot-score-threshold" label="Minimum opportunity score to auto-queue">
              <Select
                value={String(autopilot.opportunityScoreThreshold ?? 60)}
                onValueChange={(value) =>
                  setAutopilot((p) => ({ ...p, opportunityScoreThreshold: Number(value) }))
                }
              >
                <SelectTrigger id="autopilot-score-threshold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 (moderate opportunities)</SelectItem>
                  <SelectItem value="60">60 (recommended)</SelectItem>
                  <SelectItem value="70">70 (high confidence only)</SelectItem>
                  <SelectItem value="80">80 (very selective)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          {autopilotSaved ? (
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Saved</span>
          ) : null}
          <Button onClick={saveAutopilot} disabled={savingAutopilot}>
            {savingAutopilot ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            Save autopilot settings
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2 border-t border-border pt-8 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div className="min-w-0 max-w-prose">
          <h2 className="font-semibold tracking-tight">Internal link hub</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review coverage and suggestions from drafts before publish — white-hat internal linking,
            no exchange schemes.
          </p>
        </div>
        <Link
          href="/search/site"
          className="inline-flex shrink-0 items-center gap-1 text-sm underline underline-offset-4"
        >
          Open site &amp; link coverage
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>

      <section className="border-t border-border pt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <div className="min-w-0 max-w-prose">
            <h2 className="font-semibold tracking-tight">AI Visibility &amp; GEO</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Weekly LLM citation tracking and GEO re-audits.
            </p>
          </div>
          <Link
            href="/search/visibility"
            className="inline-flex shrink-0 items-center gap-1 text-sm underline underline-offset-4"
          >
            View full dashboard
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="mt-5 divide-y divide-border border-y border-border">
          <SwitchRow
            id="visibility-llm-tracking"
            title="LLM citation tracking"
            description="Weekly checks across ChatGPT, Perplexity, Claude, Gemini"
            checked={visibility.llmTrackingEnabled}
            onCheckedChange={(checked) =>
              setVisibility((p) => ({ ...p, llmTrackingEnabled: checked }))
            }
          />
          <SwitchRow
            id="visibility-geo-reaudit"
            title="Weekly GEO re-audit"
            description="Re-scan homepage for schema and meta issues"
            checked={visibility.geoReauditEnabled}
            onCheckedChange={(checked) =>
              setVisibility((p) => ({ ...p, geoReauditEnabled: checked }))
            }
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {visibilitySaved ? (
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Saved</span>
          ) : null}
          <Button variant="outline" onClick={saveVisibility} disabled={savingVisibility}>
            {savingVisibility ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            Save visibility settings
          </Button>
        </div>
      </section>
    </div>
  );
}
