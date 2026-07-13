"use client";

import Link from "next/link";
import { FeatureStatusBadge } from "@/components/feature-status-badge";
import { WaitlistForm } from "@/components/waitlist-form";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

const ROADMAP = [
  { name: "Internal Link Hub", status: "beta" as const, href: "/link-building" },
  { name: "Reddit Discovery", status: "beta" as const, href: "/reddit-visibility" },
  { name: "10 languages", status: "beta" as const, href: "/multilingual-content" },
  { name: "AI article hero images", status: "coming-soon" as const, key: "ai-images" },
  { name: "Agency white-label reseller", status: "coming-soon" as const, key: "agency-reseller" },
  { name: "50+ languages", status: "coming-soon" as const, key: "multilingual-50" },
  { name: "Link outreach playbook", status: "coming-soon" as const, key: "link-building-playbook" },
  { name: "Dedicated SEO strategist", status: "coming-soon" as const, key: "dedicated-strategist" },
];

export function ProductRoadmapPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Product roadmap"
          titleLine1="What we're"
          titleLine2="building next"
          description="Live features, beta releases, and coming-soon items. Vote with the waitlist."
          backgroundImage={HERO_IMAGES.features.cta}
          ctas={[{ label: "Start free", href: "/signup", variant: "primary" }]}
        />
      }
    >
      <MarketingSection variant="paper" bordered className="py-16 bg-background">
        <ul className="space-y-3 max-w-2xl mx-auto">
          {ROADMAP.map((item) => (
            <li key={item.name} className="paper-card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FeatureStatusBadge status={item.status} />
                {"href" in item && item.href ? (
                  <Link href={item.href} className="font-medium hover:text-primary">{item.name}</Link>
                ) : (
                  <span className="font-medium">{item.name}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="max-w-md mx-auto mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">Tell us what to prioritize next</p>
          <WaitlistForm featureKey="product-roadmap" />
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
