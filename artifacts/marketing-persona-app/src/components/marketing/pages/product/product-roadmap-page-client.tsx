"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { FeatureStatusBadge } from "@/components/shared/feature-status-badge";
import { WaitlistForm } from "@/components/shared/waitlist-form";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");
const glassCardStatic = cardSurfaceClass("glass", false);

const SHIPPED = [
  { name: "Social Hub (6 platforms)", href: "/social-distribution" },
  { name: "Search analytics (GSC + GA4)", href: "/search-analytics" },
  { name: "Brand voice RAG", href: "/brand-voice" },
  { name: "CMS + social publish (deep + Basic)", href: "/integrations" },
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

const DARK_BADGE = {
  live: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  beta: "border-(--accent-warm)/45 bg-(--accent-warm)/15 text-(--accent-warm)",
  "coming-soon": "border-white/20 bg-white/8 text-white/70",
} as const;

export function ProductRoadmapPageClient() {
  const beta = ROADMAP.filter((item) => item.status === "beta");
  const comingSoon = ROADMAP.filter((item) => item.status === "coming-soon");

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
      <MarketingSection
        variant="dark"
        bridgeTop
        badge="Shipped"
        titleLine1="Recently"
        titleLine2="shipped"
        description="Live in product today — open any item for the feature page."
        className="py-20"
      >
        <ul className="grid sm:grid-cols-2 gap-3">
          {SHIPPED.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`${glassCard} group flex items-center gap-3 px-4 py-3.5`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                  <Check className="h-4 w-4 text-emerald-300" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-white group-hover:text-white">
                  {item.name}
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-white/35 transition-colors group-hover:text-(--accent-warm)"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection
        bordered
        badge="Backlog"
        titleLine1="In progress"
        titleLine2="& planned"
        description="Beta features you can try now, plus what is queued next."
        className="py-20"
      >
        <div className="space-y-10">
          <RoadmapGroup title="Beta" items={beta} />
          <RoadmapGroup title="Coming soon" items={comingSoon} />
        </div>
      </MarketingSection>

      <DarkCTABand
        badge="Request a feature"
        titleLine1="Tell us what to"
        titleLine2="prioritize next"
        description="Join the waitlist for a roadmap item — we use votes to order the queue."
      >
        <div className={`${glassCardStatic} mx-auto max-w-md p-6`}>
          <WaitlistForm featureKey="product-roadmap" variant="dark" />
        </div>
      </DarkCTABand>
    </MarketingPageShell>
  );
}

function RoadmapGroup({
  title,
  items,
}: {
  title: string;
  items: typeof ROADMAP;
}) {
  return (
    <div>
      <p className="marketing-section-label text-white/70 mb-4">{title}</p>
      <ul className="grid sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const body = (
            <>
              <FeatureStatusBadge status={item.status} className={DARK_BADGE[item.status]} />
              <span className="min-w-0 flex-1 text-sm font-medium text-white">{item.name}</span>
              {"href" in item && item.href ? (
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-white/35 transition-colors group-hover:text-(--accent-warm)"
                  aria-hidden
                />
              ) : null}
            </>
          );

          return (
            <li key={item.name}>
              {"href" in item && item.href ? (
                <Link href={item.href} className={`${glassCard} group flex items-center gap-3 px-4 py-3.5`}>
                  {body}
                </Link>
              ) : (
                <div className={`${glassCardStatic} flex items-center gap-3 px-4 py-3.5`}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
