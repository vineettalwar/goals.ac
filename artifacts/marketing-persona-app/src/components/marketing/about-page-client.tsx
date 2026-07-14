"use client";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";

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
    desc: "Roadmaps, briefs, and drafts tuned for startup growth, not generic blog spam.",
  },
];

export function AboutPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="About us"
          titleLine1="Strategy and content"
          titleLine2="for B2B builders"
          description="goals.ac is an AI-powered growth platform for startups who want to compete with larger marketing teams, without hiring one."
          backgroundImage={HERO_IMAGES.about.hero}
          ctas={[{ label: "Try the free roadmap", href: "/", variant: "primary" }]}
        />
      }
    >
      <MarketingSection
        variant="image"
        backgroundImage={HERO_IMAGES.about.mission}
        bridgeTop
        titleLine1="Our"
        titleLine2="mission"
        animate={false}
      >
        <div className="max-w-3xl mx-auto space-y-6 text-white/80 leading-relaxed">
          <p>
            We believe every startup deserves a clear growth strategy and the content to execute
            it. Expensive agencies and generic AI tools shouldn&apos;t be the only options.
          </p>
          <p>
            goals.ac uses Gemini AI to generate highly specific, audience-targeted content, from
            12-month growth roadmaps to weekly SEO articles published automatically to your CMS.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection
        variant="paper"
        badge="What we stand for"
        titleLine1="How we"
        titleLine2="build"
        bordered
        className="py-28 bg-background"
      >
        <div className="grid md:grid-cols-3 gap-5">
          {VALUES.map(({ title, desc }) => (
            <div key={title} className="paper-card paper-card-hover rounded-2xl p-6">
              <h3 className="font-bold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingCTA
        titleLine1="See what goals.ac"
        titleLine2="can do for your market"
        description="Generate a free 12-month roadmap tailored to your industry and stage."
        primaryHref="/"
        primaryLabel="Build your roadmap"
        variant="dark"
        backgroundImage={HERO_IMAGES.about.footer}
        secondaryHref="/features"
        secondaryLabel="Explore features →"
      />
    </MarketingPageShell>
  );
}
