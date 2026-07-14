"use client";

import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

const VALUES = [
  {
    title: "Clarity over complexity",
    desc: "Every output should be inspectable, editable, and actionable, not a black box.",
  },
  {
    title: "Editorial control",
    desc: "AI assists the workflow; humans approve what goes live.",
  },
  {
    title: "Built for B2B",
    desc: "Research-backed briefs and drafts tuned for startup growth, not generic blog spam.",
  },
];

export function AboutPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="About us"
          titleLine1="A content studio"
          titleLine2="for B2B teams"
          description="goals.ac turns keyword research into SEO-driven drafts and publishes them across CMS, social, and email. You approve every piece."
          backgroundImage={HERO_IMAGES.about.hero}
          ctas={[{ label: "See the content studio", href: "/content-engine", variant: "primary" }]}
        />
      }
    >
      <MarketingSection
        variant="dark"
        bridgeTop
        titleLine1="Our"
        titleLine2="mission"
        animate={false}
      >
        <div className="max-w-3xl mx-auto space-y-6 text-white/80 leading-relaxed">
          <p>
            B2B teams shouldn&apos;t spend weeks on research, drafting, and reformatting for every
            channel. Expensive agencies and generic AI tools shouldn&apos;t be the only options.
          </p>
          <p>
            goals.ac is a content studio: competitor-aware briefs, GEO-ready drafts, and
            cross-platform publishing you review before anything goes live.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection
        badge="What we stand for"
        titleLine1="How we"
        titleLine2="build"
        bordered
        className="py-28"
      >
        <div className="grid md:grid-cols-3 gap-5">
          {VALUES.map(({ title, desc }) => (
            <div key={title} className={`${glassCard} p-6`}>
              <h3 className="font-bold mb-2 text-white">{title}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingCTA
        titleLine1="See the studio"
        titleLine2="in action"
        description="Try the article quality demo or run a free GEO audit on your site."
        primaryHref="/article-quality"
        primaryLabel="Article quality demo"
        variant="dark"
        secondaryHref="/content-engine"
        secondaryLabel="Explore content studio →"
      />
    </MarketingPageShell>
  );
}
