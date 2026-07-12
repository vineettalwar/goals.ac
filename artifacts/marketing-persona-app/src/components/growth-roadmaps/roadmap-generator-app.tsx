"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GenerationPhase = "summary" | "phase0" | "phase1" | "phase2";

const PHASE_LABELS: Record<GenerationPhase, string> = {
  summary: "Executive Summary",
  phase0: "Phase 1: Foundation & Quick Wins (Months 1–3)",
  phase1: "Phase 2: Scaling & Automation (Months 4–6)",
  phase2: "Phase 3: Expansion (Months 7–12)",
};

const STAGES = [
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "series-b", label: "Series B" },
  { value: "growth", label: "Growth / Late Stage" },
] as const;

type Industry = { id: number; name: string };
type Location = { id: number; name: string; country: string };

type RoadmapGeneratorAppProps = {
  projectId: number;
  defaultIndustry?: string;
  defaultLocation?: string;
  defaultStage?: string;
  onGenerated?: () => void;
};

export function RoadmapGeneratorApp({
  projectId,
  defaultIndustry,
  defaultLocation,
  defaultStage,
  onGenerated,
}: RoadmapGeneratorAppProps) {
  const router = useRouter();

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [industry, setIndustry] = useState(defaultIndustry ?? "");
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [stage, setStage] = useState<string>(defaultStage ?? STAGES[1].value);
  const [isPending, setIsPending] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<Set<GenerationPhase>>(new Set());
  const [generationError, setGenerationError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (defaultIndustry) setIndustry(defaultIndustry);
  }, [defaultIndustry]);

  useEffect(() => {
    if (defaultLocation) setLocation(defaultLocation);
  }, [defaultLocation]);

  useEffect(() => {
    if (defaultStage) setStage(defaultStage);
  }, [defaultStage]);

  useEffect(() => {
    Promise.all([fetch("/api/industries"), fetch("/api/locations")])
      .then(async ([indRes, locRes]) => {
        if (!indRes.ok || !locRes.ok) {
          throw new Error("Failed to load form options");
        }
        const [ind, loc] = await Promise.all([indRes.json(), locRes.json()]);
        setIndustries(Array.isArray(ind) ? ind : []);
        setLocations(Array.isArray(loc) ? loc : []);
        setOptionsError(null);
      })
      .catch(() => {
        setIndustries([]);
        setLocations([]);
        setOptionsError("Could not load industry and location options. Refresh and try again.");
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry || !location || !stage) {
      setGenerationError("Please select industry, location, and stage.");
      return;
    }

    setIsPending(true);
    setCompletedPhases(new Set());
    setGenerationError(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const response = await fetch("/api/roadmaps/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, location, stage, projectId }),
        signal: ac.signal,
      });

      if (!response.ok || !response.body) {
        const errJson = (await response.json().catch(() => ({ error: "Generation failed" }))) as {
          error?: string;
          message?: string;
        };
        if (errJson.error === "quota_exhausted") {
          setGenerationError(
            errJson.message ??
              "You've reached your monthly roadmap limit. Upgrade your plan or add your Gemini API key in Settings.",
          );
        } else {
          setGenerationError(errJson.message ?? errJson.error ?? "Generation failed");
        }
        setIsPending(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;

          const payload = JSON.parse(dataLine.replace("data:", "").trim()) as {
            event?: string;
            slug?: string;
            phaseIndex?: number;
            error?: string;
          };

          if (payload.event === "summary") {
            setCompletedPhases((prev) => new Set([...prev, "summary"]));
          } else if (payload.event === "phase" && typeof payload.phaseIndex === "number") {
            const key = `phase${payload.phaseIndex}` as GenerationPhase;
            setCompletedPhases((prev) => new Set([...prev, key]));
          } else if ((payload.event === "cached" || payload.event === "done") && payload.slug) {
            onGenerated?.();
            router.push(`/growth-roadmaps/${payload.slug}`);
            return;
          } else if (payload.event === "error") {
            setGenerationError(payload.error ?? "Generation failed");
            setIsPending(false);
            return;
          }
        }
      }
      setIsPending(false);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        setGenerationError("Roadmap generation failed. Please try again.");
        setIsPending(false);
      }
    }
  };

  return (
    <div className="paper-card rounded-xl p-6 space-y-6">
      <div>
        <h2 className="font-semibold">Generate growth roadmap</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated 12-month strategy for your market and stage. Saved to this project automatically.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Industry</Label>
            <Select
              value={industry || undefined}
              onValueChange={setIndustry}
              disabled={loadingOptions || industries.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingOptions ? "Loading…" : "Select industry"} />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind.id} value={ind.name}>
                    {ind.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={location || undefined}
              onValueChange={setLocation}
              disabled={loadingOptions || locations.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingOptions ? "Loading…" : "Select location"} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.name}>
                    {loc.name}, {loc.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Company stage</Label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full" disabled={isPending || loadingOptions || industries.length === 0 || locations.length === 0}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating roadmap…
            </>
          ) : (
            "Generate roadmap"
          )}
        </Button>

        {isPending && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
              Building your roadmap…
            </p>
            {(Object.keys(PHASE_LABELS) as GenerationPhase[]).map((key) => {
              const done = completedPhases.has(key);
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0 animate-pulse" />
                  )}
                  <span className={done ? "text-foreground" : "text-muted-foreground"}>
                    {PHASE_LABELS[key]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {optionsError && (
          <p className="text-sm text-destructive text-center">{optionsError}</p>
        )}

        {generationError && (
          <p className="text-sm text-destructive text-center">{generationError}</p>
        )}
      </form>
    </div>
  );
}
