"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { SOLUTION_GROUP_LABELS, solutionsByGroup, type SolutionGroup } from "@/lib/marketing/site/site-nav";

const glassCard = cardSurfaceClass("glass");

export function SolutionsPageClient() {
  const grouped = solutionsByGroup();

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Solutions"
          titleLine1="Outcomes"
          titleLine2="we help you achieve"
          description="Pick the path that matches your goal: AI citations, content production, or agency workflows."
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "Browse features", href: "/features", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <div className="space-y-14">
          {(Object.keys(SOLUTION_GROUP_LABELS) as SolutionGroup[]).map((group) => {
            const items = grouped[group];
            if (!items?.length) return null;
            return (
              <div key={group}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70 mb-4">
                  {SOLUTION_GROUP_LABELS[group]}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${glassCard} p-6 flex flex-col group`}
                    >
                      <h3 className="font-bold text-lg text-white group-hover:text-(--accent-warm) transition-colors">
                        {item.label}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-white/65 mt-2 flex-1 leading-relaxed">{item.description}</p>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-white/80 mt-4 group-hover:text-white">
                        Learn more <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
