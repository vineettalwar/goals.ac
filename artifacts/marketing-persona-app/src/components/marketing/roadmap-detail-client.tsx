"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { RoadmapChat } from "@/components/roadmap-chat";
import { RoadmapLeadCTA } from "@/app/(public)/(inner)/roadmap/[slug]/roadmap-lead-cta";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

interface Phase {
  title: string;
  timeframe: string;
  objectives: string[];
  tactics: string[];
  kpis: string[];
}

interface RoadmapContent {
  executiveSummary?: string;
  phases?: Phase[];
}

type RoadmapDetailClientProps = {
  slug: string;
  industry: string;
  location: string;
  stage: string;
  content: RoadmapContent;
};

export function RoadmapDetailClient({
  slug,
  industry,
  location,
  stage,
  content,
}: RoadmapDetailClientProps) {
  const phases = content?.phases ?? [];

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge={`${location} · ${stage}`}
          titleLine1={industry}
          titleLine2="Growth Roadmap"
          description={
            content.executiveSummary
              ? content.executiveSummary.slice(0, 180) + (content.executiveSummary.length > 180 ? "…" : "")
              : "A 12-month AI-generated growth strategy tailored to your market and stage."
          }
          backgroundImage={HERO_IMAGES.roadmapDetail.hero}
          ctas={[{ label: "Browse all roadmaps", href: "/roadmaps", variant: "ghost" }]}
        />
      }
    >
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8 pb-32">
        <Link
          href="/roadmaps"
          className="inline-flex items-center gap-1.5 text-sm text-white/65 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All roadmaps
        </Link>

        {content.executiveSummary && (
          <div className={`${glassCard} p-6 -mt-4`}>
            <h2 className="font-semibold mb-2 text-white">Executive Summary</h2>
            <p className="text-sm leading-relaxed text-white/65">{content.executiveSummary}</p>
          </div>
        )}

        <div className="space-y-4">
          {phases.map((phase, i) => (
            <div key={i} className={`${glassCard} p-6 space-y-4`}>
              <div className="flex items-start gap-4">
                <div className="step-dot active shrink-0">{i + 1}</div>
                <div>
                  <h3 className="font-bold text-lg text-white">{phase.title}</h3>
                  <p className="text-sm text-primary font-medium">{phase.timeframe}</p>
                </div>
              </div>
              {phase.objectives?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">
                    Objectives
                  </h4>
                  <ul className="space-y-1.5">
                    {phase.objectives.map((o, j) => (
                      <li key={j} className="text-sm flex gap-2 text-white/80">
                        <span className="text-primary">•</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {phase.tactics?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">
                    Tactics
                  </h4>
                  <ul className="space-y-1.5">
                    {phase.tactics.map((t, j) => (
                      <li key={j} className="text-sm flex gap-2 text-white/80">
                        <span className="text-white/50">→</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {phase.kpis?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">
                    KPIs
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {phase.kpis.map((kpi, j) => (
                      <span key={j} className="text-xs bg-white/10 rounded-md px-2.5 py-1 text-white/80">
                        {kpi}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <RoadmapLeadCTA slug={slug} />
        <RoadmapChat slug={slug} />
      </div>
    </MarketingPageShell>
  );
}
