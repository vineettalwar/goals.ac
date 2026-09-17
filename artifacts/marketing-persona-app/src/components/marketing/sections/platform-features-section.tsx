"use client";

import { useRef } from "react";
import Link from "next/link";
import { EditorialHeading } from "./editorial-heading";
import { getPlatformFeaturePillars } from "@/lib/marketing/site/marketing-feature-data";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";

const pillars = getPlatformFeaturePillars();

export function PlatformFeaturesSection() {
  const gridRef = useRef<HTMLDivElement>(null);

  useMarketingScrollReveal(gridRef, ".feature-pillar");

  return (
    <section className="relative border-t border-border bg-background">
      <div className="relative py-24 text-foreground">
        <div className="mx-auto max-w-5xl px-6">
          <EditorialHeading
            line1="What the desk actually ships"
            description="SEO Chat, Content Studio, Action Queue, GEO, and WordPress-first publish — the same tools founders and agencies use after signup. Beta stays labeled."
            theme="light"
            align="left"
          />
        </div>
      </div>

      <div ref={gridRef} className="border-t border-border bg-background pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-14 md:grid-cols-3 md:gap-10 md:divide-x md:divide-border">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="feature-pillar md:px-6 md:first:pl-0 md:last:pr-0">
                <h3 className="mb-6 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {pillar.title}
                </h3>
                <ul className="space-y-8">
                  {pillar.features.map(({ title, desc }) => (
                    <li key={title}>
                      <h4 className="mb-1.5 text-base font-semibold tracking-tight text-foreground">
                        {title}
                      </h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-14 max-w-2xl text-sm text-muted-foreground">
            Internal links, Reddit discovery, and multilingual drafts are in beta. Social Hub and LLM
            visibility need connected accounts and provider creds.
          </p>

          <div className="mt-6">
            <Link
              href="/features"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              See all capabilities
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
