"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";
import { SOLUTION_GROUP_LABELS, solutionsByGroup, type SolutionGroup } from "@/lib/site-nav";

export function SolutionsPageClient() {
  const grouped = solutionsByGroup();

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Solutions"
          titleLine1="Outcomes"
          titleLine2="we help you achieve"
          description="Whether you need AI citations, content at scale, or agency workflows, pick the path that matches your goal."
          backgroundImage={HERO_IMAGES.features.capabilities}
          ctas={[
            { label: "Start free", href: "/signup", variant: "primary" },
            { label: "Browse features", href: "/features", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection variant="paper" bordered className="py-16 bg-background">
        <div className="space-y-14">
          {(Object.keys(SOLUTION_GROUP_LABELS) as SolutionGroup[]).map((group) => {
            const items = grouped[group];
            if (!items?.length) return null;
            return (
              <div key={group}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                  {SOLUTION_GROUP_LABELS[group]}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="paper-card paper-card-hover p-6 flex flex-col group"
                    >
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{item.label}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-2 flex-1 leading-relaxed">{item.description}</p>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-primary mt-4">
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
