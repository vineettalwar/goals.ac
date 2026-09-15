"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { QuotaUpgradePrompt } from "@/components/billing/quota-upgrade-prompt";
import { useRoadmapFormOptions } from "@/lib/queries";

type GenerationPhase = "summary" | "phase0" | "phase1" | "phase2";

const PHASE_LABELS: Record<GenerationPhase, string> = {
  summary: "Executive summary",
  phase0: "Months 1–3: Foundation & quick wins",
  phase1: "Months 4–6: Scale what worked",
  phase2: "Months 7–12: Market expansion",
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

  const { data: formOptions, isLoading: loadingOptions, isError: optionsQueryError } =
    useRoadmapFormOptions();
  const industries = useMemo(() => {
    const rows = formOptions?.industries ?? [];
    if (defaultIndustry && !rows.some((row) => row.name === defaultIndustry)) {
      return [{ id: 0, name: defaultIndustry }, ...rows];
    }
    return rows;
  }, [formOptions?.industries, defaultIndustry]);
  const locations = useMemo(() => {
    const rows = formOptions?.locations ?? [];
    if (defaultLocation && !rows.some((row) => row.name === defaultLocation)) {
      return [{ id: 0, name: defaultLocation, country: "" }, ...rows];
    }
    return rows;
  }, [formOptions?.locations, defaultLocation]);
  const optionsError = optionsQueryError
    ? "Could not load industry and location options. Refresh and try again."
    : null;
  const [industry, setIndustry] = useState(defaultIndustry ?? "");
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [stage, setStage] = useState<string>(defaultStage ?? STAGES[1].value);
  const [isPending, setIsPending] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<Set<GenerationPhase>>(new Set());
  const [generationError, setGenerationError] = useState<{
    message: string;
  } | null>(null);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry || !location || !stage) {
      setGenerationError({ message: "Please select industry, location, and stage." });
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
        if (errJson.error === "quota_exhausted" || errJson.error === "insufficient_credits") {
          setGenerationError({
            message:
              errJson.message ??
              "You've reached your monthly roadmap limit on the platform key. Add your API key in Integrations → AI.",
          });
        } else {
          setGenerationError({
            message: errJson.message ?? errJson.error ?? "Generation failed",
          });
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
            setGenerationError({ message: payload.error ?? "Generation failed" });
            setIsPending(false);
            return;
          }
        }
      }
      setIsPending(false);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        setGenerationError({ message: "Roadmap generation failed. Please try again." });
        setIsPending(false);
      }
    }
  };

  return (
    <div className="paper-card rounded-xl p-6 space-y-6">
      <div>
        <h2 className="font-semibold">Generate growth roadmap</h2>
        <p className="text-sm text-muted-foreground mt-1">
          One 12-month GTM plan for this project. Uses your brand, keywords, and goals. Industry,
          market, and stage set the frame. Later quarters continue the same bets; they do not
          restart.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Industry</Label>
            <Select
              value={industry}
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
              value={location}
              onValueChange={setLocation}
              disabled={loadingOptions || locations.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingOptions ? "Loading…" : "Select location"} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.name}>
                    {loc.country ? `${loc.name}, ${loc.country}` : loc.name}
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

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || loadingOptions || !industry || !location || !stage}
        >
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
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Writing one 12-month plan…
            </p>
            {(Object.keys(PHASE_LABELS) as GenerationPhase[]).map((key) => {
              const phaseOrder = Object.keys(PHASE_LABELS) as GenerationPhase[];
              const firstIncomplete = phaseOrder.find((k) => !completedPhases.has(k));
              const done = completedPhases.has(key);
              const isActive = !done && key === firstIncomplete;
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle
                      className={`h-4 w-4 shrink-0 ${isActive ? "text-primary animate-pulse" : "text-muted-foreground"}`}
                    />
                  )}
                  <span
                    className={
                      done ? "text-foreground" : isActive ? "text-foreground" : "text-muted-foreground"
                    }
                  >
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
          <QuotaUpgradePrompt message={generationError.message} />
        )}
      </form>
    </div>
  );
}
