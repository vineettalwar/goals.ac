"use client";

import Link from "next/link";
import { FeatureStatusBadge } from "@/components/shared/feature-status-badge";
import { WaitlistForm } from "@/components/shared/waitlist-form";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

const SHIPPED = [
  { name: "Social Hub (6 platforms)", href: "/social-distribution" },
  { name: "Search analytics (GSC + GA4)", href: "/search-analytics" },
  { name: "Brand voice RAG", href: "/brand-voice" },
  { name: "CMS + social publish (deep + Basic)", href: "/platform-integrations" },
  { name: "Public API keys (gac_)", href: "/features" },
  { name: "CmsAdapter render preview", href: "/cms-publishing" },
];

const ROADMAP = [
  { name: "Internal Link Hub", status: "beta" as const, href: "/link-building" },
  { name: "Reddit Discovery", status: "beta" as const, href: "/reddit-visibility" },
  { name: "25+ languages", status: "beta" as const, href: "/multilingual-content" },
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
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" }]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <h2 className="text-lg font-semibold mb-4 text-center text-white">Recently shipped</h2>
        <ul className="space-y-2 max-w-2xl mx-auto mb-12">
          {SHIPPED.map((item) => (
            <li key={item.name} className="text-sm text-center">
              <Link href={item.href} className="text-(--accent-warm) hover:underline">{item.name}</Link>
            </li>
          ))}
        </ul>
        <h2 className="text-lg font-semibold mb-4 text-center text-white">In progress & planned</h2>
        <ul className="space-y-3 max-w-2xl mx-auto">
          {ROADMAP.map((item) => (
            <li key={item.name} className={`${glassCard} p-4 flex items-center justify-between gap-4`}>
              <div className="flex items-center gap-3">
                <FeatureStatusBadge status={item.status} />
                {"href" in item && item.href ? (
                  <Link href={item.href} className="font-medium text-white hover:text-(--accent-warm)">{item.name}</Link>
                ) : (
                  <span className="font-medium text-white">{item.name}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="max-w-md mx-auto mt-12 text-center">
          <p className="text-sm text-white/65 mb-4">Tell us what to prioritize next</p>
          <WaitlistForm featureKey="product-roadmap" variant="dark" />
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
