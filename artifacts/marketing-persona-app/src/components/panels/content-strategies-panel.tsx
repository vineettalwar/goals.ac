"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useActiveProject } from "@/context/use-active-project";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
import { useProjectContent } from "@/lib/queries";
import { queryKeys } from "@/lib/queries/keys";

interface Roadmap {
  id: number;
  industry: string;
  location: string;
  stage: string;
  slug: string;
}

interface ContentStrategy {
  id: number;
  month: number;
  year: number;
  industry: string;
  location: string;
  stage: string;
  createdAt: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ContentStrategiesPanel({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { activeProjectId, activeProject, isLoading: projectLoading } = useActiveProject();
  const { data: projectContent, isLoading: contentLoading } = useProjectContent(activeProjectId);
  const roadmaps = (projectContent?.roadmaps ?? []) as Roadmap[];
  const strategies = (projectContent?.contentStrategies ?? []) as ContentStrategy[];
  const loading = contentLoading && strategies.length === 0;
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    roadmapId: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  async function handleGenerate() {
    if (!form.roadmapId) {
      toast.error("Select a roadmap");
      return;
    }
    if (!activeProjectId) {
      toast.error("Select a project first");
      return;
    }
    setGenerating(true);
    const res = await fetch("/api/content-strategies/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roadmapId: parseInt(form.roadmapId, 10),
        websiteProjectId: activeProjectId,
        month: form.month,
        year: form.year,
      }),
    });
    setGenerating(false);
    if (!res.ok) {
      toast.error("Failed to generate strategy");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectContent(activeProjectId) });
    setShowForm(false);
    toast.success("Content strategy generated");
  }

  const containerClass = embedded ? "space-y-6" : `${APP_SHELL_PAGE} space-y-6`;

  if (projectLoading) {
    return (
      <div className={embedded ? "flex items-center justify-center p-16" : "flex items-center justify-center p-16"}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {!embedded ? (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Content Engine</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeProject
                ? `30-day content calendars from ${activeProject.name}'s roadmaps`
                : "Generate 30-day content calendars from your growth roadmaps"}
            </p>
          </div>
          {activeProjectId && roadmaps.length > 0 && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" /> New strategy
            </Button>
          )}
        </div>
      ) : activeProjectId && roadmaps.length > 0 ? (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> New strategy
          </Button>
        </div>
      ) : null}

      {!activeProjectId ? (
        <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No project selected</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Select or create a project to generate content strategies from its roadmaps.
          </p>
          <Link href="/projects">
            <Button variant="outline">Manage projects</Button>
          </Link>
        </div>
      ) : showForm ? (
        <div className="paper-card p-6 rounded-xl space-y-4">
          <h2 className="font-semibold">Generate content strategy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="strategy-roadmap">Roadmap</Label>
              <select
                id="strategy-roadmap"
                aria-label="Roadmap"
                className="w-full h-10 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.roadmapId}
                onChange={(e) => setForm((p) => ({ ...p, roadmapId: e.target.value }))}
              >
                <option value="">Select roadmap…</option>
                {roadmaps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.industry} — {r.location}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="strategy-month">Month</Label>
              <select
                id="strategy-month"
                aria-label="Month"
                className="w-full h-10 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.month}
                onChange={(e) => setForm((p) => ({ ...p, month: parseInt(e.target.value, 10) }))}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: parseInt(e.target.value, 10) }))}
                min={2024}
                max={2030}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Spinner size="sm" /> Generating…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Generate
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Spinner size="lg" />
        </div>
      ) : strategies.length === 0 ? (
        <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No content strategies yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {roadmaps.length === 0
              ? "Generate a growth roadmap first, then create a content strategy from it"
              : "Generate a 30-day content calendar from one of your roadmaps"}
          </p>
          {roadmaps.length === 0 ? (
            <Link href="/strategy/roadmaps">
              <Button variant="outline">Go to Growth Roadmaps</Button>
            </Link>
          ) : (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Generate first strategy
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {strategies.map((s) => (
            <div
              key={s.id}
              className="paper-card rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium">
                  {MONTH_NAMES[(s.month ?? 1) - 1]} {s.year}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.industry} · {s.location} · {new Date(s.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                </p>
              </div>
              <Link href={`/content-strategy/${s.id}`}>
                <Button variant="outline" size="sm">
                  View plan
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
