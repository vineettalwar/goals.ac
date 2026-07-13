"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";
import { getPlatformFeaturePillars } from "@/lib/marketing-feature-data";
import { useMarketingParallax, useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";

const pillars = getPlatformFeaturePillars();

export function PlatformFeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerBandRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  useMarketingParallax(headerBandRef, bgRef);
  useMarketingScrollReveal(paperRef, ".feature-pillar, .feature-row");

  return (
    <section ref={sectionRef} className="relative">
      <div ref={headerBandRef} className="relative min-h-[40vh] py-24 overflow-hidden text-white">
        <div
          ref={bgRef}
          className="absolute inset-0 -top-[15%] -bottom-[15%] bg-center bg-cover bg-no-repeat z-0"
          style={{ backgroundImage: `url(${HERO_IMAGES.home.workflow})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/55 z-0" aria-hidden />

        <div className="absolute top-0 left-0 right-0 h-24 section-bridge-top pointer-events-none z-10" aria-hidden />

        <div className="relative z-20 max-w-5xl mx-auto px-6">
          <EditorialHeading
            line1="From roadmap"
            line2="to published article"
            description="Strategy, drafts, publishing, and AI visibility. Editorial control at every step."
            theme="dark"
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 features-bridge pointer-events-none z-10" aria-hidden />
      </div>

      <div ref={paperRef} className="features-paper py-20 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 md:gap-10">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="feature-pillar">
                <h3 className="text-xl font-bold tracking-tight mb-6 text-foreground">{pillar.title}</h3>
                <ul className="space-y-6">
                  {pillar.features.map(({ icon: Icon, title, desc }) => (
                    <li key={title} className="feature-row">
                      <div className="flex gap-4">
                        <div className="shrink-0 mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-foreground mb-1.5">{title}</h4>
                          <p className="text-base text-muted-foreground leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-12 text-sm text-muted-foreground text-center max-w-2xl mx-auto">
            Internal links, Reddit discovery, and multilingual are in beta.
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              See all capabilities <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
