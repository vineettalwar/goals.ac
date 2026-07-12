"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { HeroOverlapShell } from "./hero-overlap-shell";
import { EditorialHeading } from "./editorial-heading";

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

type RoadmapGeneratorProps = {
  sectionRef?: React.RefObject<HTMLElement | null>;
};

export function RoadmapGenerator({ sectionRef }: RoadmapGeneratorProps) {
  const router = useRouter();
  const internalRef = useRef<HTMLElement>(null);
  const ref = sectionRef ?? internalRef;

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [stage, setStage] = useState<string>(STAGES[0].value);
  const [isPending, setIsPending] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<Set<GenerationPhase>>(new Set());
  const [generationError, setGenerationError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/industries"), fetch("/api/locations")])
      .then(async ([indRes, locRes]) => {
        const [ind, loc] = await Promise.all([indRes.json(), locRes.json()]);
        setIndustries(Array.isArray(ind) ? ind : []);
        setLocations(Array.isArray(loc) ? loc : []);
      })
      .catch(() => {})
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
        body: JSON.stringify({ industry, location, stage }),
        signal: ac.signal,
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({ error: "Generation failed" }));
        setGenerationError(errJson.error ?? "Generation failed");
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
            router.push(`/roadmap/${payload.slug}`);
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

  const selectClass =
    "w-full h-11 rounded-lg border border-(--border) bg-white px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20";

  return (
    <HeroOverlapShell id="roadmap-generator" sectionRef={ref}>
      <div className="p-8 md:p-12">
        <div className="inline-flex items-center gap-1.5 rounded-full editorial-badge-light px-2.5 py-0.5 text-[11px] font-semibold mb-4 uppercase tracking-wide">
          Free starter tool
        </div>
        <EditorialHeading
          line1="Generate your"
          line2="2026 Growth Roadmap"
          description="Choose your market and stage. We'll return a sequenced plan with priorities for the next 12 months. No account required."
          align="left"
          size="card"
          animate={false}
          className="mb-8"
        />

        <form onSubmit={onSubmit} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Industry</Label>
              <select
                className={selectClass}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={loadingOptions}
              >
                <option value="">
                  {loadingOptions ? "Loading..." : "Select industry"}
                </option>
                {industries.map((ind) => (
                  <option key={ind.id} value={ind.name}>
                    {ind.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Location</Label>
              <select
                className={selectClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loadingOptions}
              >
                <option value="">
                  {loadingOptions ? "Loading..." : "Select location"}
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}, {loc.country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Company Stage</Label>
            <select
              className={selectClass}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 space-y-4">
            <button
              type="submit"
              className="w-full h-12 text-base font-semibold hero-cta-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || loadingOptions}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating roadmap…
                </>
              ) : (
                "Build my roadmap"
              )}
            </button>

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

            {generationError && (
              <p className="text-sm text-destructive text-center">{generationError}</p>
            )}
          </div>
        </form>
      </div>
    </HeroOverlapShell>
  );
}
