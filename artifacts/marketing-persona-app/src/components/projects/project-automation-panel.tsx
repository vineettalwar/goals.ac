"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Zap, Save, CheckCircle2 } from "lucide-react";
import type { AutopilotSettings, VisibilitySettings } from "@workspace/db/schema";
import { DEFAULT_AUTOPILOT_SETTINGS, DEFAULT_VISIBILITY_SETTINGS } from "@workspace/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface Props {
  projectId: string;
}

export function ProjectAutomationPanel({ projectId }: Props) {
  const [autopilot, setAutopilot] = useState<AutopilotSettings>(DEFAULT_AUTOPILOT_SETTINGS);
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingAutopilot, setSavingAutopilot] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [autopilotSaved, setAutopilotSaved] = useState(false);
  const [visibilitySaved, setVisibilitySaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [autoRes, visRes] = await Promise.all([
        fetch(`/api/website-projects/${projectId}/autopilot-settings`),
        fetch(`/api/website-projects/${projectId}/visibility-settings`),
      ]);
      if (autoRes.ok) setAutopilot({ ...DEFAULT_AUTOPILOT_SETTINGS, ...(await autoRes.json()) });
      if (visRes.ok) setVisibility({ ...DEFAULT_VISIBILITY_SETTINGS, ...(await visRes.json()) });
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

  return (
    <div className="space-y-6">
      <div className="paper-card space-y-5 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold">Content Autopilot</h3>
          {autopilot.enabled && (
            <Badge variant="muted" className="text-amber-700 dark:text-amber-300">Active</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically generate the next due article from your content strategy on a daily or weekly schedule.
        </p>

        {autopilotSaved && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3">
            <CheckCircle2 className="h-4 w-4" />
            Autopilot settings saved
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Enable autopilot</p>
            <p className="text-xs text-muted-foreground mt-0.5">Picks the next due topic from your content strategy calendar</p>
          </div>
          <Switch
            checked={autopilot.enabled}
            onCheckedChange={(checked) => setAutopilot((p) => ({ ...p, enabled: checked }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select
              value={autopilot.cadence}
              onValueChange={(value: "daily" | "weekly") => setAutopilot((p) => ({ ...p, cadence: value }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (one article per day)</SelectItem>
                <SelectItem value="weekly">Weekly (one article per week)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Publish mode</Label>
            <Select
              value={autopilot.publishMode}
              onValueChange={(value: AutopilotSettings["publishMode"]) =>
                setAutopilot((p) => ({ ...p, publishMode: value }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual review (generate only)</SelectItem>
                <SelectItem value="draft">Auto-publish as draft</SelectItem>
                <SelectItem value="live">Auto-publish live</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={autopilot.timezone}
              onValueChange={(value) => setAutopilot((p) => ({ ...p, timezone: value }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Run at (local time)</Label>
            <Select
              value={String(autopilot.preferredRunHour)}
              onValueChange={(value) => setAutopilot((p) => ({ ...p, preferredRunHour: Number(value) }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RUN_HOUR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Auto-queue keyword opportunities</p>
            <p className="text-xs text-muted-foreground mt-0.5">High-score keyword gaps added to your content strategy calendar</p>
          </div>
          <Switch
            checked={autopilot.autoQueueOpportunities ?? false}
            onCheckedChange={(checked) => setAutopilot((p) => ({ ...p, autoQueueOpportunities: checked }))}
          />
        </div>

        {(autopilot.autoQueueOpportunities ?? false) && (
          <div className="space-y-2">
            <Label>Minimum opportunity score to auto-queue</Label>
            <Select
              value={String(autopilot.opportunityScoreThreshold ?? 60)}
              onValueChange={(value) =>
                setAutopilot((p) => ({ ...p, opportunityScoreThreshold: Number(value) }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 (moderate opportunities)</SelectItem>
                <SelectItem value="60">60 (recommended)</SelectItem>
                <SelectItem value="70">70 (high confidence only)</SelectItem>
                <SelectItem value="80">80 (very selective)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {autopilot.lastRunAt && (
          <p className="text-xs text-muted-foreground">
            Last run: {new Date(autopilot.lastRunAt).toLocaleString()}
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={saveAutopilot} disabled={savingAutopilot}>
            {savingAutopilot ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            Save autopilot settings
          </Button>
        </div>
      </div>

      <div className="paper-card space-y-4 rounded-xl p-6">
        <h3 className="font-semibold">Internal link hub</h3>
        <p className="text-sm text-muted-foreground">
          Review coverage and suggestions from drafts before publish — white-hat internal linking, no exchange schemes.{" "}
          <Link href="/search/site" className="text-primary hover:underline">
            Open site &amp; link coverage
          </Link>
        </p>
      </div>

      <div className="paper-card space-y-4 rounded-xl p-6">
        <h3 className="font-semibold">AI Visibility & GEO</h3>
        <p className="text-sm text-muted-foreground">
          Weekly LLM citation tracking and GEO re-audits.{" "}
          <Link href="/search/visibility" className="text-primary hover:underline">View full dashboard</Link>
        </p>

        {visibilitySaved && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3">
            <CheckCircle2 className="h-4 w-4" />
            Visibility settings saved
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium">LLM citation tracking</p>
            <p className="text-xs text-muted-foreground mt-0.5">Weekly checks across ChatGPT, Perplexity, Claude, Gemini</p>
          </div>
          <Switch
            checked={visibility.llmTrackingEnabled}
            onCheckedChange={(checked) => setVisibility((p) => ({ ...p, llmTrackingEnabled: checked }))}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Weekly GEO re-audit</p>
            <p className="text-xs text-muted-foreground mt-0.5">Re-scan homepage for schema and meta issues</p>
          </div>
          <Switch
            checked={visibility.geoReauditEnabled}
            onCheckedChange={(checked) => setVisibility((p) => ({ ...p, geoReauditEnabled: checked }))}
          />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={saveVisibility} disabled={savingVisibility}>
            {savingVisibility ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            Save visibility settings
          </Button>
        </div>
      </div>
    </div>
  );
}
