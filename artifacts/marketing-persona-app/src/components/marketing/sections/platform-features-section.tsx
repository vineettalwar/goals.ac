"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { getPlatformFeaturePillars } from "@/lib/marketing/site/marketing-feature-data";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";

const pillars = getPlatformFeaturePillars();
const glassCard = cardSurfaceClass("glass", false);

export function PlatformFeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useMarketingScrollReveal(gridRef, ".feature-pillar, .feature-row");

  return (
    <section ref={sectionRef} className="relative bg-black">
      <div className="relative py-24 text-white border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <EditorialHeading
            line1="The content studio"
            line2="programs run on"
            description="Research, drafts, cross-platform publishing, and AI visibility. You sign off before anything goes live."
            theme="dark"
          />
        </div>
      </div>

      <div ref={gridRef} className="py-20 bg-black border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 md:gap-10">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="feature-pillar">
                <h3 className="text-xl font-bold tracking-tight mb-6 text-white font-playfair italic">{pillar.title}</h3>
                <ul className="space-y-6">
                  {pillar.features.map(({ icon: Icon, title, desc }) => (
                    <li key={title} className={`feature-row ${glassCard} p-4`}>
                      <div className="flex gap-4">
                        <div className="shrink-0 mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-1.5">{title}</h4>
                          <p className="text-base text-white/65 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-12 text-sm text-white/50 text-center max-w-2xl mx-auto">
            Internal links, Reddit discovery, and multilingual are in beta.
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              See all capabilities <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
