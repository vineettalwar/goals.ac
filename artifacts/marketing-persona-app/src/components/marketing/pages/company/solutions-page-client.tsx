"use client";

import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { SOLUTION_GROUP_LABELS, solutionsByGroup, type SolutionGroup } from "@/lib/marketing/site/site-nav";

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
                <h2 className="mb-3 text-sm font-semibold text-white">
                  {SOLUTION_GROUP_LABELS[group]}
                </h2>
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="group block">
                        <h3 className="font-semibold text-white group-hover:text-(--accent-warm)">
                          {item.label}
                        </h3>
                        {item.description ? (
                          <p className="mt-1 text-sm leading-relaxed text-white/65">{item.description}</p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
