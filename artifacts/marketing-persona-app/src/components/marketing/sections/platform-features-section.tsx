"use client";

import { useRef } from "react";
import Link from "next/link";
import { EditorialHeading } from "./editorial-heading";
import { getPlatformFeaturePillars } from "@/lib/marketing/site/marketing-feature-data";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";

const pillars = getPlatformFeaturePillars();

export function PlatformFeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useMarketingScrollReveal(gridRef, ".feature-pillar");

  return (
    <section ref={sectionRef} className="relative bg-black">
      <div className="relative border-b border-white/10 py-24 text-white">
        <div className="mx-auto max-w-5xl px-6">
          <EditorialHeading
            line1="The content studio"
            line2="programs run on"
            description="Research, drafts, publishing, and AI visibility. You sign off before anything goes live."
            theme="dark"
          />
        </div>
      </div>

      <div ref={gridRef} className="border-t border-white/10 bg-black py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-14 md:grid-cols-3 md:gap-10">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="feature-pillar">
                <h3 className="mb-6 font-playfair text-xl font-bold italic tracking-tight text-white">
                  {pillar.title}
                </h3>
                <ul className="space-y-6">
                  {pillar.features.map(({ title, desc }) => (
                    <li key={title}>
                      <h4 className="mb-1 font-semibold text-white">{title}</h4>
                      <p className="text-sm leading-relaxed text-white/65">{desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-white/50">
            Internal links, Reddit discovery, and multilingual are in beta.
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/features"
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              See all capabilities
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
