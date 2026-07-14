"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { HeroOverlapShell } from "./hero-overlap-shell";
import { EditorialHeading } from "./editorial-heading";
import {
  GROWTH_ROADMAPS_PATH,
  saveRoadmapIntent,
} from "@/lib/projects/roadmap-intent";

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

function saveIntentAndGetDestination(
  industry: string,
  location: string,
  stage: string,
  isAuthenticated: boolean,
  referrer?: string,
): string {
  saveRoadmapIntent({ industry, location, stage, referrer });
  if (isAuthenticated) return GROWTH_ROADMAPS_PATH;
  return "/contact";
}

export function RoadmapGenerator({ sectionRef, referrer }: RoadmapGeneratorProps) {
  const router = useRouter();
  const { status } = useSession();
  const internalRef = useRef<HTMLElement>(null);
  const ref = sectionRef ?? internalRef;

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [stage, setStage] = useState<string>(STAGES[0].value);
  const [formError, setFormError] = useState<string | null>(null);

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry || !location || !stage) {
      setFormError("Please select industry, location, and stage.");
      return;
    }

    setFormError(null);
    router.push(
      saveIntentAndGetDestination(
        industry,
        location,
        stage,
        status === "authenticated",
        referrer,
      ),
    );
  };

  const selectClass =
    "w-full h-11 rounded-lg border border-border bg-white px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20";

  return (
    <HeroOverlapShell id="roadmap-generator" sectionRef={ref}>
      <div className="p-8 md:p-12">
        <div className="inline-flex items-center gap-1.5 rounded-full editorial-badge-light px-2.5 py-0.5 text-[11px] font-semibold mb-4 uppercase tracking-wide">
          Free starter tool
        </div>
        <EditorialHeading
          line1="Generate your"
          line2="2026 Growth Roadmap"
          description="Choose your market and stage, then contact us to build a custom 12-month plan. Browse sample roadmaps in our catalog anytime — no signup required."
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
              className="w-full h-12 text-base font-semibold hero-cta-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              disabled={loadingOptions}
            >
              Generate my roadmap
              <ArrowRight className="h-5 w-5" />
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
