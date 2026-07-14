"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { HeroOverlapShell } from "../heroes/hero-overlap-shell";
import { EditorialHeading } from "./editorial-heading";
import {
  buildAuthRedirectParams,
  saveRoadmapIntent,
} from "@/lib/projects/roadmap-intent";
import { useRoadmapFormOptions } from "@/lib/queries";

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
  referrer?: string;
};

export function RoadmapGenerator({ sectionRef, referrer }: RoadmapGeneratorProps) {
  const router = useRouter();
  const internalRef = useRef<HTMLElement>(null);
  const ref = sectionRef ?? internalRef;

  const { data: formOptions, isLoading: loadingOptions } = useRoadmapFormOptions();
  const industries = formOptions?.industries ?? [];
  const locations = formOptions?.locations ?? [];
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [stage, setStage] = useState<string>(STAGES[0].value);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry || !location || !stage) {
      setFormError("Please select industry, location, and stage.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/roadmaps/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, location, stage }),
      });

      if (res.status === 401) {
        saveRoadmapIntent({ industry, location, stage, referrer });
        router.push(`/signup?${buildAuthRedirectParams(referrer).toString()}`);
        return;
      }

      const payload = (await res.json().catch(() => null)) as {
        slug?: string;
        error?: string;
        message?: string;
      } | null;

      if (!res.ok || !payload?.slug) {
        setFormError(payload?.message ?? payload?.error ?? "Could not generate roadmap. Try again.");
        return;
      }

      router.push(`/roadmap/${payload.slug}`);
    } catch {
      setFormError("Could not generate roadmap. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectClass = "marketing-input-dark";

  return (
    <HeroOverlapShell id="roadmap-generator" sectionRef={ref}>
      <div className="p-8 sm:p-10 md:p-12">
        <div className="inline-flex items-center gap-1.5 rounded-full editorial-badge-dark px-2.5 py-0.5 text-[11px] font-semibold mb-4 uppercase tracking-wide">
          Start here
        </div>
        <EditorialHeading
          line1="Generate your"
          line2="2026 Growth Roadmap"
          description="Engagements start with a 12-month roadmap. Pick industry, location, and stage. Matches in our catalog open instantly; new combos need sign-in."
          align="left"
          size="card"
          theme="dark"
          animate={false}
          className="mb-8"
        />

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="roadmap-industry" className="text-sm font-semibold text-white/80">Industry</Label>
              <select
                id="roadmap-industry"
                aria-label="Industry"
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
              <Label htmlFor="roadmap-location" className="text-sm font-semibold text-white/80">Location</Label>
              <select
                id="roadmap-location"
                aria-label="Location"
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
            <Label htmlFor="roadmap-company-stage" className="text-sm font-semibold text-white/80">Company Stage</Label>
            <select
              id="roadmap-company-stage"
              aria-label="Company stage"
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
              className="w-full h-12 text-base font-semibold hero-cta-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              disabled={loadingOptions || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating roadmap…
                </>
              ) : (
                <>
                  Generate my roadmap
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {formError && (
              <p className="text-sm text-destructive text-center">{formError}</p>
            )}
          </div>
        </form>
      </div>
    </HeroOverlapShell>
  );
}
